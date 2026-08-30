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

            text_color TEXT,

            source TEXT NOT NULL DEFAULT 'manual',

            external_id TEXT,

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP
        )
        "
    );


    $columns =
        $pdo->query(
            "
            PRAGMA table_info(
                calendar_events
            )
            "
        )
        ->fetchAll();


    $columnNames =
        array_map(
            static fn (
                array $column
            ): string =>
                (string)
                $column['name'],
            $columns
        );


    if (
        !in_array(
            'text_color',
            $columnNames,
            true
        )
    ) {
        $pdo->exec(
            "
            ALTER TABLE calendar_events
            ADD COLUMN text_color TEXT
            "
        );
    }


    $repeatColumns = [
        'repeat_type' =>
            "TEXT NOT NULL DEFAULT 'none'",

        'repeat_interval' =>
            'INTEGER NOT NULL DEFAULT 1',

        'repeat_weekdays' =>
            'TEXT',

        'repeat_day_of_month' =>
            'INTEGER',

        'repeat_week_of_month' =>
            'INTEGER',

        'repeat_weekday' =>
            'INTEGER',

        'repeat_month' =>
            'INTEGER',

        'repeat_end_type' =>
            "TEXT NOT NULL DEFAULT 'none'",

        'repeat_end_date' =>
            'TEXT',

        'repeat_count' =>
            'INTEGER',
    ];


    foreach (
        $repeatColumns
        as $columnName => $columnDefinition
    ) {
        if (
            in_array(
                $columnName,
                $columnNames,
                true
            )
        ) {
            continue;
        }


        $pdo->exec(
            "
            ALTER TABLE calendar_events
            ADD COLUMN {$columnName}
            {$columnDefinition}
            "
        );
    }


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