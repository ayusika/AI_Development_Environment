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


    $existingColumns = [];


    foreach (
        $visitColumns
        as $column
    ) {

        $columnName =
            (string) (
                $column['name']
                ?? ''
            );


        if ($columnName !== '') {

            $existingColumns[] =
                $columnName;
        }
    }


    if (
        !in_array(
            'cancelled_at',
            $existingColumns,
            true
        )
    ) {

        $pdo->exec(
            '
            ALTER TABLE visits
            ADD COLUMN cancelled_at TEXT
            '
        );


        echo
            "Added visits.cancelled_at\n";

    } else {

        echo
            "visits.cancelled_at already exists\n";
    }


    if (
        !in_array(
            'cancel_reason',
            $existingColumns,
            true
        )
    ) {

        $pdo->exec(
            '
            ALTER TABLE visits
            ADD COLUMN cancel_reason TEXT
            '
        );


        echo
            "Added visits.cancel_reason\n";

    } else {

        echo
            "visits.cancel_reason already exists\n";
    }


    if (
        !in_array(
            'cancelled_by',
            $existingColumns,
            true
        )
    ) {

        $pdo->exec(
            "
            ALTER TABLE visits
            ADD COLUMN cancelled_by TEXT
            CHECK (
                cancelled_by IS NULL
                OR cancelled_by IN (
                    'customer',
                    'self',
                    'store',
                    'other'
                )
            )
            "
        );


        echo
            "Added visits.cancelled_by\n";

    } else {

        echo
            "visits.cancelled_by already exists\n";
    }


    $pdo->commit();


    echo
        "\nMigration completed successfully.\n";


    $result =
        $pdo
            ->query(
                'PRAGMA table_info(visits)'
            )
            ->fetchAll();


    echo "\nCancellation columns:\n";


    foreach (
        $result
        as $column
    ) {

        $columnName =
            (string) (
                $column['name']
                ?? ''
            );


        if (
            in_array(
                $columnName,
                [
                    'cancelled_at',
                    'cancel_reason',
                    'cancelled_by',
                ],
                true
            )
        ) {

            echo
                "- {$columnName}\n";
        }
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