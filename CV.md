---
layout: page
title: My CV
description: Curriculum vitae of Sam Wilcock, research fellow in robotic construction at the Politecnico di Milano.
---

Download CV <a href="https://samwilcock.xyz/Files/CV.pdf" id="pdfLink" target="_blank" rel="noopener">here</a>

<p>
<iframe src="https://docs.google.com/gview?url=https://samwilcock.xyz/Files/CV.pdf&embedded=true" style="width:100%; height:90vh; min-height:600px;" frameborder="0">
    <p>Unable to display PDF file. <a href="/Files/CV.pdf">Download</a> instead.</p>
</iframe>

<script>
/* Cache-buster for PDFs */
document.addEventListener("DOMContentLoaded", () => {
  const link = document.getElementById("pdfLink");
  if (link) {
    const timestamp = new Date().getTime();
    const url = new URL(link.href, window.location.origin);
    url.searchParams.set("timestamp", timestamp);
    link.href = url.toString();
  }
});
</script>