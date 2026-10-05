(() => {
  const SPEED = 60;
  const ticker = document.querySelector(".ticker");
  const track = ticker?.querySelector(".ticker-track");
  const source = track?.querySelector(".ticker-group");
  if (!ticker || !track || !source) return;

  const cycleHTML = source.innerHTML;
  let frame = 0;

  const fillTicker = () => {
    track.replaceChildren();

    const group = document.createElement("ul");
    group.className = "ticker-group";
    group.innerHTML = cycleHTML;
    track.append(group);

    const minWidth = ticker.clientWidth;
    let guard = 0;
    while (minWidth > 0 && group.getBoundingClientRect().width < minWidth && guard < 24) {
      group.insertAdjacentHTML("beforeend", cycleHTML);
      guard += 1;
    }

    const clone = group.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.append(clone);

    const groupWidth = group.getBoundingClientRect().width;
    if (groupWidth > 0) {
      track.style.setProperty("--ticker-duration", `${groupWidth / SPEED}s`);
    }
  };

  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fillTicker);
  };

  fillTicker();
  document.fonts.ready.then(fillTicker);
  window.addEventListener("resize", schedule);
})();
