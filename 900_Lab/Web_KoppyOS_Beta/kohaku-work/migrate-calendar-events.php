<?php

declare(strict_types=1);

header(
    'Content-Type: text/plain; charset=utf-8'
);

require_once
    __DIR__
    . '/../auth/auth.php';

koppyRequirePageAuth(
    '/auth/login.php'
);

require_once
    __DIR__
    . '/../api/v1/lib/database.php';


try {
    $pdo =
        koppyDatabase();


    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            owner_code TEXT NOT NULL
                CHECK (
                    owner_code IN (
                        'ui',
                        'shii',
                        'shared'
                    )
                ),

            title TEXT NOT NULL,

            start_at TEXT,
            end_at TEXT,

            all_day INTEGER NOT NULL DEFAULT 0
                CHECK (
                    all_day IN (0, 1)
                ),

            category TEXT,
            memo TEXT,

            source TEXT NOT NULL DEFAULT 'manual',

            external_id TEXT,

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP
        )
        "
    );


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_calendar_events_start_at
        ON calendar_events (
            start_at
        )
        "
    );


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_calendar_events_owner_start
        ON calendar_events (
            owner_code,
            start_at
        )
        "
    );


    echo
        'calendar_events migration completed.';


} catch (Throwable $e) {

    http_response_code(500);

    echo
        'Migration failed: '
        . $e->getMessage();
}