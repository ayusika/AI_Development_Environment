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
        CREATE TABLE IF NOT EXISTS heaven_diary_drafts (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            visit_id INTEGER NOT NULL,

            body TEXT NOT NULL DEFAULT \'\',

            note TEXT NOT NULL DEFAULT \'\',

            extra_note TEXT NOT NULL DEFAULT \'\',

            place TEXT NOT NULL DEFAULT \'hotel\'
                CHECK (
                    place IN (
                        \'hotel\',
                        \'room\',
                        \'home\'
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
                ON DELETE CASCADE
        )
        '
    );


    $tableSql =
        (string) (
            $pdo
                ->query(
                    '
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = \'table\'
                      AND name = \'heaven_diary_drafts\'
                    LIMIT 1
                    '
                )
                ->fetchColumn()
            ?: ''
        );


    if (
        $tableSql !== ''
        && strpos(
            $tableSql,
            '\'home\''
        ) === false
    ) {

        $pdo->exec(
            '
            CREATE TABLE heaven_diary_drafts_new (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                visit_id INTEGER NOT NULL,

                body TEXT NOT NULL DEFAULT \'\',

                note TEXT NOT NULL DEFAULT \'\',

                extra_note TEXT NOT NULL DEFAULT \'\',

                place TEXT NOT NULL DEFAULT \'hotel\'
                    CHECK (
                        place IN (
                            \'hotel\',
                            \'room\',
                            \'home\'
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
                    ON DELETE CASCADE
            )
            '
        );


        $pdo->exec(
            '
            INSERT INTO heaven_diary_drafts_new (
                id,
                visit_id,
                body,
                note,
                extra_note,
                place,
                created_at,
                updated_at
            )

            SELECT
                id,
                visit_id,
                body,
                note,
                extra_note,
                place,
                created_at,
                updated_at

            FROM heaven_diary_drafts
            '
        );


        $pdo->exec(
            '
            DROP TABLE heaven_diary_drafts
            '
        );


        $pdo->exec(
            '
            ALTER TABLE heaven_diary_drafts_new
            RENAME TO heaven_diary_drafts
            '
        );
    }


    /*
     * 予約カードから作るヘブン日記の
     * タイトル下書き保存用。
     *
     * 既存DBでは title 列がまだ存在しないため、
     * 存在確認してから安全に追加する。
     */
    $draftColumns =
        $pdo
            ->query(
                '
                PRAGMA table_info(
                    heaven_diary_drafts
                )
                '
            )
            ->fetchAll();


    $draftColumnNames =
        array_column(
            $draftColumns,
            'name'
        );


    if (
        !in_array(
            'title',
            $draftColumnNames,
            true
        )
    ) {

        $pdo->exec(
            '
            ALTER TABLE heaven_diary_drafts
            ADD COLUMN title TEXT NOT NULL DEFAULT \'\'
            '
        );
    }


    $pdo->exec(
        '
        CREATE UNIQUE INDEX IF NOT EXISTS
        idx_heaven_diary_drafts_visit_id
        ON heaven_diary_drafts(visit_id)
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
                  AND name = \'heaven_diary_drafts\'
                '
            )
            ->fetchColumn();


    echo "\nRelevant tables:\n";


    if ($result) {

        echo "- heaven_diary_drafts\n";
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