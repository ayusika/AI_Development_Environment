<?php

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
    $documentRoot =
        $_SERVER['DOCUMENT_ROOT']
        ?? '';

    if ($documentRoot === '') {
        throw new RuntimeException(
            'DOCUMENT_ROOT is not available.'
        );
    }

    $context =
        koppyDatabaseContext();

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

    if (
        isset($connections[$context])
        && $connections[$context] instanceof PDO
    ) {
        return $connections[$context];
    }

    $databasePath =
        koppyDatabasePath();

    if (!is_file($databasePath)) {
        throw new RuntimeException(
            'Kohaku Work '
            . $context
            . ' database was not found.'
        );
    }

    $pdo = new PDO(
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

    $connections[$context] =
        $pdo;

    return $connections[$context];
}
