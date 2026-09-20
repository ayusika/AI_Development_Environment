<?php

declare(strict_types=1);

require_once __DIR__ . '/sqlite.php';


function koppyOsDatabasePath(): string
{
    $configuredPath =
        getenv(
            'KOPPYOS_DATABASE_PATH'
        );

    if ($configuredPath !== false) {
        $configuredPath =
            trim(
                $configuredPath
            );

        if ($configuredPath !== '') {
            return $configuredPath;
        }
    }

    /*
     * Legacy-compatible fallback.
     *
     * Pro production will provide
     * KOPPYOS_DATABASE_PATH explicitly.
     */
    $documentRoot =
        $_SERVER['DOCUMENT_ROOT']
        ?? '';

    if ($documentRoot === '') {
        throw new RuntimeException(
            'KoppyOS database path is not configured.'
        );
    }

    return
        $documentRoot
        . '/../../.koppy-private/database/'
        . 'koppyos.sqlite';
}


function koppyOsDatabase(): PDO
{
    static $connection = null;

    if ($connection instanceof PDO) {
        return $connection;
    }

    $connection =
        koppyOpenSqliteDatabase(
            koppyOsDatabasePath(),
            'KoppyOS'
        );

    return $connection;
}
