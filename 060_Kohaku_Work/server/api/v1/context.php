<?php

header(
    'Content-Type: application/json; charset=utf-8'
);
header('Cache-Control: no-store');

require_once __DIR__ . '/../../../../600_KoppyOS/server/auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/../../core/database.php';

$method =
    strtoupper(
        $_SERVER['REQUEST_METHOD']
        ?? 'GET'
    );

if ($method !== 'GET') {
    http_response_code(405);

    echo json_encode(
        [
            'success' => false,
            'error' => 'Method not allowed.',
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );

    exit;
}

try {
    $pdo = koppyDatabase();

    $integrity =
        (string) $pdo
            ->query(
                'PRAGMA integrity_check'
            )
            ->fetchColumn();

    if ($integrity !== 'ok') {
        throw new RuntimeException(
            'Production database integrity check failed.'
        );
    }

    $visitCount =
        (int) $pdo
            ->query(
                'SELECT COUNT(*) FROM visits'
            )
            ->fetchColumn();

    $storeCount =
        (int) $pdo
            ->query(
                'SELECT COUNT(*) FROM stores'
            )
            ->fetchColumn();

    $databasePath =
        koppyDatabasePath();

    $snapshotUpdatedAt =
        is_file($databasePath)
            ? gmdate(
                'c',
                (int) filemtime($databasePath)
            )
            : null;

    echo json_encode(
        [
            'success' => true,
            'database_context' =>
                koppyDatabaseContext(),
            'production' => true,
            'verification' => false,
            'integrity' => $integrity,
            'visit_count' => $visitCount,
            'store_count' => $storeCount,
            'snapshot_updated_at' =>
                $snapshotUpdatedAt,
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );

} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode(
        [
            'success' => false,
            'database_context' =>
                'production',
            'production' => true,
            'verification' => false,
            'error' => $error->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );
}
