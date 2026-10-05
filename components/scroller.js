/*
  HorizontalScroller(el, { query, label, role? }) → MediaQueryList.
  While `query` matches (the .scroller layout is active), the row is focusable for
  arrow-key scrolling and gets an accessible name; outside it, both are removed.
*/
function HorizontalScroller(el, { query, label, role }) {
  const media = window.matchMedia(query);

  const apply = () => {
    if (media.matches) {
      el.tabIndex = 0;
      el.setAttribute("aria-label", label);
      if (role) el.setAttribute("role", role);
    } else {
      el.removeAttribute("tabindex");
      el.removeAttribute("aria-label");
      if (role) el.removeAttribute("role");
    }
  };

  media.addEventListener("change", apply);
  apply();
  return media;
}
