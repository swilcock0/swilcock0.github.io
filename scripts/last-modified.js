/* Thanks ryanfb */
function setModifiedDate() {
  if (document.getElementById('last-modified')) {
    fetch("https://api.github.com/repos/{{ site.github.owner_name }}/{{ site.github.repository_name }}/commits?path={{ page.path }}")
      .then((response) => {
        return response.json();
      })
      .then((commits) => {
        var modified = commits[0]['commit']['committer']['date'];
        var date_ = modified.slice(0, 10);
        var time_ = modified.slice(11, 16);

        if (date_ != '{{ page.date | date: "%Y-%m-%d" }}') {
          document.getElementById('last-modified').textContent = "Last Modified: " + date_ + "@ " + time_;
        }
      });
  }
};