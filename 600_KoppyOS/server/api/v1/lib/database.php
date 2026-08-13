<?php

function koppyDatabase(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $documentRoot =
        $_SERVER['DOCUMENT_ROOT']
        ?? '';

    if ($documentRoot === '') {
        throw new RuntimeException(
            'DOCUMENT_ROOT is not available.'
        );
    }

    $databasePath =
        $documentRoot
        . '/../../.koppy-private/database/kohaku-work.sqlite';

    if (!is_file($databasePath)) {
        throw new RuntimeException(
            'Kohaku Work database was not found.'
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

    return $pdo;
}