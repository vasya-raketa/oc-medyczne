<?php
/*
  Copy to config.php and fill in. config.php is git-ignored and must never be committed.
*/

return [
    // SMTP server of the mailbox in "from_email" (ask the rkrisk.pl hosting / mail provider).
    'smtp_host' => 'smtp.example.com',
    // 465 with 'ssl', or 587 with 'tls'. Local Mailpit: 1025 with ''.
    'smtp_port' => 465,
    // 'ssl' (SMTPS), 'tls' (STARTTLS) or '' (no encryption, local testing only).
    'smtp_secure' => 'ssl',
    // Login of the sending mailbox (usually the full address). Leave '' for no authentication.
    'smtp_user' => 'formularz@rkrisk.pl',
    'smtp_password' => 'CHANGE_ME',

    'from_email' => 'formularz@rkrisk.pl',
    'from_name' => 'Formularz – OC medyczne',
    'to_email' => 'beata.szychta@rkrisk.pl',

    // Error log and rate-limit data. Must be writable by PHP and outside the public web root;
    // the default is the folder above the site root (e.g. next to public_html).
    'storage_dir' => dirname(__DIR__, 2) . '/form-data',

    // Max successful submissions per IP within the window (seconds).
    'rate_limit' => 5,
    'rate_window' => 3600,
    // Minimum time between page load and submit (seconds).
    'min_fill_seconds' => 3,

    // Only set to true behind a trusted reverse proxy / CDN that sets X-Forwarded-For.
    'trust_proxy' => false,
];
