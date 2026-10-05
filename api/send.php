<?php
/*
  Contact form handler (#kontakt). POST only, responds with JSON:
    { "success": true }  or  { "success": false, "errors": { "<field>|form": "<message>" } }
  Server errors are logged to <storage_dir>/form-errors.log and never shown to the user.
*/

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailerException;
use PHPMailer\PHPMailer\PHPMailer;

require __DIR__ . '/lib/PHPMailer/Exception.php';
require __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require __DIR__ . '/lib/PHPMailer/SMTP.php';

ini_set('display_errors', '0');
date_default_timezone_set('Europe/Warsaw');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const GENERAL_ERROR = 'Nie udało się wysłać formularza. Spróbuj ponownie lub zadzwoń do nas.';

/* Field name => [label in the email, max length]. Order = order in the email. */
const FIELDS = [
    'name' => ['Imię i nazwisko', 100],
    'email' => ['E-mail', 254],
    'phone' => ['Telefon', 30],
    'profession' => ['Specjalizacja / zawód', 150],
];
const MESSAGE_MAX = 3000;

/* Checkbox name => [full text as shown on the page, required]. */
const CONSENTS = [
    'consent' => [
        'Wyrażam zgodę na kontakt telefoniczny i/lub e-mailowy przez RkRisk Sp. z o.o. w celu przedstawienia informacji i oferty ubezpieczeniowej w odpowiedzi na moje zapytanie.',
        true,
    ],
];

$config = [];

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status = 500): void
{
    respond($status, ['success' => false, 'errors' => ['form' => GENERAL_ERROR]]);
}

function storage_dir(): ?string
{
    global $config;
    $dir = (string) ($config['storage_dir'] ?? '');
    if ($dir === '') {
        return null;
    }
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return null;
    }
    return is_writable($dir) ? $dir : null;
}

function log_error(string $message): void
{
    $line = sprintf("[%s] %s\n", date('c'), $message);
    $dir = storage_dir();
    if ($dir === null || @file_put_contents($dir . '/form-errors.log', $line, FILE_APPEND | LOCK_EX) === false) {
        error_log('contact form: ' . $message);
    }
}

set_exception_handler(static function (Throwable $e): void {
    log_error(get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    fail();
});

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
}

/* One-line value: no line breaks or control characters (safe for headers), spaces collapsed. */
function single_line(mixed $value): string
{
    if (!is_string($value) || !mb_check_encoding($value, 'UTF-8')) {
        return '';
    }
    $value = preg_replace('/[\p{Cc}\p{Cf}\x{2028}\x{2029}]+/u', ' ', $value) ?? '';
    return trim(preg_replace('/\s+/u', ' ', $value) ?? '');
}

/* Multi-line value: keeps line breaks, drops other control characters. */
function multi_line(mixed $value): string
{
    if (!is_string($value) || !mb_check_encoding($value, 'UTF-8')) {
        return '';
    }
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[^\P{C}\n\t]+/u', '', $value) ?? '';
    return trim(preg_replace("/\n{3,}/", "\n\n", $value) ?? '');
}

function client_ip(): string
{
    global $config;
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    if (!empty($config['trust_proxy']) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $first = trim(explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
        if (filter_var($first, FILTER_VALIDATE_IP)) {
            $ip = $first;
        }
    }
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : 'nieznany';
}

/*
  File-based limit: timestamps of successful submissions per IP (hashed) within the window.
  $record = false only checks, true records one submission. Returns false when the limit is reached.
*/
function rate_limit(string $ip, bool $record): bool
{
    global $config;
    $dir = storage_dir();
    if ($dir === null) {
        log_error('rate limit: storage_dir is missing or not writable');
        return true;
    }
    try {
        return rate_limit_file($dir . '/rate-limit.json', hash('sha256', $ip), $record);
    } catch (Throwable $e) {
        log_error('rate limit: ' . $e->getMessage());
        return true;
    }
}

function rate_limit_file(string $path, string $key, bool $record): bool
{
    global $config;
    $limit = (int) ($config['rate_limit'] ?? 5);
    $window = (int) ($config['rate_window'] ?? 3600);
    $now = time();

    $handle = fopen($path, 'c+');
    flock($handle, LOCK_EX);
    $data = json_decode(stream_get_contents($handle) ?: '{}', true);
    $data = is_array($data) ? $data : [];

    foreach ($data as $k => $times) {
        $data[$k] = array_values(array_filter((array) $times, static fn($t) => is_int($t) && $t > $now - $window));
        if (!$data[$k]) {
            unset($data[$k]);
        }
    }

    $allowed = count($data[$key] ?? []) < $limit;
    if ($allowed && $record) {
        $data[$key][] = $now;
    }

    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($data));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    return $allowed;
}

/* ---- Request ---- */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    fail(405);
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    error_log('contact form: api/config.php is missing');
    fail();
}
$config = require $configFile;

$ip = client_ip();

// Honeypot: humans never see this field. Pretend success so bots don't retry.
if (single_line($_POST['website'] ?? '') !== '') {
    log_error("spam: honeypot filled (IP $ip)");
    respond(200, ['success' => true]);
}

// Minimum fill time, measured in the browser between page load (ts) and submit (now).
$loadedAt = filter_var($_POST['ts'] ?? null, FILTER_VALIDATE_INT);
$sentAt = filter_var($_POST['now'] ?? null, FILTER_VALIDATE_INT);
$minMs = (int) ($config['min_fill_seconds'] ?? 3) * 1000;
if ($loadedAt === false || $sentAt === false || $sentAt - $loadedAt < $minMs) {
    log_error("spam: missing or too short fill time (IP $ip)");
    respond(422, ['success' => false, 'errors' => ['form' => 'Formularz został wysłany zbyt szybko. Odczekaj chwilę i spróbuj ponownie.']]);
}

if (!rate_limit($ip, false)) {
    respond(429, ['success' => false, 'errors' => ['form' => 'Wysłano już kilka zgłoszeń z tego adresu. Spróbuj ponownie za godzinę lub zadzwoń do nas.']]);
}

/* ---- Validation ---- */

$values = [];
foreach (FIELDS as $field => [, $max]) {
    $values[$field] = single_line($_POST[$field] ?? '');
}
$message = multi_line($_POST['question'] ?? '');
$consents = [];
foreach (CONSENTS as $field => [, $required]) {
    $consents[$field] = ($_POST[$field] ?? '') === 'on';
}

$errors = [];

if ($values['name'] === '') {
    $errors['name'] = 'Podaj swoje imię.';
} elseif (mb_strlen($values['name']) < 2) {
    $errors['name'] = 'Imię jest za krótkie.';
}

if ($values['email'] === '') {
    $errors['email'] = 'Podaj adres e-mail.';
} elseif (!PHPMailer::validateAddress($values['email'], 'html5')) {
    $errors['email'] = 'Podaj poprawny adres e-mail.';
}

$phoneDigits = strlen(preg_replace('/\D/', '', $values['phone']) ?? '');
if ($values['phone'] === '') {
    $errors['phone'] = 'Podaj numer telefonu.';
} elseif (!preg_match('/^\+?[0-9 ]+$/', $values['phone']) || $phoneDigits < 9 || $phoneDigits > 15) {
    $errors['phone'] = 'Podaj poprawny numer telefonu (min. 9 cyfr).';
}

foreach (FIELDS as $field => [, $max]) {
    if (!isset($errors[$field]) && mb_strlen($values[$field]) > $max) {
        $errors[$field] = "To pole może mieć maksymalnie $max znaków.";
    }
}
if (mb_strlen($message) > MESSAGE_MAX) {
    $errors['question'] = 'Wiadomość może mieć maksymalnie ' . MESSAGE_MAX . ' znaków.';
}

foreach (CONSENTS as $field => [, $required]) {
    if ($required && !$consents[$field]) {
        $errors[$field] = 'Zaznacz zgodę, abyśmy mogli się z Tobą skontaktować.';
    }
}

if ($errors) {
    respond(422, ['success' => false, 'errors' => $errors]);
}

/* ---- Email ---- */

$page = single_line($_POST['page'] ?? '');
if (!filter_var($page, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $page) || strlen($page) > 500) {
    $referer = single_line($_SERVER['HTTP_REFERER'] ?? '');
    $page = filter_var($referer, FILTER_VALIDATE_URL) && preg_match('#^https?://#i', $referer) ? mb_substr($referer, 0, 500) : '—';
}

$date = (new DateTimeImmutable('now', new DateTimeZone('Europe/Warsaw')))->format('d.m.Y, H:i');
$tel = preg_replace('/[^0-9+]/', '', $values['phone']) ?? '';

$blue = '#2340B0';
$ink = '#15154a';
$muted = '#626d90';
$font = "font-family:Arial,Helvetica,sans-serif;";
$heading = static fn(string $text): string => "<h2 style=\"margin:28px 0 10px;{$font}font-size:17px;color:$blue;\">" . h($text) . '</h2>';
$row = static fn(string $label, string $html): string => "<tr><td style=\"padding:4px 16px 4px 0;{$font}font-size:15px;color:$muted;white-space:nowrap;vertical-align:top;\">" . h($label) . ":</td><td style=\"padding:4px 0;{$font}font-size:15px;color:$ink;\">$html</td></tr>";
$link = static fn(string $href, string $text): string => '<a href="' . h($href) . "\" style=\"color:$blue;\">" . h($text) . '</a>';

$contactRows = '';
$contactText = '';
foreach (FIELDS as $field => [$label]) {
    $value = $values[$field];
    $display = $value === '' ? '—' : $value;
    $html = match (true) {
        $value === '' => h('—'),
        $field === 'email' => $link('mailto:' . $value, $value),
        $field === 'phone' => $link('tel:' . $tel, $value),
        default => h($value),
    };
    $contactRows .= $row($label, $html);
    $contactText .= "$label: $display\n";
}

$messageHtml = $message === '' ? '<em style="color:' . $muted . ';">Brak wiadomości</em>' : nl2br(h($message), false);
$messageText = $message === '' ? 'Brak wiadomości' : $message;

$consentHtml = '';
$consentText = '';
foreach (CONSENTS as $field => [$text]) {
    $answer = $consents[$field] ? 'Tak' : 'Nie';
    $consentHtml .= "<li style=\"margin:0 0 6px;\">" . h($text) . ': <strong>' . $answer . '</strong></li>';
    $consentText .= "- $text: $answer\n";
}

$hContact = $heading('Dane kontaktowe');
$hMessage = $heading('Wiadomość');
$hConsents = $heading('Zgody');
$hInfo = $heading('Informacje o zgłoszeniu');
$infoRows = $row('Data i godzina', h($date)) . $row('Strona', h($page)) . $row('Adres IP', h($ip));

$footer = 'Wiadomość wygenerowana automatycznie przez formularz kontaktowy. Aby odpowiedzieć klientowi, kliknij „Odpowiedz”.';
$title = 'Masz nowe zgłoszenie z formularza na stronie OC medyczne';

$html = <<<HTML
<!doctype html>
<html lang="pl">
<head><meta charset="utf-8"><title>{$title}</title></head>
<body style="margin:0;padding:0;background:#f5f8ff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f8ff;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;">
<tr><td style="padding:28px 28px 24px;">
<h1 style="margin:0;{$font}font-size:21px;line-height:1.3;color:{$blue};">{$title}</h1>
{$hContact}
<table role="presentation" cellpadding="0" cellspacing="0">{$contactRows}</table>
{$hMessage}
<p style="margin:0;{$font}font-size:15px;line-height:1.5;color:{$ink};">{$messageHtml}</p>
{$hConsents}
<ul style="margin:0;padding-left:20px;{$font}font-size:15px;line-height:1.5;color:{$ink};">{$consentHtml}</ul>
{$hInfo}
<table role="presentation" cellpadding="0" cellspacing="0">{$infoRows}</table>
<hr style="margin:28px 0 16px;border:0;border-top:1px solid #e2e8f0;">
<p style="margin:0;{$font}font-size:13px;line-height:1.5;color:{$muted};">{$footer}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
HTML;

$text = <<<TEXT
{$title}

Dane kontaktowe
{$contactText}
Wiadomość
{$messageText}

Zgody
{$consentText}
Informacje o zgłoszeniu
Data i godzina: {$date}
Strona: {$page}
Adres IP: {$ip}

---
{$footer}
TEXT;

$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host = (string) $config['smtp_host'];
    $mail->Port = (int) $config['smtp_port'];
    $mail->SMTPSecure = match ((string) ($config['smtp_secure'] ?? '')) {
        'ssl' => PHPMailer::ENCRYPTION_SMTPS,
        'tls' => PHPMailer::ENCRYPTION_STARTTLS,
        default => '',
    };
    $mail->SMTPAutoTLS = $mail->SMTPSecure !== '';
    $mail->SMTPAuth = (string) ($config['smtp_user'] ?? '') !== '';
    $mail->Username = (string) ($config['smtp_user'] ?? '');
    $mail->Password = (string) ($config['smtp_password'] ?? '');
    $mail->Timeout = 20;

    $mail->CharSet = PHPMailer::CHARSET_UTF8;
    $mail->Encoding = PHPMailer::ENCODING_BASE64;
    $mail->setFrom((string) $config['from_email'], (string) ($config['from_name'] ?? 'Formularz – OC medyczne'));
    $mail->addAddress((string) $config['to_email']);
    $mail->addReplyTo($values['email'], $values['name']);

    $mail->Subject = 'Nowe zgłoszenie z formularza – OC medyczne – ' . $values['name'];
    $mail->isHTML(true);
    $mail->Body = $html;
    $mail->AltBody = $text;

    $mail->send();
} catch (MailerException $e) {
    log_error('mail: ' . $mail->ErrorInfo);
    fail();
}

rate_limit($ip, true);
respond(200, ['success' => true]);
