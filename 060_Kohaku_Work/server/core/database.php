<?php

declare(strict_types=1);

require_once __DIR__
    . '/../../../600_KoppyOS/server/core/sqlite.php';


function koppyDatabaseContext(): string
{
    $context =
        defined('KOPPY_DATABASE_CONTEXT')
            ? strtolower(
                trim(
                    (string) constant(
                        'KOPPY_DATABASE_CONTEXT'
                    )
                )
            )
            : 'production';

    if (
        !in_array(
            $context,
            [
                'production',
                'verification',
            ],
            true
        )
    ) {
        throw new RuntimeException(
            'Invalid Kohaku Work database context.'
        );
    }

    return $context;
}


function koppyDatabasePath(): string
{
    $context =
        koppyDatabaseContext();

    $environmentVariable =
        $context === 'verification'
            ? 'KOHAKU_WORK_VERIFICATION_DATABASE_PATH'
            : 'KOHAKU_WORK_DATABASE_PATH';

    $configuredPath =
        getenv(
            $environmentVariable
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
     * Legacy Lolipop-compatible fallback.
     *
     * Pro production will provide
     * KOHAKU_WORK_DATABASE_PATH explicitly.
     */
    $documentRoot =
        $_SERVER['DOCUMENT_ROOT']
        ?? '';

    if ($documentRoot === '') {
        throw new RuntimeException(
            'Kohaku Work database path is not configured.'
        );
    }

    $databaseFilename =
        $context === 'verification'
            ? 'kohaku-work-verification.sqlite'
            : 'kohaku-work.sqlite';

    return
        $documentRoot
        . '/../../.koppy-private/database/'
        . $databaseFilename;
}


function koppyDatabase(): PDO
{
    static $connections = [];

    $context =
        koppyDatabaseContext();

    $databasePath =
        koppyDatabasePath();

    $connectionKey =
        $context
        . "\0"
        . $databasePath;

    if (
        isset(
            $connections[
                $connectionKey
            ]
        )
        && $connections[
            $connectionKey
        ] instanceof PDO
    ) {
        return $connections[
            $connectionKey
        ];
    }

    $connections[
        $connectionKey
    ] =
        koppyOpenSqliteDatabase(
            $databasePath,
            'Kohaku Work '
            . $context
        );

    return $connections[
        $connectionKey
    ];
}
