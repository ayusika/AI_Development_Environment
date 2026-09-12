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
    // SQLite snapshot includes committed WAL data; plain copy() does not.
    $backupPath = $databasePath . '.backup-home-' . date('Ymd-His') . '-' . bin2hex(random_bytes(6));
    $pdo->exec('VACUUM INTO ' . $pdo->quote($backupPath));
    $backup = new PDO('sqlite:' . $backupPath);
    if ($backup->query('PRAGMA quick_check')->fetchColumn() !== 'ok') {
        throw new RuntimeException('Backup validation failed.');
    }
    $backup = null;
    $pdo->beginTransaction();
    $pdo->exec("CREATE TABLE IF NOT EXISTS home_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS home_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER REFERENCES home_rooms(id),
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        manufacturer TEXT,
        model TEXT,
        status TEXT NOT NULL,
        role TEXT,
        portable INTEGER NOT NULL DEFAULT 0 CHECK (portable IN (0, 1)),
        notes TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS home_connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_device_id INTEGER NOT NULL REFERENCES home_devices(id),
        target_device_id INTEGER NOT NULL REFERENCES home_devices(id),
        connection_type TEXT NOT NULL,
        source_port TEXT,
        target_port TEXT,
        label TEXT,
        notes TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_home_devices_room_sort ON home_devices(room_id, sort_order, id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_home_connections_source_sort ON home_connections(source_device_id, sort_order, id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_home_connections_target ON home_connections(target_device_id)');
    // Snapshot of the two 020_Shichan/自宅 sources, 2026-09-13.
    // Unknown manufacturer/model/role remain NULL; recorded specs are notes.
    $seed = json_decode(<<<'JSON'
{
  "rooms": [
    [
      "entrance",
      "玄関"
    ],
    [
      "toilet",
      "トイレ"
    ],
    [
      "hallway",
      "廊下"
    ],
    [
      "bathroom",
      "洗面所・風呂"
    ],
    [
      "living",
      "リビング・キッチン"
    ],
    [
      "dressing",
      "第一部屋・化粧部屋"
    ],
    [
      "bedroom",
      "第二部屋・寝室"
    ],
    [
      "gaming",
      "第三部屋・ゲーム部屋"
    ]
  ],
  "devices": [
    [
      "living",
      "hub-3",
      "SwitchBot Hub 3",
      "スマートホーム",
      "現役",
      0,
      "詳細未登録 / リビング側のスマートホーム中枢"
    ],
    [
      "living",
      "nebula-capsule-laser",
      "Anker Nebula Capsule Laser",
      "プロジェクター",
      "現役",
      0,
      "詳細未登録 / リビングのホームシアター用"
    ],
    [
      "living",
      "mitsubishi-ac",
      "三菱電機 エアコン",
      "エアコン",
      "現役",
      0,
      "正式型番未確認 / SwitchBot連携対象候補"
    ],
    [
      "living",
      "dyson-am07",
      "Dyson AM07",
      "扇風機",
      "現役",
      0,
      "タワーファン / アイアン・サテンブルー / リモコンあり"
    ],
    [
      "dressing",
      "dresser",
      "ドレッサー",
      "家具",
      "現役",
      0,
      "化粧用"
    ],
    [
      "dressing",
      "rinnai-heater",
      "リンナイ ガスストーブ",
      "暖房",
      "現役",
      0,
      "RHF-310FT / 都市ガス13A・12A / AC100V / 23W"
    ],
    [
      "dressing",
      "dressing-light",
      "TOSHIBA系 照明",
      "照明",
      "現役",
      0,
      "正式型番未確認 / 写真内にNVC-V3表記あり / NVC-V3が照明本体型番か部品番号かは未確定"
    ],
    [
      "bedroom",
      "bedroom-ipad",
      "iPad",
      "タブレット",
      "現役",
      0,
      "世代・型番未登録 / 寝室設置"
    ],
    [
      "bedroom",
      "bedroom-light",
      "照明",
      "照明",
      "現役",
      0,
      "型番未確認"
    ],
    [
      "gaming",
      "gaming-light",
      "照明",
      "照明",
      "現役",
      0,
      "型番未確認"
    ],
    [
      "gaming",
      "aoc-cu34g4z",
      "AOC CU34G4Z",
      "モニター",
      "現役",
      0,
      "34インチ / 3440×1440 UWQHD / 21:9 / 1500R / Fast VA / 240Hz / DisplayHDR 400 / 450nit / メインモニター"
    ],
    [
      "gaming",
      "iris-dg-daw2718s-a",
      "アイリスオーヤマ DG-DAW2718S-A",
      "モニター",
      "現役",
      0,
      "27インチ / WQHD / 180Hz / 1ms / スピーカー搭載"
    ],
    [
      "gaming",
      "oppo-pad-air",
      "OPPO Pad Air",
      "タブレット",
      "現役",
      0,
      "OPD2102A / 10.36インチ / Snapdragon 680 / RAM 4GB / 64GB / 7100mAh / 共有情報ボード用途"
    ],
    [
      "gaming",
      "macbook-air",
      "MacBook Air 15インチ",
      "PC",
      "現役",
      1,
      "Apple M5 / メモリ24GB / 15.3インチ 2880×1864 / しいちゃんメイン。持ち運び可"
    ],
    [
      "gaming",
      "macbook-pro-2018",
      "MacBook Pro 13インチ 2018",
      "PC",
      "現役",
      0,
      "2.7GHz Quad-Core Intel Core i7 / 16GB LPDDR3 / Intel Iris Plus Graphics 655 / 約500GB / コンピュータ名 Koppy-Worker-Pro。Koppy Worker用途"
    ],
    [
      "gaming",
      "anker-prime-dock",
      "Anker Prime ドッキングステーション",
      "ドック",
      "現役",
      0,
      "14-in-1 / Thunderbolt 5 / 最大140W PD / 最大120Gbps / メインドック"
    ],
    [
      "gaming",
      "anker-332-hub",
      "Anker 332 USB-C Hub",
      "USB-Cハブ",
      "現役",
      0,
      "5-in-1 / ブルー / HDMI 4K / USB-A×2 / USB-C給電対応 / サブハブ"
    ],
    [
      "gaming",
      "epson-ep887ab",
      "EPSON カラリオ",
      "プリンター",
      "現役",
      0,
      "EP-887AB / A4インクジェット複合機 / ブラック"
    ],
    [
      "gaming",
      "actionring-vsd",
      "ActionRing ストリームコントローラー",
      "コントローラー",
      "現役",
      0,
      "VSD / 15個のカスタマイズキー / ダイヤル搭載 / ショートカット操作用"
    ],
    [
      "gaming",
      "hub-mini",
      "SwitchBot Hub Mini",
      "スマートホーム",
      "現役",
      0,
      "詳細未登録 / ゲーム部屋側Hub"
    ],
    [
      "gaming",
      "razer-kraken-kitty-v2",
      "Razer Kraken Kitty V2",
      "ヘッドセット",
      "現役",
      0,
      "猫耳ヘッドセット"
    ],
    [
      "gaming",
      "ps5",
      "PlayStation 5",
      "ゲーム機",
      "現役",
      0,
      "詳細未登録"
    ],
    [
      "gaming",
      "switch-2",
      "Nintendo Switch 2",
      "ゲーム機",
      "現役",
      0,
      "詳細未登録"
    ],
    [
      "gaming",
      "ps4",
      "PlayStation 4",
      "ゲーム機",
      "休眠・実験候補",
      0,
      "詳細未登録 / AI用途は実用性低。再利用候補として保留"
    ],
    [
      "gaming",
      "keychron-nape-pro",
      "Keychron Nape Pro",
      "ポインティングデバイス",
      "未使用",
      0,
      "25mmトラックボール / 8方向対応 / ホワイト / 今後の利用候補"
    ],
    [
      "gaming",
      "magic-keyboard",
      "Apple Magic Keyboard",
      "キーボード",
      "現役",
      0,
      "Touch ID / テンキー付き / JIS配列"
    ],
    [
      "gaming",
      "magic-trackpad",
      "Apple Magic Trackpad",
      "ポインティングデバイス",
      "現役",
      0,
      "詳細未登録"
    ],
    [
      "gaming",
      "ui-old-pc",
      "うい旧ゲームPC",
      "PC",
      "保有",
      0,
      "詳細スペック省略 / 現在の利用状態は未整理"
    ],
    [
      "gaming",
      "ui-monitor",
      "ういモニター",
      "モニター",
      "現役",
      0,
      "詳細スペック省略"
    ],
    [
      "gaming",
      "ui-pc",
      "ういゲームPC",
      "PC",
      "現役",
      0,
      "詳細スペック省略"
    ],
    [
      null,
      "iphone-14",
      "iPhone 14",
      "スマートフォン",
      "現役",
      1,
      "詳細未登録 / 現在のメインiPhone"
    ],
    [
      null,
      "iphone-18-pro-max",
      "iPhone 18 Pro Max",
      "スマートフォン",
      "到着待ち",
      1,
      "詳細未登録 / 2026年10月上旬到着予定"
    ]
  ]
}
JSON
    , true, 512, JSON_THROW_ON_ERROR);
    $insertRoom = $pdo->prepare('INSERT INTO home_rooms(code, name, sort_order) VALUES (?, ?, ?) ON CONFLICT(code) DO NOTHING');
    foreach ($seed['rooms'] as $order => [$code, $name]) {
        $insertRoom->execute([$code, $name, $order]);
    }
    $roomIds = $pdo->query('SELECT code, id FROM home_rooms')->fetchAll(PDO::FETCH_KEY_PAIR);
    $insertDevice = $pdo->prepare('INSERT INTO home_devices(room_id, code, name, category, status, portable, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(code) DO NOTHING');
    foreach ($seed['devices'] as $order => [$roomCode, $code, $name, $category, $status, $portable, $notes]) {
        $insertDevice->execute([$roomCode === null ? null : $roomIds[$roomCode], $code, $name, $category, $status, $portable, $notes, $order]);
    }
    // No confirmed physical connections in the sources. Do not infer any.
    foreach (['home_devices', 'home_connections'] as $table) {
        if ($pdo->query('PRAGMA foreign_key_check(' . $table . ')')->fetch() !== false) {
            throw new RuntimeException('Foreign key validation failed.');
        }
    }
    $pdo->commit();
    echo "Home migration completed. Backup: {$backupPath}\n";
} catch (Throwable $error) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, "Home migration failed; no partial schema/seed changes were committed. Check SQLite compatibility, schema and filesystem permissions.\n");
    exit(1);
}
