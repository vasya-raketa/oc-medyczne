/*
  Contact form (#offer-form): validates like api/send.php (the server stays the source of
  truth), posts with fetch() and shows field errors under the fields or one general error.
*/
{
  const form = document.querySelector("#offer-form");
  const success = form.querySelector("#form-success");
  const general = form.querySelector("#form-error");
  const submit = form.querySelector('[type="submit"]');
  const submitLabel = submit.textContent;

  const SUCCESS = "Dziękujemy! Twoje zgłoszenie zostało wysłane. Skontaktujemy się z Tobą wkrótce.";
  const GENERAL_ERROR = "Nie udało się wysłać formularza. Spróbuj ponownie lub zadzwoń do nas.";
  const FIELDS = ["name", "email", "phone", "profession", "question", "consent"];
  const MAX = { name: 100, email: 254, phone: 30, profession: 150, question: 3000 };

  const value = (data, name) => String(data.get(name) || "").trim();
  const oneLine = (text) => text.replace(/\s+/g, " ");

  const validate = (data) => {
    const errors = {};
    const name = oneLine(value(data, "name"));
    const email = value(data, "email");
    const phone = oneLine(value(data, "phone"));
    const digits = phone.replace(/\D/g, "").length;

    if (!name) errors.name = "Podaj swoje imię.";
    else if (name.length < 2) errors.name = "Imię jest za krótkie.";

    if (!email) errors.email = "Podaj adres e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Podaj poprawny adres e-mail.";

    if (!phone) errors.phone = "Podaj numer telefonu.";
    else if (!/^\+?[0-9 ]+$/.test(phone) || digits < 9 || digits > 15)
      errors.phone = "Podaj poprawny numer telefonu (min. 9 cyfr).";

    for (const [field, max] of Object.entries(MAX)) {
      if (!errors[field] && value(data, field).length > max)
        errors[field] =
          field === "question"
            ? `Wiadomość może mieć maksymalnie ${max} znaków.`
            : `To pole może mieć maksymalnie ${max} znaków.`;
    }

    if (data.get("consent") !== "on") errors.consent = "Zaznacz zgodę, abyśmy mogli się z Tobą skontaktować.";

    if (!Object.keys(errors).length) {
      const loadedAt = Number(data.get("ts"));
      if (!loadedAt || Date.now() - loadedAt < 3000) {
        errors.form = "Formularz został wysłany zbyt szybko. Odczekaj chwilę i spróbuj ponownie.";
      }
    }

    return errors;
  };

  const setFieldError = (name, message) => {
    const control = form.elements[name];
    const slot = form.querySelector(`#f-${name}-error`);
    if (!control || !slot) return;
    if (message) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
    slot.textContent = message || "";
    slot.hidden = !message;
  };

  /* errors: { field: message } from validate() or the server; "form" (or unknown keys) → general error. */
  const showErrors = (errors) => {
    const known = Object.keys(errors).filter((key) => FIELDS.includes(key));
    FIELDS.forEach((field) => setFieldError(field, errors[field]));
    general.textContent = errors.form || (Object.keys(errors).length > known.length ? GENERAL_ERROR : "");
    const first = FIELDS.find((field) => errors[field]);
    if (first) form.elements[first].focus();
  };

  const setBusy = (busy) => {
    form.setAttribute("aria-busy", String(busy));
    submit.disabled = busy;
    submit.textContent = busy ? "Wysyłanie…" : submitLabel;
  };

  const stamp = () => {
    form.elements.ts.value = String(Date.now());
  };

  stamp();

  form.addEventListener("input", (event) => {
    if (FIELDS.includes(event.target.name)) setFieldError(event.target.name, "");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    success.textContent = "";
    const data = new FormData(form);
    const errors = validate(data);
    showErrors(errors);
    if (Object.keys(errors).length) return;

    data.set("now", String(Date.now()));
    data.set("page", location.href);
    setBusy(true);

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null);

      if (response.ok && body?.success === true) {
        form.reset();
        stamp();
        showErrors({});
        success.textContent = SUCCESS;
        success.focus();
        success.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        const serverErrors = body?.errors && typeof body.errors === "object" ? body.errors : {};
        showErrors(Object.keys(serverErrors).length ? serverErrors : { form: GENERAL_ERROR });
      }
    } catch {
      showErrors({ form: GENERAL_ERROR });
    } finally {
      setBusy(false);
    }
  });
}
