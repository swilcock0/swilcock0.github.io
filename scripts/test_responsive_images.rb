# Self-check for _plugins/responsive_images.rb: bundle exec ruby scripts/test_responsive_images.rb
require 'jekyll'
require 'tmpdir'
require_relative '../_plugins/responsive_images'

Dir.mktmpdir do |dir|
  site = Struct.new(:source, :baseurl, :config).new(dir, '', { 'url' => 'https://www.samwilcock.xyz' })
  FileUtils.mkdir_p("#{dir}/assets")
  %w[a.png a.avif a_l.avif a.webp a_l.webp a_l.png b.png c.png c.avif].each { |f| FileUtils.touch("#{dir}/assets/#{f}") }
  # 1000x500 PNG header so a.png has real dimensions
  File.binwrite("#{dir}/assets/a.png", "\x89PNG\r\n\x1a\n\0\0\0\rIHDR".b + [1000, 500].pack('NN'))
  pic = ->(img, **kw) { ResponsiveImages.picture(site, img, **kw) }

  out = pic.(%(<img src="assets/a.png" alt="x > y">))
  assert = ->(ok, msg) { abort("FAIL: #{msg}\n#{out}") unless ok }
  assert.(out.start_with?('<picture><source type="image/avif" media="(max-width: 768px)" srcset="assets/a_l.avif">'), 'mobile avif first')
  assert.(out.include?('<source media="(max-width: 768px)" srcset="assets/a_l.png">'), 'mobile png fallback')
  assert.(out.end_with?('<img loading="lazy" style="aspect-ratio: 1000 / 500;" src="assets/a.png" alt="x > y"></picture>'), 'img kept last, lazy + ratio added')

  out = pic.(%(<img src="assets/a.png" style="x" sizes="200px">), eager: :high)
  assert.(out.start_with?('<picture><source type="image/avif" srcset="assets/a_l.avif 500w, assets/a.avif 1000w" sizes="200px">'), 'sizes -> w srcset')
  assert.(out.include?('<source srcset="assets/a_l.png 500w, assets/a.png 1000w" sizes="200px">'), 'sizes png source')
  assert.(out.include?('<img loading="eager" fetchpriority="high" src="assets/a.png" style="aspect-ratio: 1000 / 500; x"'), 'eager, ratio merged into style')

  out = pic.(%(<img src="https://www.samwilcock.xyz/assets/c.jpg" loading="eager">))
  assert.(out == '<picture><source type="image/avif" srcset="https://www.samwilcock.xyz/assets/c.avif"><img src="https://www.samwilcock.xyz/assets/c.png" loading="eager"></picture>', 'jpg -> converted png, loading kept')

  [%(<img src="assets/b.png">), %(<img src="https://example.com/a.png">), %(<img src="assets/missing.png">)].each do |img|
    out = pic.(img)
    assert.(out == img, "left alone: #{img}")
  end

  out = ResponsiveImages.background(site, '/assets/a.png', '_l')
  assert.(out == 'background-image: url("/assets/a_l.png"); background-image: image-set(url("/assets/a_l.avif") type("image/avif"), url("/assets/a_l.webp") type("image/webp"), url("/assets/a_l.png") type("image/png"));', 'background')

  out = pic.(%(<img src="assets/a.png" width="10">), eager: true)
  assert.(out.include?('<img loading="eager" src="assets/a.png" width="10">'), 'no ratio with explicit size')

  html = %(<script>x = '<img src="assets/a.png">'</script><img src="/assets/a.png">)
  out = html.gsub(Regexp.union(ResponsiveImages::SKIP, ResponsiveImages::IMG)) { |m| m =~ /\A<img/i ? pic.(m) : m }
  assert.(out.start_with?(%(<script>x = '<img src="assets/a.png">'</script><picture>)), 'script contents untouched')
end
puts 'responsive_images OK'
