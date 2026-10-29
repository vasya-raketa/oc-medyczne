/*
  Cookie consent for Google Analytics. gtag.js is loaded only after "Akceptuję";
  until then (and after "Odrzucam") no analytics cookies are set. The choice is kept
  in localStorage; any [data-cookie-settings] button reopens the banner.
*/
(() => {
  const GA_ID = "G-SH56F3CSJT";
  const KEY = "cookie-consent";

  const read = () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  };

  const save = (value) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
  };

  let loaded = false;
  const loadAnalytics = () => {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      dataLayer.push(arguments);
    };
    gtag("js", new Date());
    gtag("config", GA_ID);
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.append(script);
  };

  /* Withdrawn consent: drop the _ga cookies on this domain and its parents. */
  const clearAnalyticsCookies = () => {
    const parts = location.hostname.split(".");
    const domains = [""];
    for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join(".")}`);
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0].trim();
      if (!name.startsWith("_ga")) continue;
      for (const domain of domains) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
      }
    }
  };

  const banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.setAttribute("role", "region");
  banner.setAttribute("aria-label", "Zgoda na pliki cookies");
  banner.hidden = true;
  banner.innerHTML = `
    <p class="cookie-text">
      Używamy plików cookies Google Analytics, aby tworzyć statystyki odwiedzin strony.
      Zostaną zapisane tylko za Twoją zgodą, którą możesz w każdej chwili wycofać.
      Szczegóły w <a href="polityka-prywatnosci.html">Polityce prywatności</a>.
    </p>
    <div class="cookie-actions">
      <button class="btn cookie-btn" type="button" data-consent="denied">Odrzucam</button>
      <button class="btn cookie-btn" type="button" data-consent="granted">Akceptuję</button>
    </div>
  `;

  const open = () => {
    banner.hidden = false;
  };

  banner.addEventListener("click", (event) => {
    const button = event.target.closest("[data-consent]");
    if (!button) return;
    const choice = button.dataset.consent;
    const wasGranted = read() === "granted";
    save(choice);
    banner.hidden = true;
    if (choice === "granted") {
      loadAnalytics();
    } else if (wasGranted || loaded) {
      clearAnalyticsCookies();
      /* gtag.js is already running on this page; a reload stops it. */
      location.reload();
    }
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-cookie-settings]")) open();
  });

  document.body.append(banner);

  const choice = read();
  if (choice === "granted") loadAnalytics();
  else if (choice !== "denied") open();
})();
