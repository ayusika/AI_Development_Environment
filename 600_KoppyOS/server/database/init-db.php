<?php

header('Content-Type: application/json; charset=utf-8');

$privateDirectory =
    '/home/users/2/her.jp-mikipiano/.koppy-private/database';

$schemaPath =
    $privateDirectory . '/schema.sql';

$databasePath =
    $privateDirectory . '/kohaku-work.sqlite';

$result = [
    'success' => false,
    'database_created' => false,
    'database_path' => $databasePath,
    'tables' => [],
    'error' => null,
];

try {
    if (!extension_loaded('pdo_sqlite')) {
        throw new RuntimeException(
            'PDO_SQLITE is not available.'
        );
    }

    if (!is_dir($privateDirectory)) {
        throw new RuntimeException(
            'Private database directory does not exist.'
        );
    }

    if (!is_file($schemaPath)) {
        throw new RuntimeException(
            'schema.sql was not found.'
        );
    }

    if (is_file($databasePath)) {
        throw new RuntimeException(
            'Database already exists. Initialization stopped.'
        );
    }

    $schema =
        file_get_contents($schemaPath);

    if ($schema === false || trim($schema) === '') {
        throw new RuntimeException(
            'schema.sql is empty or unreadable.'
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

    $pdo->exec($schema);

    $tables = $pdo
        ->query(
            "
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            "
        )
        ->fetchAll(PDO::FETCH_COLUMN);

    $result['success'] = true;
    $result['database_created'] = true;
    $result['tables'] = $tables;

} catch (Throwable $e) {
    $result['error'] =
        $e->getMessage();

    if (
        !$result['success'] &&
        !empty($databasePath) &&
        is_file($databasePath)
    ) {
        @unlink($databasePath);
    }
}

echo json_encode(
    $result,
    JSON_UNESCAPED_UNICODE |
    JSON_PRETTY_PRINT
);