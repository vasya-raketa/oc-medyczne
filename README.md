# OC medyczne (RkRisk)

Landing page with a contact form. The form posts to the Vercel serverless function `api/send.js`, which sends mail through [Resend](https://resend.com) (rkrisk.pl mail is on Microsoft 365, so SMTP is not used).

## Resend setup

1. Create an account at [resend.com](https://resend.com) and add an API key under **API Keys**. Store it as `RESEND_API_KEY` (never commit it).
2. Verify the sending domain under **Domains** → **Add Domain**. For production use `rkrisk.pl` (or a subdomain such as `updates.rkrisk.pl`).
3. Copy the DNS records Resend shows (typically SPF/DKIM on a `send` host plus `resend._domainkey`) into the domain’s DNS. Do **not** change the root MX records that Microsoft 365 uses for inbound mail — Resend’s records sit on a subdomain.
4. Click **Verify DNS Records** in Resend. Verification is often done within 15 minutes (DNS can take longer).
5. Set `FROM_EMAIL` to an address on that verified domain (e.g. `formularz@rkrisk.pl`). Until the domain is verified, you can only send from `onboarding@resend.dev` to the email on your Resend account.

On Vercel, add the same three variables in **Project → Settings → Environment Variables**: `RESEND_API_KEY`, `FROM_EMAIL`, `TO_EMAIL`. Then redeploy.

## Local test (`vercel dev`)

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in real values.
3. `npx vercel dev` (uses `.env.local`; the form posts to `/api/send`).
4. Open the local URL, wait at least 3 seconds on the contact form (anti-spam), submit, and check the inbox for `TO_EMAIL`. Reply-To is the visitor’s address.
5. API errors are logged with `console.error` in the `vercel dev` terminal / Vercel function logs. The page only shows a generic Polish error.
