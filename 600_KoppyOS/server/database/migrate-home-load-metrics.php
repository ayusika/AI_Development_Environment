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
    $pdo = new PDO('sqlite:' . $databasePath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA busy_timeout = 5000');

    $backupPath =
        $databasePath
        . '.backup-home-load-metrics-'
        . date('Ymd-His')
        . '-'
        . bin2hex(random_bytes(6));

    $pdo->exec('VACUUM INTO ' . $pdo->quote($backupPath));

    $backup = new PDO('sqlite:' . $backupPath);

    if ($backup->query('PRAGMA quick_check')->fetchColumn() !== 'ok') {
        throw new RuntimeException('Backup validation failed.');
    }

    $backup = null;

    $pdo->beginTransaction();

    $tableExists = (int) $pdo->query(
        "SELECT COUNT(*)
         FROM sqlite_master
         WHERE type = 'table'
           AND name = 'home_devices'"
    )->fetchColumn();

    if ($tableExists !== 1) {
        throw new RuntimeException(
            'home_devices table does not exist. Run migrate-home.php first.'
        );
    }

    $columns = array_column(
        $pdo->query('PRAGMA table_info(home_devices)')->fetchAll(),
        'name'
    );

    if (!in_array('weight_kg', $columns, true)) {
        $pdo->exec(
            'ALTER TABLE home_devices
             ADD COLUMN weight_kg REAL'
        );
    }

    if (!in_array('weight_is_estimate', $columns, true)) {
        $pdo->exec(
            'ALTER TABLE home_devices
             ADD COLUMN weight_is_estimate INTEGER NOT NULL DEFAULT 0'
        );
    }

    if (!in_array('load_capacity_kg', $columns, true)) {
        $pdo->exec(
            'ALTER TABLE home_devices
             ADD COLUMN load_capacity_kg REAL'
        );
    }

    $gamingRoomId = $pdo->query(
        "SELECT id
         FROM home_rooms
         WHERE code = 'gaming'"
    )->fetchColumn();

    if ($gamingRoomId === false) {
        throw new RuntimeException('gaming room not found.');
    }

    /*
     * Existing devices:
     * weight_is_estimate
     *   0 = confirmed / manufacturer-level value
     *   1 = reference / approximate value
     */
    $existingMetrics = [
        ['aoc-cu34g4z',        6.370, 0],
        ['iris-dg-daw2718s-a', 4.100, 1],
        ['oppo-pad-air',        0.440, 0],
        ['macbook-air',         1.510, 0],
        ['macbook-pro-2018',    1.370, 0],
        ['anker-prime-dock',    1.086, 0],
        ['actionring-vsd',      0.340, 1],
    ];

    $findDevice = $pdo->prepare(
        'SELECT COUNT(*) FROM home_devices WHERE code = ?'
    );

    $updateMetric = $pdo->prepare(
        'UPDATE home_devices
         SET weight_kg = ?,
             weight_is_estimate = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE code = ?'
    );

    foreach ($existingMetrics as [$code, $weightKg, $isEstimate]) {
        $findDevice->execute([$code]);

        if ((int) $findDevice->fetchColumn() !== 1) {
            throw new RuntimeException(
                'Existing device not found exactly once: ' . $code
            );
        }

        $updateMetric->execute([
            $weightKg,
            $isEstimate,
            $code,
        ]);
    }

    /*
     * Newly registered desk equipment.
     */
    $devices = [
        [
            'claiks-standing-desk',
            'Claiks 電動昇降デスク',
            '家具',
            'Claiks',
            null,
            '現役',
            '幅120cm×奥行60cm / ホワイト / 電動昇降 / メモリー機能',
            null,
            0,
            70.0,
            40,
        ],
        [
            'accurtek-ac19-12b',
            'ACCURTEK モニターアーム',
            'モニターアーム',
            'ACCURTEK',
            'AC19-12B',
            '現役',
            '17-49インチ対応 / ガススプリング / VESA 75・100 / クランプ・グロメット式',
            2.60,
            1,
            16.0,
            41,
        ],
        [
            'pixio-ps1s-wave',
            'Pixio PS1S Wave モニターアーム',
            'モニターアーム',
            'Pixio',
            'PS1S Wave',
            '現役',
            'シングル / パステルブルー / 32インチ対応',
            2.87,
            1,
            null,
            42,
        ],
        [
            'ax-waber-ax02wb01-j',
            'AX WABER キーボードトレイ',
            'キーボードトレイ',
            'AX WABER',
            'AXO2WB01-J',
            '現役',
            '635×250mm / スライド式 / 前後・回転・角度・高さ調整',
            4.48,
            1,
            null,
            43,
        ],
        [
            'pekaro-keyboard-tray',
            'Pekaro クランプ式キーボードトレイ',
            'キーボードトレイ',
            'Pekaro',
            null,
            '現役',
            '幅60cm×奥行19cm / アルミ合金 / 水平180度回転 / 90度チルト',
            3.80,
            1,
            10.0,
            44,
        ],
        [
            'aoviho-laptop-stand',
            'Aoviho ノートパソコンスタンド',
            'PCスタンド',
            'Aoviho',
            null,
            '現役',
            '折りたたみ式 / アルミ製 / ダイヤモンドブルー / 15.6インチまで対応',
            0.67,
            1,
            null,
            45,
        ],
        [
            'ntonpower-power-tower',
            'NTONPOWER 電源タワー',
            '電源タップ',
            'NTONPOWER',
            null,
            '現役',
            '3m / AC12口 / USB-A×2 / USB-C×2 / ブラック',
            0.53,
            1,
            null,
            46,
        ],
    ];

    $upsert = $pdo->prepare(
        'INSERT INTO home_devices(
            room_id,
            code,
            name,
            category,
            manufacturer,
            model,
            status,
            portable,
            notes,
            weight_kg,
            weight_is_estimate,
            load_capacity_kg,
            sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
            room_id = excluded.room_id,
            name = excluded.name,
            category = excluded.category,
            manufacturer = excluded.manufacturer,
            model = excluded.model,
            status = excluded.status,
            notes = excluded.notes,
            weight_kg = excluded.weight_kg,
            weight_is_estimate = excluded.weight_is_estimate,
            load_capacity_kg = excluded.load_capacity_kg,
            sort_order = excluded.sort_order,
            updated_at = CURRENT_TIMESTAMP'
    );

    foreach (
        $devices as [
            $code,
            $name,
            $category,
            $manufacturer,
            $model,
            $status,
            $notes,
            $weightKg,
            $isEstimate,
            $loadCapacityKg,
            $sortOrder,
        ]
    ) {
        $upsert->execute([
            (int) $gamingRoomId,
            $code,
            $name,
            $category,
            $manufacturer,
            $model,
            $status,
            $notes,
            $weightKg,
            $isEstimate,
            $loadCapacityKg,
            $sortOrder,
        ]);
    }

    if (
        $pdo->query(
            'PRAGMA foreign_key_check(home_devices)'
        )->fetch() !== false
    ) {
        throw new RuntimeException('Foreign key validation failed.');
    }

    $pdo->commit();

    echo "Home load metrics migration completed.\n";
    echo "Backup: {$backupPath}\n";
} catch (Throwable $error) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    fwrite(
        STDERR,
        "Home load metrics migration failed; no partial changes committed.\n"
    );

    fwrite(STDERR, $error->getMessage() . "\n");

    exit(1);
}
