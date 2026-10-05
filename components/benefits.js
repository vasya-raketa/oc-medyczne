{
  const BENEFITS = [
    {
      id: "finanse",
      number: 1,
      title: "Bezpieczeństwo finansowe",
      icon: "assets/benefit-icon-finance.svg",
      iconSize: 196,
      paragraphs: [
        "Polisa obejmuje roszczenia, których nie ma w standardowym, obowiązkowym OC.",
        "W przypadku roszczenia koszty opłaca ubezpieczyciel, dzięki czemu nie musisz pokrywać ich z własnej kieszeni.",
      ],
    },
    {
      id: "gabinet",
      number: 2,
      title: "Gabinet i dokumenty",
      icon: "assets/benefit-icon-office.svg",
      iconSize: 192,
      paragraphs: [
        "Ochrona obejmuje wszystkie szkody związane z lokalem, sprzętem, wynajmowanym mieniem i dokumentacją medyczną <strong>do 100 000 zł.</strong>",
        "<strong>Dzięki temu nie musisz wykupywać osobnego ubezpieczenia dla swojego gabinetu.</strong>",
      ],
    },
    {
      id: "wsparcie",
      number: 3,
      title: "Codzienne wsparcie",
      icon: "assets/benefit-icon-support.svg",
      iconSize: 180,
      paragraphs: [
        "Polisa pomaga, gdy podczas pracy dojdzie do pomyłki, zaniedbania lub szkody.",
        "Zakres obejmuje też m.in. naruszenie praw pacjenta, choroby zakaźne oraz szkody związane z użyciem RTG, laserów i aparatury medycznej.",
      ],
    },
    {
      id: "zespol",
      number: 4,
      title: "Ochrona zespołu",
      icon: "assets/benefit-icon-team.svg",
      iconSize: 192,
      paragraphs: [
        "Polisa obejmuje szkody wyrządzone przez Twoich pracowników, praktykantów, rezydentów i podwykonawców.",
      ],
    },
    {
      id: "spokoj",
      number: 5,
      title: "Wewnętrzny spokój",
      icon: "assets/benefit-icon-calm.svg",
      iconSize: 196,
      paragraphs: [
        "Dobre ubezpieczenie to większy spokój w codziennej pracy, bo wiesz, że nic cię nie zaskoczy.",
      ],
    },
  ];

  const ICON_BASE_SIZE = 196;
  const root = document.querySelector("[data-benefits]");
  const tablist = root.querySelector(".benefits-tabs");
  const deck = root.querySelector(".benefits-cards");
  const pad = (n) => String(n).padStart(2, "0");
  const total = pad(BENEFITS.length);

  tablist.innerHTML = BENEFITS.map(
    (b) => `
      <button class="benefits-tab" type="button" role="tab" id="benefit-tab-${b.id}"
        aria-controls="benefit-panel-${b.id}" aria-selected="false" tabindex="-1">
        <img class="benefits-tab-wave" src="assets/benefit-wave.svg" alt="" />
        <span class="badge-num benefits-tab-num">${b.number}</span>
        <span class="benefits-tab-label">${b.title}</span>
      </button>`,
  ).join("");

  deck.innerHTML = BENEFITS.map(
    (b) => `
      <article class="card benefit-card" id="benefit-panel-${b.id}" aria-labelledby="benefit-tab-${b.id}">
        <img class="benefit-card-wave" src="assets/detail-wave.svg" alt="" />
        <div class="benefit-card-head">
          <div class="benefit-card-titles">
            <p class="badge badge-soft">${pad(b.number)} / ${total}</p>
            <h3 class="benefit-card-title">${b.title}</h3>
          </div>
          <img class="benefit-card-icon" src="${b.icon}" alt=""
            style="--icon-scale: ${b.iconSize / ICON_BASE_SIZE}" />
        </div>
        <div class="benefit-card-copy">
          ${b.paragraphs.map((p) => `<p>${p}</p>`).join("")}
        </div>
      </article>`,
  ).join("");

  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const cards = [...deck.querySelectorAll(".benefit-card")];

  const activate = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      cards[i].toggleAttribute("data-active", on);
    });
    if (focus) tabs[index].focus();
  };

  const scroller = HorizontalScroller(deck, {
    query: "(max-width: 767.98px)",
    label: "Korzyści nadwyżkowego OC",
    role: "region",
    indicators: true,
    autoplay: 5000,
  });

  const applyMode = () => {
    const swipe = scroller.matches;
    cards.forEach((card) => {
      card.setAttribute("role", swipe ? "group" : "tabpanel");
      if (swipe) card.removeAttribute("tabindex");
      else card.tabIndex = 0;
    });
  };

  tablist.addEventListener("click", (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) activate(tabs.indexOf(tab));
  });

  tablist.addEventListener("keydown", (event) => {
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    const last = tabs.length - 1;
    const next = {
      ArrowDown: current === last ? 0 : current + 1,
      ArrowRight: current === last ? 0 : current + 1,
      ArrowUp: current === 0 ? last : current - 1,
      ArrowLeft: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    activate(next, true);
  });

  scroller.addEventListener("change", applyMode);
  applyMode();
  activate(0);
}
