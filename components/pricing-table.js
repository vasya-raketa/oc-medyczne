/*
  PricingTable({ className, labelledBy, columns, rows }) → HTML string.
  columns: [{ header, label?, className?, valueClass?(row), cell(row) }]; the first column renders as a row header.
  Explicit ARIA roles keep table semantics when CSS turns the table into stacked blocks.
*/
const keepAmountsTogether = (html) => html.replace(/(\d) (?=\d|€|zł)/g, "$1&nbsp;");

function PricingTable({ className = "", labelledBy, columns, rows }) {
  const head = columns
    .map(
      (col) =>
        `<th scope="col" role="columnheader" class="${col.className ?? ""}">${col.header}</th>`,
    )
    .join("");

  const body = rows
    .map((row) => {
      const cells = columns.map((col, i) => {
        const tag = i === 0 ? "th" : "td";
        const role = i === 0 ? 'scope="row" role="rowheader"' : 'role="cell"';
        const valueClass = ["pricing-value", col.valueClass?.(row)].filter(Boolean).join(" ");
        return `<${tag} ${role} class="${col.className ?? ""}" data-label="${col.label ?? col.header}"><span class="${valueClass}">${keepAmountsTogether(col.cell(row))}</span></${tag}>`;
      });
      return `<tr role="row">${cells.join("")}</tr>`;
    })
    .join("");

  return `
    <div class="pricing-table ${className}">
      <table role="table" aria-labelledby="${labelledBy}">
        <thead role="rowgroup"><tr role="row">${head}</tr></thead>
        <tbody role="rowgroup">${body}</tbody>
      </table>
    </div>`;
}
