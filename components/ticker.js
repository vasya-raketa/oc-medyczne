{
  const TICKER_SPEED = 60;
  const ticker = document.querySelector(".ticker");
  const track = ticker.querySelector(".ticker-track");
  const row = track.querySelector(".ticker-row");

  const fillTicker = () => {
    track.querySelectorAll("[data-clone]").forEach((clone) => clone.remove());
    const rowWidth = row.getBoundingClientRect().width;
    const copies = Math.ceil(ticker.clientWidth / rowWidth) + 1;

    for (let i = 0; i < copies; i += 1) {
      const clone = row.cloneNode(true);
      clone.dataset.clone = "";
      clone.setAttribute("aria-hidden", "true");
      track.append(clone);
    }

    track.style.setProperty("--ticker-shift", `${rowWidth}px`);
    track.style.setProperty("--ticker-duration", `${rowWidth / TICKER_SPEED}s`);
  };

  document.fonts.ready.then(fillTicker);
  window.addEventListener("resize", fillTicker);
}
