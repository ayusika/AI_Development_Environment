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
        . '.backup-home-koppy-base-server-'
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
        ['home_rooms', 'home_devices']
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

    $findRoom = $pdo->prepare(
        'SELECT id
         FROM home_rooms
         WHERE code = ?'
    );

    $findRoom->execute(['gaming']);
    $gamingRooms = $findRoom->fetchAll();

    if (count($gamingRooms) !== 1) {
        throw new RuntimeException(
            'Gaming room must exist exactly once.'
        );
    }

    $gamingRoomId = (int) $gamingRooms[0]['id'];

    $findDevice = $pdo->prepare(
        'SELECT id, sort_order
         FROM home_devices
         WHERE code = ?'
    );

    $findDevice->execute(['macbook-pro-2018']);
    $proRows = $findDevice->fetchAll();

    if (count($proRows) !== 1) {
        throw new RuntimeException(
            'MacBook Pro 2018 must exist exactly once.'
        );
    }

    $proId = (int) $proRows[0]['id'];
    $ssdSortOrder = (int) $proRows[0]['sort_order'] + 1;

    $updatePro = $pdo->prepare(
        'UPDATE home_devices
         SET role = ?,
             notes = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?'
    );

    $updatePro->execute([
        'Koppy Base Server',
        '2.7GHz Quad-Core Intel Core i7 / 16GB LPDDR3 / Intel Iris Plus Graphics 655 / 約500GB / コンピュータ名 Koppy-Worker-Pro。Koppy Base Server用途',
        $proId,
    ]);

    $ssdCode =
        'sandisk-extreme-portable-ssd-v2-500gb';

    $findDevice->execute([$ssdCode]);
    $ssdRows = $findDevice->fetchAll();

    if (count($ssdRows) > 1) {
        throw new RuntimeException(
            'Duplicate SanDisk SSD devices detected.'
        );
    }

    if (count($ssdRows) === 0) {
        $shiftSortOrder = $pdo->prepare(
            'UPDATE home_devices
             SET sort_order = sort_order + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE room_id = ?
               AND sort_order >= ?'
        );

        $shiftSortOrder->execute([
            $gamingRoomId,
            $ssdSortOrder,
        ]);
    }

    $ssdNotes =
        'SDSSDE61-500G-GH25 / 500GB / USB 3.2 Gen 2 / 読出最大1050MB/s / '
        . 'Koppy Base Server用StorageとしてProへ接続予定 / '
        . '物理接続未確認のためhome_connections未登録';

    if (count($ssdRows) === 1) {
        $updateSsd = $pdo->prepare(
            'UPDATE home_devices
             SET room_id = ?,
                 name = ?,
                 category = ?,
                 manufacturer = ?,
                 model = ?,
                 status = ?,
                 role = ?,
                 portable = ?,
                 notes = ?,
                 sort_order = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );

        $updateSsd->execute([
            $gamingRoomId,
            'SanDisk Extreme Portable SSD V2',
            '外付けSSD',
            'SanDisk',
            'SDSSDE61-500G-GH25',
            '保有',
            'Koppy Base Server Storage',
            0,
            $ssdNotes,
            $ssdSortOrder,
            (int) $ssdRows[0]['id'],
        ]);
    } else {
        $insertSsd = $pdo->prepare(
            'INSERT INTO home_devices(
                room_id,
                code,
                name,
                category,
                manufacturer,
                model,
                status,
                role,
                portable,
                notes,
                sort_order
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $insertSsd->execute([
            $gamingRoomId,
            $ssdCode,
            'SanDisk Extreme Portable SSD V2',
            '外付けSSD',
            'SanDisk',
            'SDSSDE61-500G-GH25',
            '保有',
            'Koppy Base Server Storage',
            0,
            $ssdNotes,
            $ssdSortOrder,
        ]);
    }

    $findDevice->execute([$ssdCode]);

    if (count($findDevice->fetchAll()) !== 1) {
        throw new RuntimeException(
            'SanDisk SSD verification failed.'
        );
    }

    if (
        $pdo
            ->query(
                'PRAGMA foreign_key_check(home_devices)'
            )
            ->fetch() !== false
    ) {
        throw new RuntimeException(
            'Foreign key validation failed.'
        );
    }

    $pdo->commit();

    echo "Koppy Base Server home migration completed.\n";
    echo "Updated MacBook Pro role: Koppy Base Server\n";
    echo "Registered SanDisk Extreme Portable SSD V2 500GB\n";
    echo "Physical SSD connection remains unregistered until confirmed.\n";
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
        "Koppy Base Server home migration failed; no partial changes committed.\n"
    );

    fwrite(
        STDERR,
        $error->getMessage() . "\n"
    );

    exit(1);
}
