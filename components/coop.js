{
  const STEPS = [
    {
      title: "Zostawiasz kontakt",
      text: "Dzwonisz, piszesz maila lub wypełniasz formularz — jak Ci wygodniej.",
    },
    {
      title: "Teraz nasza kolej",
      text: "Agent kontaktuje się z Tobą i przeprowadza krótką analizę potrzeb.",
    },
    {
      title: "Dobieramy najlepsze rozwiązanie",
      text: "Porównujemy oferty, negocjujemy warunki i przedstawiamy dopasowane rozwiązanie.",
    },
    {
      title: "Gotowe!",
      text: "Po akceptacji wysyłamy polisę na maila. Szybko, wygodnie i całkowicie zdalnie.",
    },
  ];

  const list = document.querySelector("[data-steps]");

  list.innerHTML = STEPS.map(
    (step, i) => `
      <li class="card step-card">
        <span class="badge-num" aria-hidden="true">${i + 1}</span>
        <h3 class="step-card-title">${step.title}</h3>
        <p class="step-card-text">${step.text}</p>
      </li>`,
  ).join("");

  HorizontalScroller(list, {
    query: "(max-width: 767.98px)",
    label: "Etapy współpracy",
  });
}
