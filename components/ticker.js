/*
  Ticker: two identical groups of items (the second aria-hidden). Without JS, the CSS
  animation (ticker.css) moves the track by -50%; the .ticker-js class set in <head>
  keeps that animation from ever starting when this script runs.

  With JS, a requestAnimationFrame loop moves the track instead. On iPhone (Safari and
  Chrome) every compositor-driven version blinked or jumped; this loop doesn't:
  - The position comes from the time since start, so the speed is constant at any
    frame rate.
  - The group width is measured every frame, so the wrap is always exact, even after
    the web font swaps in.
*/
(() => {
  const SPEED = 60; // px per second
  const ticker = document.querySelector(".ticker");
  const track = ticker?.querySelector(".ticker-track");
  const groups = track?.querySelectorAll(".ticker-group");

  if (!ticker || !track || groups?.length !== 2) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Very wide screens: repeat the items until one group covers the strip.
  const cycleHTML = groups[0].innerHTML;
  const fill = () => {
    let guard = 0;
    while (groups[0].getBoundingClientRect().width < ticker.clientWidth && guard < 24) {
      groups.forEach((group) => group.insertAdjacentHTML("beforeend", cycleHTML));
      guard++;
    }
  };
  fill();
  new ResizeObserver(fill).observe(ticker);

  let start = 0;
  const step = (time) => {
    start ||= time;
    const width = groups[0].getBoundingClientRect().width;
    if (width > 0) {
      const x = (((time - start) / 1000) * SPEED) % width;
      track.style.transform = `translate3d(${-x}px, 0, 0)`;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
})();
