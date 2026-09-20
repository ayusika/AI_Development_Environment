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


/* =========================================================
   Backup
========================================================= */

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


/* =========================================================
   Database
========================================================= */

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


/* =========================================================
   Migration
========================================================= */

try {

    $pdo->beginTransaction();


    $pdo->exec(
        '
        CREATE TABLE IF NOT EXISTS heaven_diaries (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            visit_id INTEGER NOT NULL,

            customer_id INTEGER,

            body TEXT NOT NULL,

            source TEXT NOT NULL DEFAULT \'manual\'
                CHECK (
                    source IN (
                        \'manual\',
                        \'ai\',
                        \'ai_edited\'
                    )
                ),

            platform TEXT NOT NULL DEFAULT \'heaven\'
                CHECK (
                    platform IN (
                        \'heaven\'
                    )
                ),

            created_at TEXT NOT NULL DEFAULT (
                strftime(
                    \'%Y-%m-%d %H:%M\',
                    \'now\',
                    \'localtime\'
                )
            ),

            updated_at TEXT NOT NULL DEFAULT (
                strftime(
                    \'%Y-%m-%d %H:%M\',
                    \'now\',
                    \'localtime\'
                )
            ),

            FOREIGN KEY (visit_id)
                REFERENCES visits(id)
                ON DELETE CASCADE,

            FOREIGN KEY (customer_id)
                REFERENCES customers(id)
                ON DELETE SET NULL
        )
        '
    );


    $pdo->exec(
        '
        CREATE UNIQUE INDEX IF NOT EXISTS
        idx_heaven_diaries_visit_id
        ON heaven_diaries(visit_id)
        '
    );


    $pdo->exec(
        '
        CREATE INDEX IF NOT EXISTS
        idx_heaven_diaries_customer_id
        ON heaven_diaries(customer_id)
        '
    );


    $pdo->exec(
        '
        CREATE INDEX IF NOT EXISTS
        idx_heaven_diaries_source
        ON heaven_diaries(source)
        '
    );


    $pdo->exec(
        '
        CREATE INDEX IF NOT EXISTS
        idx_heaven_diaries_created_at
        ON heaven_diaries(created_at)
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
                  AND name = \'heaven_diaries\'
                '
            )
            ->fetchColumn();


    echo "\nRelevant tables:\n";


    if ($result) {

        echo "- heaven_diaries\n";
    }


} catch (Throwable $error) {

    if ($pdo->inTransaction()) {

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