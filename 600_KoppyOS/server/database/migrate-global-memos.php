<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration can only run from CLI.\n");
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

umask(0077);

$pdo = null;

try {

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

    $pdo->exec(
        'PRAGMA busy_timeout = 5000'
    );


    $backupPath =
        $databasePath
        . '.backup-global-memos-'
        . date('Ymd-His')
        . '-'
        . bin2hex(
            random_bytes(6)
        );


    $pdo->exec(
        'VACUUM INTO '
        . $pdo->quote(
            $backupPath
        )
    );


    $backup =
        new PDO(
            'sqlite:' . $backupPath
        );

    if (
        $backup
            ->query(
                'PRAGMA quick_check'
            )
            ->fetchColumn()
        !== 'ok'
    ) {
        throw new RuntimeException(
            'Backup validation failed.'
        );
    }

    $backup = null;


    $pdo->beginTransaction();


    $pdo->exec(
        '
        CREATE TABLE IF NOT EXISTS
            koppy_global_memo_buttons
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        '
    );


    $pdo->exec(
        '
        CREATE TABLE IF NOT EXISTS
            koppy_global_memo_pages
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            button_id INTEGER NOT NULL
                REFERENCES koppy_global_memo_buttons(id)
                ON DELETE CASCADE,

            title TEXT NOT NULL DEFAULT \'\',
            content TEXT NOT NULL DEFAULT \'\',

            sort_order INTEGER NOT NULL DEFAULT 0,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        '
    );


    $pdo->exec(
        '
        CREATE INDEX IF NOT EXISTS
            idx_koppy_global_memo_pages_button_sort

        ON koppy_global_memo_pages(
            button_id,
            sort_order,
            id
        )
        '
    );


    $buttonCount =
        (int)
        $pdo
            ->query(
                '
                SELECT COUNT(*)
                FROM koppy_global_memo_buttons
                '
            )
            ->fetchColumn();


    if ($buttonCount === 0) {

        $pdo->exec(
            '
            INSERT INTO
                koppy_global_memo_buttons(
                    sort_order
                )
            VALUES (0)
            '
        );


        $buttonId =
            (int)
            $pdo->lastInsertId();


        $statement =
            $pdo->prepare(
                '
                INSERT INTO
                    koppy_global_memo_pages(
                        button_id,
                        title,
                        content,
                        sort_order
                    )
                VALUES (
                    ?,
                    ?,
                    \'\',
                    0
                )
                '
            );


        $statement->execute([
            $buttonId,
            'メモ 1',
        ]);
    }


    foreach (
        [
            'koppy_global_memo_buttons',
            'koppy_global_memo_pages',
        ]
        as $table
    ) {

        $statement =
            $pdo->prepare(
                '
                SELECT COUNT(*)

                FROM sqlite_master

                WHERE
                    type = \'table\'
                    AND name = ?
                '
            );

        $statement->execute([
            $table,
        ]);

        if (
            (int)
            $statement->fetchColumn()
            !== 1
        ) {
            throw new RuntimeException(
                'Required table was not created: '
                . $table
            );
        }
    }


    if (
        $pdo
            ->query(
                'PRAGMA foreign_key_check'
            )
            ->fetch()
        !== false
    ) {
        throw new RuntimeException(
            'Foreign key validation failed.'
        );
    }


    $pdo->commit();


    echo "Global memo migration completed.\n";
    echo "Backup: {$backupPath}\n";


} catch (Throwable $error) {

    if (
        $pdo instanceof PDO
        && $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }


    fwrite(
        STDERR,
        "Global memo migration failed; "
        . "no partial changes committed.\n"
    );

    fwrite(
        STDERR,
        $error->getMessage()
        . "\n"
    );

    exit(1);
}
