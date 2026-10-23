<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

/* ── Sadece POST kabul et ── */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false]);
    exit;
}

/* ── Honeypot kontrolü ── */
if (!empty($_POST['_honey'])) {
    http_response_code(400);
    echo json_encode(['success' => false]);
    exit;
}

/* ── Girdi doğrulama ── */
$name    = trim(htmlspecialchars($_POST['name']    ?? '', ENT_QUOTES, 'UTF-8'));
$email   = trim(filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL) ?? '');
$message = trim(htmlspecialchars($_POST['message'] ?? '', ENT_QUOTES, 'UTF-8'));

if (!$name || !$email || !$message || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'invalid_input']);
    exit;
}

/* ── Gizli ayarlar (config.php git'te değil, sunucuya elle yüklenir) ── */
$configFile = __DIR__ . '/config.php';
$cfg = is_file($configFile) ? (array) require $configFile : [];
$MAIL_TO = $cfg['mail_to'] ?? 'erdalbayhan@gmail.com';

/* ── PHPMailer (Composer'sız, doğrudan include) ── */
require __DIR__ . '/phpmailer/Exception.php';
require __DIR__ . '/phpmailer/PHPMailer.php';
require __DIR__ . '/phpmailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;

/* ── Gönderim yolları: sırayla denenir, ilk başarılı olan kazanır ── */
$transports = [];

if (!empty($cfg['gmail_user']) && !empty($cfg['gmail_pass'])) {
    $transports['gmail'] = function (PHPMailer $m) use ($cfg) {
        $m->isSMTP();
        $m->Host       = 'smtp.gmail.com';
        $m->SMTPAuth   = true;
        $m->Username   = $cfg['gmail_user'];
        $m->Password   = str_replace(' ', '', $cfg['gmail_pass']);
        $m->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $m->Port       = 587;
        $m->setFrom($cfg['gmail_user'], 'erdalbayhan.com');
    };
}

$transports['mail'] = function (PHPMailer $m) use ($cfg) {
    $m->isMail();
    $m->setFrom($cfg['from_local'] ?? 'noreply@erdalbayhan.com', 'erdalbayhan.com');
};

/* ── Hata kaydı: logs/ klasörü .htaccess ile dışarıya kapalı ── */
function logContactError(string $transport, string $error): void
{
    $dir = __DIR__ . '/logs';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    $line = sprintf("[%s] %s: %s\n", date('c'), $transport, $error);
    @file_put_contents($dir . '/contact-errors.log', $line, FILE_APPEND | LOCK_EX);
    error_log('Contact form [erdalbayhan.com] ' . trim($line));
}

foreach ($transports as $label => $configure) {
    $mail = new PHPMailer(true);

    try {
        $configure($mail);
        $mail->Timeout = 15;
        $mail->CharSet = 'UTF-8';
        $mail->addAddress($MAIL_TO, 'Erdal Bayhan');
        $mail->addReplyTo($email, $name);

        $mail->isHTML(true);
        $mail->Subject = "Yeni Mesaj — erdalbayhan.com | {$name}";

        $mail->Body = "
        <div style='font-family:\"Plus Jakarta Sans\",Arial,sans-serif;max-width:540px;margin:0 auto;
                     background:#0D0F1A;color:#F0F0F5;padding:2rem;border-radius:16px;'>
          <div style='margin-bottom:1.5rem;'>
            <span style='font-size:1.5rem;font-weight:800;color:#FF6B2B;'>EB.</span>
          </div>
          <h2 style='font-size:1.25rem;font-weight:700;margin-bottom:1.25rem;color:#FF6B2B;'>
            Yeni İletişim Formu Mesajı
          </h2>
          <table style='width:100%;border-collapse:collapse;'>
            <tr>
              <td style='padding:0.6rem 0;color:#8B8FA8;font-size:0.875rem;width:90px;'>Ad</td>
              <td style='padding:0.6rem 0;font-weight:600;'>" . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "</td>
            </tr>
            <tr>
              <td style='padding:0.6rem 0;color:#8B8FA8;font-size:0.875rem;'>E-posta</td>
              <td style='padding:0.6rem 0;'>
                <a href='mailto:" . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . "'
                   style='color:#FFB347;'>" . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . "</a>
              </td>
            </tr>
          </table>
          <hr style='border:none;border-top:1px solid rgba(255,107,43,0.2);margin:1rem 0;' />
          <p style='color:#8B8FA8;font-size:0.875rem;margin-bottom:0.5rem;'>Mesaj</p>
          <p style='line-height:1.7;white-space:pre-line;'>" . nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8')) . "</p>
          <hr style='border:none;border-top:1px solid rgba(255,107,43,0.1);margin:1.5rem 0 1rem;' />
          <p style='font-size:0.75rem;color:#8B8FA8;'>erdalbayhan.com iletişim formu</p>
        </div>";

        $mail->AltBody = "Ad: {$name}\nE-posta: {$email}\n\nMesaj:\n{$message}";

        $mail->send();
        echo json_encode(['success' => true]);
        exit;

    } catch (\Throwable $e) {
        logContactError($label, $mail->ErrorInfo ?: $e->getMessage());
    }
}

http_response_code(500);
echo json_encode(['success' => false]);
