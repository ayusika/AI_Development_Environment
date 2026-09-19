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


    $visitColumnNames =
        array_column(
            $visitColumns,
            'name'
        );


    if (
        !in_array(
            'service_place',
            $visitColumnNames,
            true
        )
    ) {

        $pdo->exec(
            "
            ALTER TABLE visits

            ADD COLUMN service_place TEXT

            CHECK (
                service_place IS NULL
                OR service_place IN (
                    'hotel',
                    'room',
                    'home'
                )
            )
            "
        );


        echo
            "Added visits.service_place\n";

    } else {

        echo
            "visits.service_place already exists\n";
    }


    $draftTableExists =
        (bool) $pdo
            ->query(
                "
                SELECT 1
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = 'heaven_diary_drafts'
                LIMIT 1
                "
            )
            ->fetchColumn();


    $backfilled =
        0;


    if ($draftTableExists) {

        $draftColumns =
            $pdo
                ->query(
                    'PRAGMA table_info(heaven_diary_drafts)'
                )
                ->fetchAll();


        $draftColumnNames =
            array_column(
                $draftColumns,
                'name'
            );


        if (
            in_array(
                'place',
                $draftColumnNames,
                true
            )
        ) {

            $backfilled =
                $pdo->exec(
                    "
                    UPDATE visits

                    SET service_place = (
                        SELECT hdd.place
                        FROM heaven_diary_drafts hdd
                        WHERE hdd.visit_id = visits.id
                        LIMIT 1
                    )

                    WHERE service_place IS NULL

                      AND EXISTS (
                          SELECT 1
                          FROM heaven_diary_drafts hdd
                          WHERE hdd.visit_id = visits.id
                            AND hdd.place IN (
                                'hotel',
                                'room',
                                'home'
                            )
                      )
                    "
                );


            echo
                "Backfilled service_place from heaven_diary_drafts: "
                . (int) $backfilled
                . "\n";
        }
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


    echo
        "\nService place column:\n";


    foreach (
        $result
        as $column
    ) {

        if (
            (string) (
                $column['name']
                ?? ''
            )
            === 'service_place'
        ) {

            echo
                "- service_place\n";
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
