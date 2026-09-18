<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration can only run from CLI.\n");
}

$databasePath = $argv[1] ?? '';

if ($databasePath === '' || !is_file($databasePath)) {
    fwrite(
        STDERR,
        "Database path is required and must exist.\n"
    );
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
        . '.backup-home-desk-pekaro-'
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

    foreach (
        ['home_devices', 'home_connections']
        as $table
    ) {
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
                'Device must exist exactly once: '
                . $code
            );
        }

        return (int) $rows[0]['id'];
    };

    $sourceId = $deviceId(
        'pekaro-keyboard-tray'
    );

    $targetId = $deviceId(
        'claiks-standing-desk'
    );

    $findConnection = $pdo->prepare(
        'SELECT id
         FROM home_connections
         WHERE source_device_id = ?
           AND target_device_id = ?
           AND connection_type = ?'
    );

    $findConnection->execute([
        $sourceId,
        $targetId,
        'supported_by',
    ]);

    $existing = $findConnection->fetchAll();

    if (count($existing) > 1) {
        throw new RuntimeException(
            'Duplicate supported_by relation detected.'
        );
    }

    if (count($existing) === 1) {
        $update = $pdo->prepare(
            'UPDATE home_connections
             SET label = ?,
                 notes = ?,
                 sort_order = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );

        $update->execute([
            '天板下取付',
            'Pekaro クランプ式キーボードトレイを Claiks 天板下に取り付け',
            190,
            (int) $existing[0]['id'],
        ]);
    } else {
        $insert = $pdo->prepare(
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

        $insert->execute([
            $sourceId,
            $targetId,
            'supported_by',
            '天板下取付',
            'Pekaro クランプ式キーボードトレイを Claiks 天板下に取り付け',
            190,
        ]);
    }

    $findConnection->execute([
        $sourceId,
        $targetId,
        'supported_by',
    ]);

    if (
        count(
            $findConnection->fetchAll()
        ) !== 1
    ) {
        throw new RuntimeException(
            'Pekaro support verification failed.'
        );
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

    echo "Home Pekaro desk support migration completed.\n";
    echo "Confirmed relations: 1\n";
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
        "Home Pekaro desk support migration failed; no partial changes committed.\n"
    );

    fwrite(
        STDERR,
        $error->getMessage() . "\n"
    );

    exit(1);
}
