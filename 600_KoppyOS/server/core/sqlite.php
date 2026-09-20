<?php

declare(strict_types=1);

/**
 * Open a SQLite database using the shared KoppyOS safety defaults.
 */
function koppyOpenSqliteDatabase(
    string $databasePath,
    string $databaseLabel
): PDO {
    $databasePath =
        trim(
            $databasePath
        );

    $databaseLabel =
        trim(
            $databaseLabel
        );

    if ($databaseLabel === '') {
        $databaseLabel =
            'SQLite';
    }

    if (
        $databasePath === ''
        || !is_file(
            $databasePath
        )
    ) {
        throw new RuntimeException(
            $databaseLabel
            . ' database was not found.'
        );
    }

    if (!is_readable($databasePath)) {
        throw new RuntimeException(
            $databaseLabel
            . ' database is not readable.'
        );
    }

    $pdo =
        new PDO(
            'sqlite:'
            . $databasePath,
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

    return $pdo;
}
