/*
  Contact form handler (#kontakt). POST only, JSON:
    { "success": true }  or  { "success": false, "errors": { "<field>|form": "<message>" } }
  Server errors go to console.error (Vercel logs) and never to the user.

  Rate limiting: file storage is not available on Vercel, so it is omitted.
  Honeypot + 3 s fill-time stay as the anti-spam layer. To add a limit later
  (e.g. 5 / IP / hour), use Upstash Redis or Vercel KV and check/increment
  a key like `form:${ip}` with a 3600 s TTL before sending the mail.
*/

const { Resend } = require("resend");

const GENERAL_ERROR = "Nie udało się wysłać formularza. Spróbuj ponownie lub zadzwoń do nas.";
const TOO_FAST = "Formularz został wysłany zbyt szybko. Odczekaj chwilę i spróbuj ponownie.";
const MIN_FILL_MS = 3000;
const MESSAGE_MAX = 3000;
const FROM_NAME = "Formularz – OC medyczne";
const REQUIRED_ENV = ["RESEND_API_KEY", "FROM_EMAIL", "TO_EMAIL"];

/* Field name => [label in the email, max length]. Order = order in the email. */
const FIELDS = {
  name: ["Imię", 100],
  email: ["E-mail", 254],
  phone: ["Telefon", 30],
  profession: ["Specjalizacja / zawód", 150],
};

const CONSENTS = {
  consent: [
    "Wyrażam zgodę na kontakt telefoniczny i/lub e-mailowy przez RkRisk Sp. z o.o. w celu przedstawienia informacji i oferty ubezpieczeniowej w odpowiedzi na moje zapytanie.",
    true,
  ],
};

const HTML5_EMAIL =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(status).json(body);
}

function fail(res, status = 500) {
  json(res, status, { success: false, errors: { form: GENERAL_ERROR } });
}

function logError(message) {
  console.error(`contact form: ${message}`);
}

function h(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function singleLine(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function multiLine(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n|\r/g, "\n")
    .replace(/[^\P{C}\n\t]+/gu, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const raw = forwarded || String(req.headers["x-real-ip"] || req.socket?.remoteAddress || "");
  return raw || "nieznany";
}

function warsawStamp() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")}, ${get("hour")}:${get("minute")}`;
}

function envConfig() {
  const missing = REQUIRED_ENV.filter((key) => process.env[key] === undefined);
  if (missing.length) return { missing };
  return {
    missing: [],
    apiKey: process.env.RESEND_API_KEY.trim(),
    from: process.env.FROM_EMAIL.trim(),
    to: process.env.TO_EMAIL.trim(),
  };
}

function buildMail({ values, message, consents, page, ip, date }) {
  const blue = "#2340B0";
  const ink = "#15154a";
  const muted = "#626d90";
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const heading = (text) =>
    `<h2 style="margin:28px 0 10px;${font}font-size:17px;color:${blue};">${h(text)}</h2>`;
  const row = (label, html) =>
    `<tr><td style="padding:4px 16px 4px 0;${font}font-size:15px;color:${muted};white-space:nowrap;vertical-align:top;">${h(label)}:</td><td style="padding:4px 0;${font}font-size:15px;color:${ink};">${html}</td></tr>`;
  const link = (href, text) => `<a href="${h(href)}" style="color:${blue};">${h(text)}</a>`;
  const tel = values.phone.replace(/[^0-9+]/g, "");

  let contactRows = "";
  let contactText = "";
  for (const [field, [label]] of Object.entries(FIELDS)) {
    const value = values[field];
    const display = value === "" ? "—" : value;
    let html;
    if (value === "") html = h("—");
    else if (field === "email") html = link(`mailto:${value}`, value);
    else if (field === "phone") html = link(`tel:${tel}`, value);
    else html = h(value);
    contactRows += row(label, html);
    contactText += `${label}: ${display}\n`;
  }

  const messageHtml =
    message === ""
      ? `<em style="color:${muted};">Brak wiadomości</em>`
      : h(message).replace(/\n/g, "<br>");
  const messageText = message === "" ? "Brak wiadomości" : message;

  let consentHtml = "";
  let consentText = "";
  for (const [field, [text]] of Object.entries(CONSENTS)) {
    const answer = consents[field] ? "Tak" : "Nie";
    consentHtml += `<li style="margin:0 0 6px;">${h(text)}: <strong>${answer}</strong></li>`;
    consentText += `- ${text}: ${answer}\n`;
  }

  const infoRows = row("Data i godzina", h(date)) + row("Strona", h(page)) + row("Adres IP", h(ip));
  const footer =
    "Wiadomość wygenerowana automatycznie przez formularz kontaktowy. Aby odpowiedzieć klientowi, kliknij „Odpowiedz”.";
  const title = "Masz nowe zgłoszenie z formularza na stronie OC medyczne";

  const html = `<!doctype html>
<html lang="pl">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f8ff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f8ff;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;">
<tr><td style="padding:28px 28px 24px;">
<h1 style="margin:0;${font}font-size:21px;line-height:1.3;color:${blue};">${title}</h1>
${heading("Dane kontaktowe")}
<table role="presentation" cellpadding="0" cellspacing="0">${contactRows}</table>
${heading("Wiadomość")}
<p style="margin:0;${font}font-size:15px;line-height:1.5;color:${ink};">${messageHtml}</p>
${heading("Zgody")}
<ul style="margin:0;padding-left:20px;${font}font-size:15px;line-height:1.5;color:${ink};">${consentHtml}</ul>
${heading("Informacje o zgłoszeniu")}
<table role="presentation" cellpadding="0" cellspacing="0">${infoRows}</table>
<hr style="margin:28px 0 16px;border:0;border-top:1px solid #e2e8f0;">
<p style="margin:0;${font}font-size:13px;line-height:1.5;color:${muted};">${footer}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = `${title}

Dane kontaktowe
${contactText}
Wiadomość
${messageText}

Zgody
${consentText}
Informacje o zgłoszeniu
Data i godzina: ${date}
Strona: ${page}
Adres IP: ${ip}

---
${footer}`;

  return { html, text };
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      fail(res, 405);
      return;
    }

    const config = envConfig();
    if (config.missing.length) {
      logError(`missing env: ${config.missing.join(", ")}`);
      fail(res);
      return;
    }
    if (!config.apiKey || !config.from || !config.to) {
      logError("RESEND_API_KEY, FROM_EMAIL or TO_EMAIL is empty");
      fail(res);
      return;
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const ip = clientIp(req);

    if (singleLine(body.website) !== "") {
      logError(`spam: honeypot filled (IP ${ip})`);
      json(res, 200, { success: true });
      return;
    }

    const loadedAt = Number.parseInt(String(body.ts ?? ""), 10);
    if (!Number.isFinite(loadedAt) || Date.now() - loadedAt < MIN_FILL_MS) {
      logError(`spam: missing or too short fill time (IP ${ip})`);
      json(res, 422, { success: false, errors: { form: TOO_FAST } });
      return;
    }

    const values = {};
    for (const field of Object.keys(FIELDS)) {
      values[field] = singleLine(body[field]);
    }
    const message = multiLine(body.question);
    const consents = { consent: body.consent === "on" };
    const errors = {};

    if (values.name === "") errors.name = "Podaj swoje imię.";
    else if ([...values.name].length < 2) errors.name = "Imię jest za krótkie.";

    if (values.email === "") errors.email = "Podaj adres e-mail.";
    else if (!HTML5_EMAIL.test(values.email)) errors.email = "Podaj poprawny adres e-mail.";

    const phoneDigits = values.phone.replace(/\D/g, "").length;
    if (values.phone === "") errors.phone = "Podaj numer telefonu.";
    else if (!/^\+?[0-9 ]+$/.test(values.phone) || phoneDigits < 9 || phoneDigits > 15) {
      errors.phone = "Podaj poprawny numer telefonu (min. 9 cyfr).";
    }

    for (const [field, [, max]] of Object.entries(FIELDS)) {
      if (!errors[field] && [...values[field]].length > max) {
        errors[field] = `To pole może mieć maksymalnie ${max} znaków.`;
      }
    }
    if ([...message].length > MESSAGE_MAX) {
      errors.question = `Wiadomość może mieć maksymalnie ${MESSAGE_MAX} znaków.`;
    }

    for (const [field, [, required]] of Object.entries(CONSENTS)) {
      if (required && !consents[field]) {
        errors[field] = "Zaznacz zgodę, abyśmy mogli się z Tobą skontaktować.";
      }
    }

    if (Object.keys(errors).length) {
      json(res, 422, { success: false, errors });
      return;
    }

    let page = singleLine(body.page);
    if (!isHttpUrl(page) || page.length > 500) {
      const referer = singleLine(req.headers.referer);
      page = isHttpUrl(referer) ? referer.slice(0, 500) : "—";
    }

    const date = warsawStamp();
    const { html, text } = buildMail({ values, message, consents, page, ip, date });

    const resend = new Resend(config.apiKey);
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${config.from}>`,
      to: config.to,
      replyTo: values.email,
      subject: `Nowe zgłoszenie z formularza – OC medyczne – ${values.name}`,
      html,
      text,
    });

    if (error) {
      console.error("contact form: Resend error", error);
      fail(res);
      return;
    }

    json(res, 200, { success: true });
  } catch (error) {
    logError(error?.stack || error?.message || String(error));
    fail(res);
  }
};
