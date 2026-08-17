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


try {

    $existingTable =
        $pdo
            ->query(
                "
                SELECT name

                FROM sqlite_master

                WHERE
                    type = 'table'
                    AND name = 'customer_identity_history'

                LIMIT 1
                "
            )
            ->fetchColumn();


    if ($existingTable !== false) {

        echo
            "customer_identity_history already exists.\n";

        echo
            "\nMigration completed successfully.\n";

        exit(0);
    }


    $pdo->exec(
        'PRAGMA foreign_keys = ON'
    );


    $pdo->beginTransaction();


    $pdo->exec(
        "
        CREATE TABLE customer_identity_history (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            visit_id INTEGER NOT NULL,

            before_customer_id INTEGER,

            after_customer_id INTEGER,

            action_type TEXT NOT NULL CHECK (
                action_type IN (
                    'linked',
                    'unlinked',
                    'relinked',
                    'new_customer_created'
                )
            ),

            note TEXT,

            created_at TEXT NOT NULL DEFAULT (
                strftime(
                    '%Y-%m-%d %H:%M',
                    'now',
                    'localtime'
                )
            ),

            FOREIGN KEY (visit_id)
                REFERENCES visits(id)
                ON DELETE CASCADE
        )
        "
    );


    $pdo->commit();


    echo
        "customer_identity_history created successfully.\n";

    echo
        "\nMigration completed successfully.\n";


} catch (Throwable $error) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }


    fwrite(
        STDERR,
        "Migration failed:\n"
        . $error->getMessage()
        . "\n"
    );

    exit(1);
}