<?php
declare(strict_types=1);

// Keep runtime notices out of the JSON response; details belong in the server log.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

/**
 * Phoenix Secondary School contact form handler.
 *
 * Place this file in the same directory as contact.html.
 * The web server must support PHP and have its mail transport configured.
 */

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, max-age=0');

const SCHOOL_EMAIL = 'phoenixsecondaryschool@gmail.com';
const SENDER_EMAIL = 'no-reply@phoenixsecondaryschool.co.za';

function respond(int $statusCode, bool $success, string $message): void
{
    http_response_code($statusCode);
    echo json_encode(
        ['success' => $success, 'message' => $message],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'This form only accepts message submissions.');
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

// Basic per-session cooldown to discourage repeated accidental submissions.
$lastSubmission = (int)($_SESSION['phoenix_contact_last_submission'] ?? 0);
if ($lastSubmission > 0 && (time() - $lastSubmission) < 10) {
    respond(429, false, 'Please wait a few seconds before sending another message.');
}

// Honeypot: real visitors should leave this hidden field empty.
$website = trim((string)($_POST['website'] ?? ''));
if ($website !== '') {
    // Return a generic success response to avoid teaching bots which check failed.
    respond(200, true, 'Thank you for contacting Phoenix Secondary School.');
}

$name = trim((string)($_POST['name'] ?? ''));
$email = trim((string)($_POST['email'] ?? ''));
$phone = trim((string)($_POST['phone'] ?? ''));
$topic = trim((string)($_POST['topic'] ?? ''));
$message = trim((string)($_POST['message'] ?? ''));

$allowedTopics = [
    'Admissions',
    'Current learner or family',
    'Academics',
    'General enquiry',
    'Community or partnership',
];

if ($name === '' || strlen($name) > 120) {
    respond(422, false, 'Please enter your name (no more than 120 characters).');
}

if (
    $email === '' ||
    strlen($email) > 254 ||
    preg_match('/[\r\n]/', $email) ||
    filter_var($email, FILTER_VALIDATE_EMAIL) === false
) {
    respond(422, false, 'Please enter a valid email address.');
}

if (strlen($phone) > 40 || preg_match('/[\r\n]/', $phone)) {
    respond(422, false, 'Please enter a valid phone number.');
}

if (!in_array($topic, $allowedTopics, true)) {
    respond(422, false, 'Please select one of the available message topics.');
}

if ($message === '' || strlen($message) < 10 || strlen($message) > 10000) {
    respond(422, false, 'Please enter a message between 10 and 10,000 characters.');
}

// Keep message content plain text; do not interpret visitor input as HTML.
$body = implode("\n", [
    'New message submitted through the Phoenix Secondary School website.',
    '',
    'Name: ' . $name,
    'Email: ' . $email,
    'Phone: ' . ($phone !== '' ? $phone : 'Not provided'),
    'Topic: ' . $topic,
    '',
    'Message:',
    $message,
    '',
    '---',
    'Sent from the Phoenix Secondary School contact page.',
]);

$subject = 'Website enquiry: ' . $topic;
if (function_exists('mb_encode_mimeheader')) {
    $subject = mb_encode_mimeheader($subject, 'UTF-8');
}

$headers = [
    'From' => 'Phoenix Secondary School Website <' . SENDER_EMAIL . '>',
    'Reply-To' => $email,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'X-Mailer' => 'PHP/' . PHP_VERSION,
];

$headerLines = [];
foreach ($headers as $headerName => $headerValue) {
    $headerLines[] = $headerName . ': ' . $headerValue;
}

try {
    $sent = mail(
        SCHOOL_EMAIL,
        $subject,
        $body,
        implode("\r\n", $headerLines)
    );
} catch (Throwable $exception) {
    error_log('Phoenix contact form mail error: ' . $exception->getMessage());
    $sent = false;
}

if (!$sent) {
    error_log('Phoenix contact form: PHP mail() did not accept the message.');
    respond(
        500,
        false,
        'The website could not send your message right now. Please email phoenixsecondaryschool@gmail.com or call (021) 638 4577.'
    );
}

$_SESSION['phoenix_contact_last_submission'] = time();

respond(
    200,
    true,
    'Thank you for contacting Phoenix Secondary School. Your message has been submitted successfully.'
);
