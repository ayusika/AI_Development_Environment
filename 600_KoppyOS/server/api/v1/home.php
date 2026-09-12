<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';
// OPTIONS is only CORS negotiation; all application operations are GET-only.
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($method, ['GET', 'OPTIONS'], true)) {
    header('Allow: GET, OPTIONS');
    respondError('Method not allowed.', 405);
}
require __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/database.php';
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: no-store');
try {
    $pdo = koppyDatabase();
    $pdo->beginTransaction();
    $rooms = $pdo->query('SELECT id, code, name, sort_order FROM home_rooms ORDER BY sort_order, id')->fetchAll();
    $devices = $pdo->query('SELECT id, room_id, code, name, category, manufacturer, model, status, role, portable, notes, sort_order FROM home_devices ORDER BY sort_order, id')->fetchAll();
    $connections = $pdo->query('SELECT id, source_device_id, target_device_id, connection_type, source_port, target_port, label, notes, sort_order FROM home_connections ORDER BY sort_order, id')->fetchAll();
    $pdo->commit();
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    respondError('自宅データを取得できませんでした。管理者に初期設定の確認を依頼してください。', 500);
}
respondSuccess(['rooms' => $rooms, 'devices' => $devices, 'connections' => $connections]);
