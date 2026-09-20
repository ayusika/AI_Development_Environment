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


if (
    !copy(
        $databasePath,
        $backupPath
    )
) {
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

    $currentSql =
        $pdo
            ->query(
                "
                SELECT sql

                FROM sqlite_master

                WHERE
                    type = 'table'
                    AND name = 'customer_names'

                LIMIT 1
                "
            )
            ->fetchColumn();


    if ($currentSql === false) {
        throw new RuntimeException(
            'customer_names table was not found.'
        );
    }


    if (
        str_contains(
            (string) $currentSql,
            "'kashikoi'"
        )
    ) {

        echo
            "customer_names already allows kashikoi.\n";

        echo
            "\nMigration completed successfully.\n";

        exit(0);
    }


    $pdo->exec(
        'PRAGMA foreign_keys = OFF'
    );


    $pdo->beginTransaction();


    $pdo->exec(
        "
        CREATE TABLE customer_names_new (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            customer_id INTEGER NOT NULL,

            name_type TEXT NOT NULL CHECK (
                name_type IN (
                    'nickname',
                    'kashikoi',
                    'okini_talk',
                    'line',
                    'x',
                    'instagram',
                    'store',
                    'other'
                )
            ),

            name TEXT NOT NULL,

            store_id INTEGER,

            is_primary INTEGER NOT NULL DEFAULT 0
                CHECK (is_primary IN (0, 1)),

            note TEXT,

            created_at TEXT NOT NULL DEFAULT (
                strftime(
                    '%Y-%m-%d %H:%M',
                    'now',
                    'localtime'
                )
            ),

            updated_at TEXT NOT NULL DEFAULT (
                strftime(
                    '%Y-%m-%d %H:%M',
                    'now',
                    'localtime'
                )
            ),

            FOREIGN KEY (customer_id)
                REFERENCES customers(id)
                ON DELETE CASCADE,

            FOREIGN KEY (store_id)
                REFERENCES stores(id)
                ON DELETE SET NULL
        )
        "
    );


    $pdo->exec(
        "
        INSERT INTO customer_names_new (
            id,
            customer_id,
            name_type,
            name,
            store_id,
            is_primary,
            note,
            created_at,
            updated_at
        )

        SELECT
            id,
            customer_id,
            name_type,
            name,
            store_id,
            is_primary,
            note,
            created_at,
            updated_at

        FROM customer_names
        "
    );


    $oldCount =
        (int)
        $pdo
            ->query(
                'SELECT COUNT(*) FROM customer_names'
            )
            ->fetchColumn();


    $newCount =
        (int)
        $pdo
            ->query(
                'SELECT COUNT(*) FROM customer_names_new'
            )
            ->fetchColumn();


    if ($oldCount !== $newCount) {
        throw new RuntimeException(
            'Record count mismatch during migration.'
        );
    }


    $pdo->exec(
        'DROP TABLE customer_names'
    );


    $pdo->exec(
        "
        ALTER TABLE customer_names_new
        RENAME TO customer_names
        "
    );


    $pdo->commit();


    $pdo->exec(
        'PRAGMA foreign_keys = ON'
    );


    $foreignKeyErrors =
        $pdo
            ->query(
                'PRAGMA foreign_key_check'
            )
            ->fetchAll();


    if ($foreignKeyErrors) {
        throw new RuntimeException(
            'Foreign key check failed.'
        );
    }


    echo
        "customer_names rebuilt successfully.\n";

    echo
        "Records preserved: {$newCount}\n";

    echo
        "Added allowed name_type: kashikoi\n";

    echo
        "\nMigration completed successfully.\n";


} catch (Throwable $error) {

    if (
        $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }


    try {
        $pdo->exec(
            'PRAGMA foreign_keys = ON'
        );
    } catch (Throwable $ignored) {
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