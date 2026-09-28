require 'uri'

# Serves local PNG/JPG images through the AVIF/WebP and half-size mobile (_l) variants that
# scripts/imageConversion.py generates in CI before the build. The browser picks the format and
# size itself, so no client-side JS is involved. Variants missing on disk (e.g. a local build
# without conversion) are left out, so the plain image always still works.
module ResponsiveImages
  MOBILE = '(max-width: 768px)'.freeze
  TYPES = { 'avif' => 'image/avif', 'webp' => 'image/webp' }.freeze
  IMG = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/i
  # Tags whose contents must not be rewritten (JS strings, existing <picture>s, etc.)
  SKIP = %r{<(script|picture|noscript|template|textarea|pre)\b.*?</\1>}mi

  module_function

  # Path on disk without extension for a local image src, or nil for external/unsupported ones.
  # Local srcs on this site are all root-absolute (/assets/...), so a leading ./ or ../ is just dropped.
  def local_base(site, src)
    return unless src =~ /\.(png|jpe?g)\z/i
    path = src.delete_prefix(site.config['url'].to_s).delete_prefix(site.baseurl.to_s)
    return if path.include?(':') # external URL, data: URI, ...
    path = URI::DEFAULT_PARSER.unescape(path.sub(%r{\A(\.{0,2}/)+}, ''))
    File.join(site.source, path).sub(/\.(png|jpe?g)\z/i, '')
  end

  def url(src, suffix, ext)
    src.sub(/\.(png|jpe?g)\z/i, "#{suffix}.#{ext}")
  end

  # Existing [suffix, ext] variants of src, e.g. [["_l", "avif"], ["", "avif"], ...]
  def variants(site, src)
    base = local_base(site, src) or return []
    exts = TYPES.keys + ['png']
    exts.product(['_l', '']).select { |ext, suffix| File.exist?("#{base}#{suffix}.#{ext}") }.map(&:reverse)
  end

  def srcset(url)
    url.gsub(' ', '%20').gsub(',', '%2C')
  end

  # [width, height] from a PNG's IHDR header, or nil
  def png_size(file)
    h = File.binread(file, 24)
    h.byteslice(16, 8).unpack('NN') if h && h.bytesize == 24 && h.byteslice(12, 4) == 'IHDR'
  rescue SystemCallError
    nil
  end

  # Wraps an <img> tag in a <picture> offering the modern/mobile variants. With a sizes attribute
  # the browser picks full or _l by width; otherwise _l is used below MOBILE. eager: nil (lazy),
  # :high (above-the-fold LCP candidate) or true.
  def picture(site, img, eager: nil)
    src = img[/\ssrc\s*=\s*["']([^"']*)["']/i, 1] or return img
    found = variants(site, src)
    return img if found.empty?

    # CI converts JPGs to PNG and deletes the original, so point the fallback at the PNG
    img = img.sub(src, url(src, '', 'png')) if src !~ /\.png\z/i && found.include?(['', 'png'])
    size = png_size("#{local_base(site, src)}.png")
    sizes = img[/\ssizes\s*=\s*"([^"]*)"/i, 1] if size
    sources = if sizes
      (TYPES.keys + ['png']).filter_map do |ext|
        set = [['_l', size[0] / 2], ['', size[0]]].select { |s, _| found.include?([s, ext]) }
        next if set.empty? || (ext == 'png' && set.size < 2) # plain png alone is just the <img>
        type = %( type="#{TYPES[ext]}") if TYPES[ext]
        %(<source#{type} srcset="#{set.map { |s, w| "#{srcset(url(src, s, ext))} #{w}w" }.join(', ')}" sizes="#{sizes}">)
      end
    else
      found.filter_map do |suffix, ext|
        next if suffix == '' && ext == 'png' # that's the <img> itself
        type = %( type="#{TYPES[ext]}") if TYPES[ext]
        media = %( media="#{MOBILE}") if suffix == '_l'
        %(<source#{type}#{media} srcset="#{srcset(url(src, suffix, ext))}">)
      end
    end
    return img if sources.empty?

    attrs = []
    attrs << %(loading="#{eager ? 'eager' : 'lazy'}") unless img =~ /\sloading\s*=/i
    attrs << 'fetchpriority="high"' if eager == :high && img !~ /\sfetchpriority\s*=/i
    # Reserve the image's box before it loads (no CLS) without pinning its size like width/height would
    if size && img !~ /\s(width|height)\s*=/i
      ratio = "aspect-ratio: #{size[0]} / #{size[1]};"
      if img =~ /\sstyle\s*=\s*"/i
        img = img.sub(/(\sstyle\s*=\s*")/i, "\\1#{ratio} ")
      else
        attrs << %(style="#{ratio}")
      end
    end
    img = img.sub(/\A<img\b/i, "<img #{attrs.join(' ')}") unless attrs.empty?
    "<picture>#{sources.join}#{img}</picture>"
  end

  # CSS background-image declarations for src (suffix "_l" for the mobile variant),
  # with a plain url() first for browsers without image-set() type() support
  def background(site, src, suffix)
    found = variants(site, src).select { |s, _| s == suffix }
    return %(background-image: url("#{src}");) if found.none? { |_, ext| TYPES[ext] }

    set = found.map { |s, ext| %(url("#{url(src, s, ext)}") type("#{TYPES[ext] || 'image/png'}")) }
    fallback = found.include?([suffix, 'png']) ? url(src, suffix, 'png') : src
    %(background-image: url("#{fallback}"); background-image: image-set(#{set.join(', ')});)
  end
end

module ResponsiveImageFilters
  # {{ path | responsive_img }} -> <picture> markup (for places the post-render pass can't reach, e.g. JSON)
  def responsive_img(src, alt = '')
    return '' if src.to_s.empty?

    ResponsiveImages.picture(@context.registers[:site], %(<img src="#{src}" alt="#{alt}">))
  end

  # {{ path | responsive_bg }} / {{ path | responsive_bg: '_l' }} -> background-image declarations
  def responsive_bg(src, suffix = '')
    ResponsiveImages.background(@context.registers[:site], src.to_s, suffix)
  end
end
Liquid::Template.register_filter(ResponsiveImageFilters)

Jekyll::Hooks.register [:pages, :documents], :post_render do |doc|
  next unless doc.output_ext == '.html'

  # The first two images are likely above the fold, so they load eagerly and the first is prioritised
  # (pages that already preload a high-priority hero, like the home page, keep that as the LCP instead)
  hero = doc.output.include?('fetchpriority="high"')
  n = 0
  doc.output = doc.output.gsub(Regexp.union(ResponsiveImages::SKIP, ResponsiveImages::IMG)) do |m|
    next m unless m =~ /\A<img/i

    out = ResponsiveImages.picture(doc.site, m, eager: n.zero? && !hero ? :high : n < 2)
    n += 1 unless out.equal?(m)
    out
  end
end
