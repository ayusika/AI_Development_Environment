<?php

declare(strict_types=1);


if (PHP_SAPI !== 'cli') {
    http_response_code(403);

    echo "This migration can only run from CLI.\n";

    exit(1);
}


$databasePath =
    $argv[1]
    ?? '';


if ($databasePath === '') {
    fwrite(
        STDERR,
        "Database path is required.\n"
    );

    exit(1);
}


if (!is_file($databasePath)) {
    fwrite(
        STDERR,
        "Database was not found: {$databasePath}\n"
    );

    exit(1);
}


$backupPath =
    $databasePath
    . '.backup-'
    . date('Ymd-His');


if (!copy(
    $databasePath,
    $backupPath
)) {
    fwrite(
        STDERR,
        "Database backup failed.\n"
    );

    exit(1);
}


echo "Backup created:\n";
echo $backupPath . "\n\n";


$pdo =
    new PDO(
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
    'PRAGMA foreign_keys = ON'
);


try {

    $pdo->beginTransaction();


    $visitColumns =
        $pdo
            ->query(
                'PRAGMA table_info(visits)'
            )
            ->fetchAll();


    $hasBookedAt =
        false;


    foreach (
        $visitColumns
        as $column
    ) {

        if (
            ($column['name'] ?? '')
            === 'booked_at'
        ) {

            $hasBookedAt =
                true;

            break;
        }
    }


    if (!$hasBookedAt) {

        $pdo->exec(
            '
            ALTER TABLE visits
            ADD COLUMN booked_at TEXT
            '
        );


        echo
            "Added visits.booked_at\n";

    } else {

        echo
            "visits.booked_at already exists\n";
    }


    $pdo->exec(
        '
        CREATE TABLE IF NOT EXISTS visit_change_history (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            visit_id INTEGER NOT NULL,

            requested_at TEXT NOT NULL,

            change_type TEXT NOT NULL DEFAULT \'other\'
                CHECK (
                    change_type IN (
                        \'datetime\',
                        \'course\',
                        \'store\',
                        \'option\',
                        \'status\',
                        \'multiple\',
                        \'other\'
                    )
                ),

            before_data TEXT NOT NULL,

            after_data TEXT NOT NULL,

            note TEXT,

            created_at TEXT NOT NULL DEFAULT (
                strftime(
                    \'%Y-%m-%d %H:%M\',
                    \'now\',
                    \'localtime\'
                )
            ),

            FOREIGN KEY (visit_id)
                REFERENCES visits(id)
                ON DELETE CASCADE
        )
        '
    );


    $pdo->exec(
        '
        CREATE INDEX IF NOT EXISTS
        idx_visit_change_history_visit_id
        ON visit_change_history(visit_id)
        '
    );


    $pdo->exec(
        '
        CREATE INDEX IF NOT EXISTS
        idx_visit_change_history_requested_at
        ON visit_change_history(requested_at)
        '
    );


    $pdo->commit();


    echo "\nMigration completed successfully.\n";


    $result =
        $pdo
            ->query(
                '
                SELECT name
                FROM sqlite_master
                WHERE type = \'table\'
                  AND name IN (
                      \'visits\',
                      \'visit_change_history\'
                  )
                ORDER BY name
                '
            )
            ->fetchAll(
                PDO::FETCH_COLUMN
            );


    echo "\nRelevant tables:\n";

    foreach (
        $result
        as $table
    ) {

        echo
            "- {$table}\n";
    }


} catch (Throwable $error) {

    if (
        $pdo->inTransaction()
    ) {

        $pdo->rollBack();
    }


    fwrite(
        STDERR,
        "\nMigration failed:\n"
        . $error->getMessage()
        . "\n"
    );


    fwrite(
        STDERR,
        "\nBackup remains available at:\n"
        . $backupPath
        . "\n"
    );


    exit(1);
}