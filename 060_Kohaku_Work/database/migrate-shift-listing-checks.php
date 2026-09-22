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


if (
    $databasePath === ''
    || !is_file($databasePath)
) {
    fwrite(
        STDERR,
        "Database path is required and must exist.\n"
    );

    exit(1);
}


$backupPath =
    $databasePath
    . '.backup-shift-listing-checks-'
    . date(
        'Ymd-His'
    );


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


    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS
        shift_listing_checks (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,

            worker_id INTEGER NOT NULL,

            provider TEXT NOT NULL,

            listing_name TEXT NOT NULL,

            expected_store_name TEXT NOT NULL,

            shift_date TEXT NOT NULL,

            comparison TEXT NOT NULL,

            is_match INTEGER NOT NULL
                CHECK (
                    is_match IN (0, 1)
                ),

            listing_json TEXT NOT NULL,

            calendar_json TEXT NOT NULL,

            checked_at TEXT NOT NULL,

            created_at TEXT NOT NULL
                DEFAULT (
                    strftime(
                        '%Y-%m-%d %H:%M',
                        'now',
                        'localtime'
                    )
                ),

            updated_at TEXT NOT NULL
                DEFAULT (
                    strftime(
                        '%Y-%m-%d %H:%M',
                        'now',
                        'localtime'
                    )
                ),

            FOREIGN KEY (
                worker_id
            )
                REFERENCES workers(id)
                ON DELETE CASCADE,

            UNIQUE (
                worker_id,
                provider,
                shift_date
            )
        )
        "
    );


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
        idx_shift_listing_checks_worker_date

        ON shift_listing_checks(
            worker_id,
            shift_date
        )
        "
    );


    $pdo->commit();


    echo
        "Migration completed successfully.\n";


} catch (Throwable $error) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }


    fwrite(
        STDERR,
        "Migration failed: "
        . $error->getMessage()
        . "\n"
    );

    fwrite(
        STDERR,
        "Backup: "
        . $backupPath
        . "\n"
    );

    exit(1);
}
