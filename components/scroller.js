/*
  HorizontalScroller(el, { query, label, role?, indicators?, autoplay?, pinned? }) → MediaQueryList.
  While `query` matches (the .scroller layout is active), the row is focusable for
  arrow-key scrolling and gets an accessible name; outside it, both are removed.

  indicators: dots under the row (one per card). autoplay: ms between advances
  (progress fill on the active pill). Scrolls with el.scrollTo only — never
  scrollIntoView, which would jump the page.

  pinned: a media query. While it matches and motion is allowed, native swipe is off
  and `.is-pinned-scroll` is set so GSAP can drive the track. With
  prefers-reduced-motion, falls back to the normal swipe scroller.
*/
function HorizontalScroller(el, { query, label, role, indicators = false, autoplay = 0, pinned = "" }) {
  const media = window.matchMedia(query);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pinMedia = pinned ? window.matchMedia(pinned) : null;
  const hoverable = window.matchMedia("(hover: hover) and (pointer: fine)");
  const items = () => [...el.children];
  const n = () => items().length;
  const duration = Number(autoplay) || 0;

  const dots = [];
  let nav = null;
  let index = 0;
  let programmatic = 0;
  let onScreen = true;
  let io = null;
  const paused = new Set();
  const ac = new AbortController();
  const { signal } = ac;
  let scrollWait = 0;

  const reduced = () => motion.matches;
  const pinOn = () => !!pinMedia?.matches && !reduced();
  const swipeOn = () => media.matches && !pinOn();
  const autoOn = () => swipeOn() && duration > 0 && !reduced();
  const isPaused = () => paused.size > 0 || document.hidden || !onScreen;

  const gap = () => parseFloat(getComputedStyle(el).gap) || 0;

  const scrollLeftForIndex = (i) => {
    const list = items();
    const g = gap();
    let left = 0;
    for (let k = 0; k < i; k++) left += list[k].getBoundingClientRect().width + g;
    return left;
  };

  const currentIndex = () => {
    const list = items();
    if (!list.length) return 0;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0 || el.scrollLeft >= max - 2) return list.length - 1;
    let best = 0;
    let bestDist = Infinity;
    list.forEach((_, i) => {
      const dist = Math.abs(scrollLeftForIndex(i) - el.scrollLeft);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  };

  const go = (i, { smooth = true, restart = true } = {}) => {
    const list = items();
    if (!list.length) return;
    index = ((i % list.length) + list.length) % list.length;
    syncDots();
    programmatic += 1;
    el.scrollTo({
      left: scrollLeftForIndex(index),
      behavior: smooth && !reduced() ? "smooth" : "auto",
    });
    window.setTimeout(() => {
      programmatic = Math.max(0, programmatic - 1);
    }, 700);
    if (restart) startFill();
  };

  const syncDots = () => {
    dots.forEach((btn, i) => {
      if (i === index) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
  };

  const startFill = () => {
    dots.forEach((btn) => btn.classList.remove("is-playing"));
    if (!autoOn() || !dots[index]) return;
    const fill = dots[index].querySelector(".scroller-dot-fill");
    if (!fill) return;
    fill.style.animation = "none";
    void fill.offsetWidth;
    fill.style.animation = "";
    dots[index].classList.add("is-playing");
    nav?.classList.toggle("is-paused", isPaused());
  };

  const stopFill = () => {
    dots.forEach((btn) => btn.classList.remove("is-playing"));
  };

  const next = () => go(index + 1);

  const setPaused = (reason, on) => {
    if (on) paused.add(reason);
    else paused.delete(reason);
    nav?.classList.toggle("is-paused", isPaused());
    if (!autoOn()) {
      stopFill();
      return;
    }
    if (!isPaused() && dots[index] && !dots[index].classList.contains("is-playing")) {
      startFill();
    }
  };

  const onFillEnd = (event) => {
    if (!event.target.classList.contains("scroller-dot-fill")) return;
    if (!autoOn() || isPaused()) return;
    if (!event.target.closest(".scroller-dot")?.classList.contains("is-playing")) return;
    next();
  };

  const onUserSettled = () => {
    if (programmatic || !swipeOn()) return;
    index = currentIndex();
    syncDots();
    if (autoOn()) startFill();
  };

  const onScroll = () => {
    window.clearTimeout(scrollWait);
    if (programmatic) return;
    scrollWait = window.setTimeout(onUserSettled, 120);
  };

  const buildDots = () => {
    if (!indicators || nav) return;
    const count = n();
    if (!count) return;
    nav = document.createElement("div");
    nav.className = "scroller-dots";
    nav.setAttribute("role", "group");
    nav.setAttribute("aria-label", label);
    nav.style.setProperty("--scroller-duration", `${duration}ms`);
    for (let i = 0; i < count; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "scroller-dot";
      btn.setAttribute("aria-label", `Przejdź do karty ${i + 1} z ${count}`);
      btn.innerHTML = '<span class="scroller-dot-fill" aria-hidden="true"></span>';
      btn.addEventListener(
        "click",
        () => {
          go(i);
        },
        { signal },
      );
      dots.push(btn);
      nav.append(btn);
    }
    el.insertAdjacentElement("afterend", nav);
    nav.addEventListener("animationend", onFillEnd, { signal });
  };

  const apply = () => {
    const list = items();
    if (pinOn()) {
      el.classList.add("is-pinned-scroll");
      el.removeAttribute("tabindex");
      el.setAttribute("aria-label", label);
      if (role) el.setAttribute("role", role);
      list.forEach((card) => {
        if (!card.hasAttribute("tabindex")) card.tabIndex = 0;
      });
      nav?.setAttribute("hidden", "");
      stopFill();
      paused.clear();
      el.scrollLeft = 0;
      return;
    }

    el.classList.remove("is-pinned-scroll");
    list.forEach((card) => {
      if (card.tabIndex === 0 && !card.hasAttribute("data-keep-tabindex")) {
        card.removeAttribute("tabindex");
      }
    });

    if (swipeOn()) {
      el.tabIndex = 0;
      el.setAttribute("aria-label", label);
      if (role) el.setAttribute("role", role);
      nav?.removeAttribute("hidden");
      index = currentIndex();
      syncDots();
      if (autoOn()) startFill();
      else stopFill();
    } else {
      el.removeAttribute("tabindex");
      el.removeAttribute("aria-label");
      if (role) el.removeAttribute("role");
      nav?.setAttribute("hidden", "");
      stopFill();
      paused.clear();
    }
  };

  buildDots();

  media.addEventListener("change", apply, { signal });
  motion.addEventListener("change", apply, { signal });
  pinMedia?.addEventListener("change", apply, { signal });
  apply();

  el.addEventListener("scroll", onScroll, { signal, passive: true });
  el.addEventListener(
    "scrollend",
    () => {
      window.clearTimeout(scrollWait);
      onUserSettled();
    },
    { signal },
  );

  el.addEventListener(
    "pointerdown",
    () => setPaused("pointer", true),
    { signal },
  );
  const pointerUp = () => {
    setPaused("pointer", false);
    window.setTimeout(onUserSettled, 80);
  };
  el.addEventListener("pointerup", pointerUp, { signal });
  el.addEventListener("pointercancel", pointerUp, { signal });

  const hover = (on) => {
    if (hoverable.matches) setPaused("hover", on);
  };
  el.addEventListener("pointerenter", () => hover(true), { signal });
  el.addEventListener("pointerleave", () => hover(false), { signal });
  nav?.addEventListener("pointerenter", () => hover(true), { signal });
  nav?.addEventListener("pointerleave", () => hover(false), { signal });

  const focusTarget = (node) => el.contains(node) || nav?.contains(node);
  document.addEventListener(
    "focusin",
    (event) => {
      if (focusTarget(event.target) && event.target.matches(":focus-visible")) {
        setPaused("focus", true);
      }
    },
    { signal },
  );
  document.addEventListener(
    "focusout",
    (event) => {
      if (focusTarget(event.target) && !focusTarget(event.relatedTarget)) {
        setPaused("focus", false);
      }
    },
    { signal },
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      nav?.classList.toggle("is-paused", isPaused());
      if (autoOn() && !isPaused() && dots[index] && !dots[index].classList.contains("is-playing")) {
        startFill();
      }
    },
    { signal },
  );

  io = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting && entry.intersectionRatio > 0.2;
      nav?.classList.toggle("is-paused", isPaused());
      if (autoOn() && !isPaused() && dots[index] && !dots[index].classList.contains("is-playing")) {
        startFill();
      }
    },
    { threshold: [0, 0.2, 0.5, 1] },
  );
  io.observe(el);

  window.addEventListener(
    "pagehide",
    () => {
      ac.abort();
      io.disconnect();
      window.clearTimeout(scrollWait);
      stopFill();
    },
    { signal },
  );

  return media;
}
