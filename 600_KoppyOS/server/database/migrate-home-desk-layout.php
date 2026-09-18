<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration can only run from CLI.\n");
}

$databasePath = $argv[1] ?? '';

if ($databasePath === '' || !is_file($databasePath)) {
    fwrite(STDERR, "Database path is required and must exist.\n");
    exit(1);
}

umask(0077);

$pdo = null;

try {
    $pdo = new PDO(
        'sqlite:' . $databasePath,
        null,
        null,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA busy_timeout = 5000');

    $backupPath =
        $databasePath
        . '.backup-home-desk-layout-'
        . date('Ymd-His')
        . '-'
        . bin2hex(random_bytes(6));

    $pdo->exec(
        'VACUUM INTO ' . $pdo->quote($backupPath)
    );

    $backup = new PDO('sqlite:' . $backupPath);

    if (
        $backup
            ->query('PRAGMA quick_check')
            ->fetchColumn() !== 'ok'
    ) {
        throw new RuntimeException(
            'Backup validation failed.'
        );
    }

    $backup = null;

    $pdo->beginTransaction();

    foreach (['home_devices', 'home_connections'] as $table) {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*)
             FROM sqlite_master
             WHERE type = 'table'
               AND name = ?"
        );

        $stmt->execute([$table]);

        if ((int) $stmt->fetchColumn() !== 1) {
            throw new RuntimeException(
                'Required table not found: ' . $table
            );
        }
    }

    $findDevice = $pdo->prepare(
        'SELECT id
         FROM home_devices
         WHERE code = ?'
    );

    $deviceId = static function (
        string $code
    ) use ($findDevice): int {
        $findDevice->execute([$code]);

        $rows = $findDevice->fetchAll();

        if (count($rows) !== 1) {
            throw new RuntimeException(
                'Device must exist exactly once: ' . $code
            );
        }

        return (int) $rows[0]['id'];
    };

    /*
     * source = load-producing item
     * target = supporting item
     *
     * Confirmed:
     * Aoviho -> Claiks, tabletop
     * MacBook Air -> Aoviho
     * MacBook Pro -> Claiks, directly on tabletop
     * AX WABER -> Claiks, underside mounted
     */
    $relations = [
        [
            'aoviho-laptop-stand',
            'claiks-standing-desk',
            '天板上設置',
            'Aoviho ノートパソコンスタンドを Claiks 天板上に設置',
            150,
        ],
        [
            'macbook-air',
            'aoviho-laptop-stand',
            'スタンド上設置',
            'MacBook Air 15インチを Aoviho ノートパソコンスタンド上に設置',
            160,
        ],
        [
            'macbook-pro-2018',
            'claiks-standing-desk',
            '天板直置き',
            'MacBook Pro 13インチ 2018を Claiks 天板に直置き',
            170,
        ],
        [
            'ax-waber-ax02wb01-j',
            'claiks-standing-desk',
            '天板下取付',
            'AX WABER キーボードトレイを Claiks 天板下に取り付け',
            180,
        ],
    ];

    $findConnection = $pdo->prepare(
        'SELECT id
         FROM home_connections
         WHERE source_device_id = ?
           AND target_device_id = ?
           AND connection_type = ?'
    );

    $insertConnection = $pdo->prepare(
        'INSERT INTO home_connections(
            source_device_id,
            target_device_id,
            connection_type,
            source_port,
            target_port,
            label,
            notes,
            sort_order
        )
        VALUES (?, ?, ?, NULL, NULL, ?, ?, ?)'
    );

    $updateConnection = $pdo->prepare(
        'UPDATE home_connections
         SET label = ?,
             notes = ?,
             sort_order = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?'
    );

    foreach (
        $relations as [
            $sourceCode,
            $targetCode,
            $label,
            $notes,
            $sortOrder,
        ]
    ) {
        $sourceId = $deviceId($sourceCode);
        $targetId = $deviceId($targetCode);

        $findConnection->execute([
            $sourceId,
            $targetId,
            'supported_by',
        ]);

        $existing = $findConnection->fetchAll();

        if (count($existing) > 1) {
            throw new RuntimeException(
                'Duplicate supported_by relation: '
                . $sourceCode
                . ' -> '
                . $targetCode
            );
        }

        if (count($existing) === 1) {
            $updateConnection->execute([
                $label,
                $notes,
                $sortOrder,
                (int) $existing[0]['id'],
            ]);
        } else {
            $insertConnection->execute([
                $sourceId,
                $targetId,
                'supported_by',
                $label,
                $notes,
                $sortOrder,
            ]);
        }
    }

    foreach ($relations as [$sourceCode, $targetCode]) {
        $sourceId = $deviceId($sourceCode);
        $targetId = $deviceId($targetCode);

        $findConnection->execute([
            $sourceId,
            $targetId,
            'supported_by',
        ]);

        if (count($findConnection->fetchAll()) !== 1) {
            throw new RuntimeException(
                'Desk layout verification failed: '
                . $sourceCode
                . ' -> '
                . $targetCode
            );
        }
    }

    if (
        $pdo
            ->query(
                'PRAGMA foreign_key_check(home_connections)'
            )
            ->fetch() !== false
    ) {
        throw new RuntimeException(
            'Foreign key validation failed.'
        );
    }

    $pdo->commit();

    echo "Home desk layout migration completed.\n";
    echo "Confirmed relations: 4\n";
    echo "Backup: {$backupPath}\n";
} catch (Throwable $error) {
    if (
        $pdo instanceof PDO
        && $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

    fwrite(
        STDERR,
        "Home desk layout migration failed; no partial changes committed.\n"
    );

    fwrite(STDERR, $error->getMessage() . "\n");

    exit(1);
}
