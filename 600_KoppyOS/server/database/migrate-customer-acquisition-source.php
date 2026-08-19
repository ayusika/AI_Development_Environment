<?php

declare(strict_types=1);

if ($argc < 2) {
    fwrite(
        STDERR,
        "Usage: php migrate-customer-acquisition-source.php <database-path>\n"
    );
    exit(1);
}

$databasePath = $argv[1];

if (!is_file($databasePath)) {
    fwrite(
        STDERR,
        "Database not found: {$databasePath}\n"
    );
    exit(1);
}

$pdo = new PDO(
    'sqlite:' . $databasePath,
    null,
    null,
    [
        PDO::ATTR_ERRMODE =>
            PDO::ERRMODE_EXCEPTION,

        PDO::ATTR_DEFAULT_FETCH_MODE =>
            PDO::FETCH_ASSOC,
    ]
);

$pdo->exec(
    '
    CREATE TABLE IF NOT EXISTS customer_acquisition_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        customer_id INTEGER NOT NULL,

        source_type TEXT NOT NULL,

        source_detail TEXT,

        note TEXT,

        created_at TEXT NOT NULL,

        updated_at TEXT NOT NULL,

        UNIQUE(customer_id)
    )
    '
);

echo "customer_acquisition_sources ready.\n";