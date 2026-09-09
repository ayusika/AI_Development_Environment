<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/database.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$ownerId = (int) ($koppyAuth['github_user_id'] ?? 0);
if ($ownerId <= 0) respondError('Authentication session is invalid.', 401);
$pdo = koppyDatabase();

function heavenSettingsBody(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') return [];
    $body = json_decode($raw, true);
    if (!is_array($body)) respondError('Invalid JSON body.', 400);
    return $body;
}

function validateHeavenSettings(mixed $settings): array {
    if (!is_array($settings)) respondError('Settings must be an object.', 422);
    if (strlen((string) json_encode($settings, JSON_UNESCAPED_UNICODE)) > 262144) respondError('Settings are too large.', 413);
    $result = $settings;
    $result['phrases'] = is_array($result['phrases'] ?? null) ? $result['phrases'] : [];
    $result['op_phrases'] = is_array($result['op_phrases'] ?? null) ? $result['op_phrases'] : [];
    foreach ($result['phrases'] as $phrase) {
        if (!is_array($phrase) || !is_string($phrase['id'] ?? null) || !is_string($phrase['text'] ?? null) || !is_bool($phrase['enabled'] ?? null)) respondError('Invalid phrase.', 422);
    }
    foreach ($result['op_phrases'] as $phrase) {
        if (!is_array($phrase) || !is_string($phrase['id'] ?? null) || !is_string($phrase['op_name'] ?? null) || !is_string($phrase['text'] ?? null) || !is_bool($phrase['enabled'] ?? null)) respondError('Invalid OP phrase.', 422);
    }
    $basic = is_array($result['basic'] ?? null) ? $result['basic'] : [];
    $rules = is_array($result['rules'] ?? null) ? $result['rules'] : [];
    $title = is_array($result['title'] ?? null) ? $result['title'] : [];
    $result['basic'] = [
        'signature' => (string) ($basic['signature'] ?? '❄︎こはく❄︎'),
        'avoid_same_day' => (bool) ($basic['avoid_same_day'] ?? true),
        'reroll_enabled' => (bool) ($basic['reroll_enabled'] ?? true),
        'paragraphs' => in_array((int) ($basic['paragraphs'] ?? 3), [2, 3, 4], true) ? (int) $basic['paragraphs'] : 3,
    ];
    $result['rules'] = [
        'minimum_minutes' => min(600, max(1, (int) ($rules['minimum_minutes'] ?? 60))),
        'buffer_minutes' => min(180, max(0, (int) ($rules['buffer_minutes'] ?? 15))),
    ];
    $recommended = max(1, (int) ($title['recommended'] ?? 23));
    $warning = max($recommended + 1, (int) ($title['warning'] ?? 24));
    $strong = max($warning, (int) ($title['strong'] ?? 28));
    $result['title'] = ['recommended' => $recommended, 'warning' => $warning, 'strong' => $strong];
    $templates = is_array($result['title_templates'] ?? null) ? $result['title_templates'] : [];
    foreach ($templates as $template) {
        if (!is_string($template) || preg_match('/\{(?!time\}|customer\})/', $template)) {
            respondError('Invalid title template placeholder.', 422);
        }
    }
    return $result;
}

$row = $pdo->prepare('SELECT settings_json FROM heaven_diary_settings WHERE owner_github_id = ?');
$row->execute([$ownerId]);
$current = $row->fetchColumn();

if ($method === 'GET') {
    respondSuccess(['settings' => $current ? json_decode((string) $current, true) : null]);
}
if ($method !== 'PUT' && $method !== 'POST') respondError('Method not allowed.', 405);
$body = heavenSettingsBody();
if (($body['action'] ?? '') === 'reset') {
    $delete = $pdo->prepare('DELETE FROM heaven_diary_settings WHERE owner_github_id = ?');
    $delete->execute([$ownerId]);
    respondSuccess(['settings' => null, 'reset' => true]);
}
$settings = validateHeavenSettings($body['settings'] ?? null);
$json = json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$statement = $pdo->prepare("INSERT INTO heaven_diary_settings (owner_github_id, settings_json) VALUES (?, ?) ON CONFLICT(owner_github_id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = strftime('%Y-%m-%d %H:%M', 'now', 'localtime')");
$statement->execute([$ownerId, $json]);
respondSuccess(['settings' => $settings, 'saved' => true]);
