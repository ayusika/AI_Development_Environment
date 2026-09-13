<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

function finish(int $code, bool $ok, string $message): void {
    http_response_code($code);
    echo json_encode(['success' => $ok, 'message' => $message],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function value(string $key): string {
    $value = $_POST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}
function h(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function length_of(string $value): int {
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}
function mime_text(string $value): string {
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    finish(405, false, '送信方法が正しくありません。');
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $host = parse_url($origin, PHP_URL_HOST);
    if (!is_string($host) || !in_array(strtolower($host),
        ['miki-piano.com', 'www.miki-piano.com'], true)) {
        finish(403, false, 'このページからは送信できません。');
    }
}

$configFile = dirname(__DIR__, 2) . '/miki-contact-config.php';
if (!is_file($configFile)) {
    error_log('Miki Piano contact config not found.');
    finish(503, false, '現在メールを送信できません。時間をおいて、もう一度お試しください。');
}
$config = require $configFile;
if (!is_array($config)
    || !filter_var($config['recipient'] ?? '', FILTER_VALIDATE_EMAIL)
    || !filter_var($config['from_email'] ?? '', FILTER_VALIDATE_EMAIL)) {
    error_log('Miki Piano contact config invalid.');
    finish(503, false, '現在メールを送信できません。時間をおいて、もう一度お試しください。');
}

if (value('website') !== '') {
    finish(200, true, '送信が完了しました。');
}

$rateFile = sys_get_temp_dir() . '/miki-contact-'
    . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
$lastTime = is_file($rateFile) ? (int) @file_get_contents($rateFile) : 0;
if ($lastTime && time() - $lastTime < 20) {
    finish(429, false, '続けて送信する場合は、少し時間をおいてからお試しください。');
}

$name = value('お名前');
$email = value('メールアドレス');
$purpose = value('ご希望の内容');
$message = value('ご質問・ご相談');
$agreement = value('確認事項');
$purposes = [
    '無料体験レッスンを申し込みたい',
    'レッスンについて相談したい',
    'その他のお問い合わせ'
];

if ($name === '' || length_of($name) > 100
    || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || !in_array($purpose, $purposes, true)
    || $agreement !== '入力内容と連絡先を確認しました'
    || length_of($message) > 3000) {
    finish(422, false, '入力内容をご確認ください。');
}
@file_put_contents($rateFile, (string) time(), LOCK_EX);

$to = (string) $config['recipient'];
$from = (string) $config['from_email'];
$fromName = (string) ($config['from_name'] ?? '美輝 Miki Piano');
$date = (new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo')))
    ->format('Y年n月j日 H:i');

$safeName = h($name);
$safeEmail = h($email);
$safePurpose = h($purpose);
$safeMessage = $message === '' ? '記入なし' : nl2br(h($message), false);
$reply = h('mailto:' . $email . '?subject='
    . rawurlencode('【美輝 Miki Piano】お問い合わせありがとうございます'));

$rows = '
<tr><th style="padding:12px;background:#f5f9f6;text-align:left;">お名前</th><td style="padding:12px;">'
    . $safeName . ' 様</td></tr>
<tr><th style="padding:12px;background:#f5f9f6;text-align:left;">メールアドレス</th><td style="padding:12px;"><a href="mailto:'
    . $safeEmail . '" style="color:#557d6b;">' . $safeEmail . '</a></td></tr>
<tr><th style="padding:12px;background:#f5f9f6;text-align:left;">ご希望</th><td style="padding:12px;">'
    . $safePurpose . '</td></tr>
<tr><th style="padding:12px;background:#f5f9f6;text-align:left;">ご質問・ご相談</th><td style="padding:12px;line-height:1.8;">'
    . $safeMessage . '</td></tr>
<tr><th style="padding:12px;background:#f5f9f6;text-align:left;">送信日時</th><td style="padding:12px;">'
    . h($date) . '</td></tr>';

$top = '<div style="padding:28px 24px;background:#6f927f;color:#fff;text-align:center;">
<div style="font-family:serif;font-size:24px;letter-spacing:.08em;">美輝 Miki Piano</div>
<div style="margin-top:6px;font-size:12px;letter-spacing:.12em;">ONLINE PIANO LESSON</div></div>';
$table = '<table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #dfe9e3;color:#34443d;font-size:14px;">'
    . $rows . '</table>';
$open = '<!doctype html><html lang="ja"><body style="margin:0;background:#f4f1e9;font-family:-apple-system,BlinkMacSystemFont,\'Hiragino Kaku Gothic ProN\',\'Yu Gothic\',sans-serif;"><div style="padding:32px 12px;"><div style="max-width:640px;margin:auto;background:#fff;border:1px solid #dfe9e3;border-radius:18px;overflow:hidden;">';
$close = '<div style="padding:18px;background:#f5f9f6;color:#718078;text-align:center;font-size:12px;">音楽を楽しむ気持ちを、あなたのペースで。</div></div></div></body></html>';

$admin = $open . $top . '<div style="padding:30px 24px;">
<h1 style="margin:0;color:#344b40;font-size:21px;">新しいお問い合わせが届きました</h1>
<p style="color:#637269;line-height:1.9;">' . $safeName . '様からのお問い合わせです。</p>
<div style="margin:20px 0;padding:18px;border-radius:12px;background:#fff9ea;text-align:center;">
<div style="margin-bottom:12px;color:#74643d;">返信先：' . $safeEmail . '</div>
<a href="' . $reply . '" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#6f927f;color:#fff;text-decoration:none;font-weight:bold;">この方へ返信する</a>
<div style="margin-top:10px;color:#8a7a55;font-size:11px;">アドレスは長押ししてコピーできます</div></div>'
    . $table
    . '<p style="color:#718078;font-size:12px;line-height:1.8;">このメールにそのまま返信しても、お問い合わせくださった方へ返信できます。</p></div>'
    . $close;

$customer = $open . $top . '<div style="padding:30px 24px;color:#536259;line-height:2;">
<h1 style="margin:0;color:#344b40;font-size:21px;">お問い合わせありがとうございます</h1>
<p>' . $safeName . '様</p>
<p>このたびは、美輝 Miki Pianoへお問い合わせいただき、ありがとうございます。</p>
<p>以下の内容で受け付けました。内容を確認後、メールにてご連絡いたしますので、しばらくお待ちください。</p>'
    . $table
    . '<p style="color:#718078;font-size:12px;">このメールはお問い合わせフォームから自動送信されています。お心当たりがない場合は破棄してください。</p></div>'
    . $close;

$baseHeaders = [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ' . mime_text($fromName) . ' <' . $from . '>'
];
$adminHeaders = array_merge($baseHeaders, ['Reply-To: ' . $email]);
$customerHeaders = array_merge($baseHeaders, ['Reply-To: ' . $to]);

$adminSent = mail($to,
    mime_text('【美輝 Miki Piano】新しいお問い合わせが届きました'),
    $admin, implode("\r\n", $adminHeaders));
if (!$adminSent) {
    error_log('Miki Piano admin mail failed.');
    finish(500, false, '送信できませんでした。時間をおいて、もう一度お試しください。');
}

if (!mail($email,
    mime_text('【美輝 Miki Piano】お問い合わせありがとうございます'),
    $customer, implode("\r\n", $customerHeaders))) {
    error_log('Miki Piano customer auto response failed.');
}

finish(200, true, '送信が完了しました。内容を確認後、メールでご連絡いたします。');
