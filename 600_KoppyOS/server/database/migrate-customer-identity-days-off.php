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
    $tableSqlStatement =
        $pdo->prepare(
            "
            SELECT sql
            FROM sqlite_master
            WHERE
                type = 'table'
                AND name = 'customer_identity_features'
            LIMIT 1
            "
        );

    $tableSqlStatement->execute();

    $tableSql =
        $tableSqlStatement->fetchColumn();

    if (
        $tableSql === false
        || trim((string) $tableSql) === ''
    ) {
        throw new RuntimeException(
            'customer_identity_features was not found.'
        );
    }

    if (
        str_contains(
            (string) $tableSql,
            "'days_off'"
        )
    ) {
        echo
            "customer_identity_features already supports days_off.\n";

        echo
            "\nMigration completed successfully.\n";

        exit(0);
    }

    $tempTable =
        'customer_identity_features__days_off_new';

    $tempExistsStatement =
        $pdo->prepare(
            "
            SELECT name
            FROM sqlite_master
            WHERE
                type = 'table'
                AND name = ?
            LIMIT 1
            "
        );

    $tempExistsStatement->execute([
        $tempTable,
    ]);

    if (
        $tempExistsStatement->fetchColumn()
        !== false
    ) {
        throw new RuntimeException(
            $tempTable
            . ' already exists. Refusing to overwrite it.'
        );
    }

    $beforeCount =
        (int)
        $pdo
            ->query(
                "
                SELECT COUNT(*)
                FROM customer_identity_features
                "
            )
            ->fetchColumn();

    $pdo->exec(
        'PRAGMA foreign_keys = OFF'
    );

    $pdo->beginTransaction();

    $pdo->exec(
        "
        CREATE TABLE {$tempTable} (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            customer_id INTEGER NOT NULL,

            feature_type TEXT NOT NULL CHECK (
                feature_type IN (
                    'age_range',
                    'height',
                    'body_type',
                    'hair',
                    'facial_hair',
                    'glasses',
                    'appearance',
                    'lookalike',
                    'occupation',
                    'days_off',
                    'voice_speech',
                    'area',
                    'hobby_topic',
                    'other'
                )
            ),

            feature_value TEXT NOT NULL
                CHECK (
                    trim(feature_value) <> ''
                ),

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
                ON DELETE CASCADE
        )
        "
    );

    $pdo->exec(
        "
        INSERT INTO {$tempTable}
        (
            id,
            customer_id,
            feature_type,
            feature_value,
            note,
            created_at,
            updated_at
        )
        SELECT
            id,
            customer_id,
            feature_type,
            feature_value,
            note,
            created_at,
            updated_at
        FROM customer_identity_features
        ORDER BY id ASC
        "
    );

    $afterCopyCount =
        (int)
        $pdo
            ->query(
                "
                SELECT COUNT(*)
                FROM {$tempTable}
                "
            )
            ->fetchColumn();

    if (
        $beforeCount
        !== $afterCopyCount
    ) {
        throw new RuntimeException(
            "Row count mismatch before table swap: "
            . $beforeCount
            . " != "
            . $afterCopyCount
        );
    }

    $pdo->exec(
        "
        DROP TABLE customer_identity_features
        "
    );

    $pdo->exec(
        "
        ALTER TABLE {$tempTable}
        RENAME TO customer_identity_features
        "
    );

    $foreignKeyErrors =
        $pdo
            ->query(
                'PRAGMA foreign_key_check'
            )
            ->fetchAll();

    if (
        count($foreignKeyErrors)
        !== 0
    ) {
        throw new RuntimeException(
            'Foreign key check failed after migration.'
        );
    }

    $finalCount =
        (int)
        $pdo
            ->query(
                "
                SELECT COUNT(*)
                FROM customer_identity_features
                "
            )
            ->fetchColumn();

    if (
        $finalCount
        !== $beforeCount
    ) {
        throw new RuntimeException(
            "Final row count mismatch: "
            . $beforeCount
            . " != "
            . $finalCount
        );
    }

    $verifySql =
        (string)
        $pdo
            ->query(
                "
                SELECT sql
                FROM sqlite_master
                WHERE
                    type = 'table'
                    AND name = 'customer_identity_features'
                LIMIT 1
                "
            )
            ->fetchColumn();

    if (
        !str_contains(
            $verifySql,
            "'days_off'"
        )
    ) {
        throw new RuntimeException(
            'days_off constraint verification failed.'
        );
    }

    $pdo->commit();

    $pdo->exec(
        'PRAGMA foreign_keys = ON'
    );

    echo
        "customer_identity_features now supports days_off.\n";

    echo
        "Rows preserved: {$finalCount}\n";

    echo
        "\nMigration completed successfully.\n";

} catch (Throwable $error) {
    if (
        isset($pdo)
        && $pdo instanceof PDO
        && $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

    try {
        if (
            isset($pdo)
            && $pdo instanceof PDO
        ) {
            $pdo->exec(
                'PRAGMA foreign_keys = ON'
            );
        }
    } catch (Throwable) {
        // Preserve the original migration error.
    }

    fwrite(
        STDERR,
        "Migration failed:\n"
        . $error->getMessage()
        . "\n"
    );

    fwrite(
        STDERR,
        "Backup remains at:\n"
        . $backupPath
        . "\n"
    );

    exit(1);
}
