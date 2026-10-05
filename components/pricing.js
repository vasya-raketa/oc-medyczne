{
  const CONTACT = { label: "Zapytaj agenta", href: "#kontakt" };
  const CARD_TEXT = "Zapytaj agenta RkRisk o składkę dopasowaną do Twojej specjalizacji";

  const BASE_ROWS = [
    { job: "Lekarze i dentyści", sum: "75 000 € / zdarzenie", total: "350 000 € łącznie", premium: "od 175 zł" },
    { job: "Pielęgniarki i położne", sum: "30 000 € / zdarzenie", total: "150 000 € łącznie", premium: "70 zł" },
    { job: "Diagności laboratoryjni", sum: "30 000 € / zdarzenie", total: "150 000 € łącznie", premium: "70 zł" },
    { job: "Fizjoterapeuci", sum: "30 000 € / zdarzenie", total: "150 000 € łącznie", premium: "120 zł" },
  ];

  const EXTRA_ROWS = [
    { item: "Wyższa suma ochrony", limit: "dla lekarzy nawet <strong>do 3 000 000 zł</strong>" },
    { item: "Ochrona od błędów zawodowych", limit: "przypadkowe jak i wynikające z rażącego niedbalstwa" },
    {
      item: "Ochrona za działania zespołu",
      limit: "pracownicy, podwykonawcy, praktykanci, stażyści, wolontariusze i rezydenci",
    },
    { item: "OC gabinetu i wynajmowanego mienia", limit: "<strong>do 100 000 zł</strong>" },
    { item: "Odtworzenie dokumentacji", limit: "<strong>do 100 000 zł</strong>" },
    { item: "Naruszenie praw pacjenta", limit: "<strong>do 100 000 zł</strong>" },
    { item: "Choroby zakaźne", limit: "W przypadku zarażenia pacjenta np. HIV lub WZW" },
    {
      item: "Ochrona prawna",
      badge: "Polecamy",
      limit:
        "Pokrycie prawników i kosztów prowadzenia sporów sądowych <strong>do 100 000 / 200 000 / 500 000 zł</strong> w zależności od pakietu",
    },
    {
      item: "Pakiet: medycyna estetyczna i chirurgia plastyczna",
      limit:
        "Rozszerzenie ryzyka dla lekarzy i dentystów wykonujących zabiegi. Sumy <strong>do 100 000 / 200 000</strong> w zależności od wariantu",
    },
  ];

  const GROUPS = [
    {
      id: "baza",
      badge: "Baza",
      variant: "blue",
      subtitle: "Czyli obowiązkowa Ochrona Cywilna",
      table: {
        className: "pricing-table-base",
        rows: BASE_ROWS,
        columns: [
          { header: "Przykładowe zawody", label: "Zawód", cell: (r) => r.job },
          {
            header: "Suma gwarancyjna",
            className: "is-sum",
            valueClass: () => "pricing-sum",
            cell: (r) => `<strong>${r.sum}</strong> <span>${r.total}</span>`,
          },
          { header: "Składka roczna", className: "is-price", cell: (r) => r.premium },
        ],
      },
      card: { badge: "Obowiązkowe OC", prefix: "od", price: "70 zł", suffix: "rocznie" },
    },
    {
      id: "rozszerzenie",
      badge: "Rozszerzenie",
      variant: "purple",
      subtitle: "Czyli nadwyżkowa Ochrona Cywilna",
      table: {
        className: "pricing-table-extras",
        rows: EXTRA_ROWS,
        columns: [
          {
            header: "Co możesz dodać?",
            valueClass: (r) => (r.badge ? "pricing-tagged" : ""),
            cell: (r) =>
              r.badge
                ? `<span>${r.item}</span> <span class="badge badge-solid">${r.badge}</span>`
                : r.item,
          },
          { header: "Zakres / limit", cell: (r) => r.limit },
        ],
      },
      card: { badge: "OC Nadwyżkowe", prefix: "od", price: "158 zł", suffix: "rocznie" },
    },
  ];

  document.querySelector("[data-pricing]").innerHTML = GROUPS.map((group) => {
    const titleId = `pricing-${group.id}-title`;
    const badgeVariant = group.variant === "purple" ? " badge-purple" : "";
    return `
      <div class="pricing-group">
        <div class="pricing-heading">
          <span class="badge badge-solid${badgeVariant}">${group.badge}</span>
          <h3 class="pricing-subtitle" id="${titleId}">${group.subtitle}</h3>
        </div>
        <div class="pricing-row">
          ${PricingTable({ ...group.table, labelledBy: titleId })}
          ${PriceCard({ variant: group.variant, text: CARD_TEXT, cta: CONTACT, ...group.card })}
        </div>
      </div>`;
  }).join("");
}
