---
# Featured tags need to have either the `list` or `grid` layout (PRO only).
layout: list

# The title of the tag's page.
title: Posts

# The name of the tag, used in a post's front matter (e.g. tags: [<slug>]).
slug: posts

# (Optional) Write a short (~150 characters) description of this featured tag.
description: >
  General blog posts

# (Optional) You can disable grouping posts by date.
# no_groups: true
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "url": "{{ site.url }}{{ page.url }}",
  "name": {{ page.title | jsonify }},
  "headline": {{ page.title | jsonify }},
  "keywords": {{ page.tags | join: ',' | jsonify }},
  "description": {{ page.excerpt | strip_newlines | strip | jsonify }},
  "articleBody": {{ page.content | strip_html | jsonify }},
  "datePublished": {{ page.date | jsonify }},
  "dateModified": {{ page.last_modified_at | default: page.date | jsonify }},
  "author": {
    "@type": "Person",
    "name": "Sam Wilcock",
    "givenName": "Sam",
    "familyName": "Wilcock",
    "email": "el18sw@leeds.ac.uk",
    "jobTitle": "Postgraduate Researcher",
    "worksFor": "University of Leeds",
    "description": "Sam Wilcock is a Postgraduate Researcher in Civil Engineering at the University of Leeds, using robots to build shell structures."
  },
  "publisher": {
    "@type": "Person",
    "name": {{ site.title | jsonify }},
    "url": "{{ site.url }}",
    "logo": {
      "@type": "ImageObject",
      "width": 32,
      "height": 32,
      "url": "{{ site.url }}assets/icons/favicon.ico"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "{{ site.url }}{{ page.url }}"
  },
  "image": {
    "@type": "ImageObject",
    "width": {{ page.img_width | default: site.img_width }},
    "height": {{ page.img_height | default: site.img_height }},
    "url": "{{ site.url }}{{ page.img_url | default: site.img_url }}"
  }
}
</script>