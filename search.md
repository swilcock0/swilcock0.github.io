---
layout: page
title: Search
---
* this list will be replaced by the toc
{:toc .large-only}
## Search for a post by
### title, topic, date (YYYY-MM-DD), description...
<div id="search-container">
<input type="text" id="search-input" placeholder="search...">
<ul id="results-container"></ul>
</div>

<!-- Script pointing to search-script.js -->
<script src="../scripts/search-script.js" type="text/javascript"></script>

<!-- Configuration -->
<script>
SimpleJekyllSearch({
  searchInput: document.getElementById('search-input'),
  resultsContainer: document.getElementById('results-container'),
  json: '../scripts/search.json'
})
</script>