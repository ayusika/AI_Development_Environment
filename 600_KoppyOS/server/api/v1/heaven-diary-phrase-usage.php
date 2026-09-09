<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/database.php';

$ownerId = (int) ($koppyAuth['github_user_id'] ?? 0);
if ($ownerId <= 0) respondError('Authentication session is invalid.', 401);
$pdo = koppyDatabase();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$businessDate = trim((string) ($_GET['business_date'] ?? ''));
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $businessDate)) {
    $businessDate = (new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo')))->format('Y-m-d');
}

if ($method === 'GET') {
    $statement = $pdo->prepare('SELECT phrase_id, category FROM heaven_diary_phrase_usage WHERE owner_github_id = ? AND business_date = ? ORDER BY id ASC');
    $statement->execute([$ownerId, $businessDate]);
    respondSuccess(['business_date' => $businessDate, 'usage' => $statement->fetchAll()]);
}
if ($method !== 'POST') respondError('Method not allowed.', 405);
$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);
if (!is_array($body) || !is_array($body['phrases'] ?? null)) respondError('Invalid usage payload.', 422);
$insert = $pdo->prepare('INSERT INTO heaven_diary_phrase_usage (owner_github_id, business_date, phrase_id, category) VALUES (?, ?, ?, ?)');
foreach ($body['phrases'] as $phrase) {
    if (!is_array($phrase) || !is_string($phrase['phrase_id'] ?? null) || !is_string($phrase['category'] ?? null)) continue;
    $insert->execute([$ownerId, $businessDate, $phrase['phrase_id'], $phrase['category']]);
}
respondSuccess(['saved' => true, 'business_date' => $businessDate]);
