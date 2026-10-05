/* PriceCard({ variant: "blue" | "purple", badge, prefix, price, suffix, text, cta: { label, href } }) → HTML string. */
function PriceCard({ variant = "blue", badge, prefix, price, suffix, text, cta }) {
  return `
    <div class="price-card price-card-${variant}">
      <picture>
        <source media="(min-width: 480px) and (max-width: 767.98px)" srcset="assets/ellipse-480.svg" />
        <img class="price-card-glow" src="assets/ellipse.svg" alt="" />
      </picture>
      <div class="price-card-top">
        <p class="badge badge-outline">${badge}</p>
        <p class="price-figure"><span>${prefix}</span><strong>${price}</strong><span>${suffix}</span></p>
      </div>
      <div class="price-card-bottom">
        <p class="price-card-text">${text}</p>
        <a class="btn btn-block btn-light" href="${cta.href}">${cta.label}</a>
      </div>
    </div>`;
}
