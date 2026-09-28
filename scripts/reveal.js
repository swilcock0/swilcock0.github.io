// Fades images in as they scroll into view. Format/size selection is done by
// <picture> markup at build time (_plugins/responsive_images.rb). Only elements below the fold
// are hidden, and only by this script, so nothing stays invisible if it never runs.
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.replace('fade-pending', 'fade-in-visible');
    observer.unobserve(entry.target);
  }), { threshold: 0.2 });

  // Read every element's position first, then write classes/observe in a second pass, so a
  // style write on one element never forces a layout recalc before the next element's read.
  const els = document.querySelectorAll('img:not([data-nofade])');
  const belowFold = Array.from(els).filter(el => el.getBoundingClientRect().top >= window.innerHeight);
  belowFold.forEach(el => {
    el.classList.add('fade-pending');
    observer.observe(el);
  });
});
