# Liquid filter for llms-full.txt: {{ post.path | llms_markdown }} gives a post's Markdown source
# cleaned into plain Markdown for language models. Jekyll only exposes the rendered HTML to
# templates, so the source is read from disk. Includes that carry content (videos, links) become
# Markdown links, other Liquid and Kramdown attribute lists are dropped, HTML becomes Markdown or
# plain text, root-relative links become absolute, and headings move down two levels to sit
# under the post's own "### title".
module LlmsMarkdown
  ATTR = /(\w[\w-]*)=("[^"]*"|'[^']*'|\S+)/

  def llms_markdown(path)
    site = @context.registers[:site]
    url = site.config['url'].to_s
    text = File.read(File.join(site.source, path), encoding: 'utf-8')
    text = text.sub(/\A---\s*\n.*?\n---\s*\n/m, '')

    text = text.gsub(/\{%-?\s*include\s+(\S+)(.*?)-?%\}/m) do
      file, args = Regexp.last_match(1), Regexp.last_match(2).scan(ATTR).to_h { |k, v| [k, v.delete(%q("'))] }
      case file
      when 'youtube.html' then "[Video: #{args['title'] || args['name']}](https://www.youtube.com/watch?v=#{args['id']})"
      when 'video-jsonld.html' then "[Video: #{args['name']}](#{args['src']})"
      when 'email-link.html' then args['text'].to_s
      else ''
      end
    end
    text = text.gsub(/\{%.*?%\}|\{\{.*?\}\}/m, '')
    text = text.gsub(/^\{:[^}\n]*\}\s*$\n?/, '').gsub(/\{:[^}\n]*\}/, '')

    text = text.gsub(%r{<(script|style|iframe|video|noscript)\b.*?</\1>}mi, '')
    text = text.gsub(/<img\b[^>]*>/i) do |tag|
      attrs = tag.scan(ATTR).to_h { |k, v| [k.downcase, v.delete(%q("'))] }
      attrs['src'] ? "![#{attrs['alt']}](#{attrs['src']})" : ''
    end
    text = text.gsub(%r{<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)</a>}mi) { "[#{Regexp.last_match(2).strip}](#{Regexp.last_match(1)})" }
    text = text.gsub(/<[^>\n]+>/, '')

    text = text.gsub(/\]\(\//, "](#{url}/")
    text = text.gsub(/^(#+)(?=\s)/) { "#{Regexp.last_match(1)}##" }
    text.gsub(/[ \t]+$/, '').gsub(/\n{3,}/, "\n\n").strip
  end
end

Liquid::Template.register_filter(LlmsMarkdown)
