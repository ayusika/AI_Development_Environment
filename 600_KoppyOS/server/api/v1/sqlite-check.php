<?php

header('Content-Type: application/json; charset=utf-8');

$result = [
    'success' => false,
    'pdo_available' => class_exists('PDO'),
    'pdo_sqlite_available' => false,
    'sqlite_version' => null,
    'error' => null,
];

try {
    if (!class_exists('PDO')) {
        throw new RuntimeException('PDO is not available.');
    }

    $drivers = PDO::getAvailableDrivers();

    $result['pdo_sqlite_available'] =
        in_array('sqlite', $drivers, true);

    if (!$result['pdo_sqlite_available']) {
        throw new RuntimeException(
            'PDO_SQLITE driver is not available.'
        );
    }

    $pdo = new PDO('sqlite::memory:');

    $version = $pdo
        ->query('SELECT sqlite_version()')
        ->fetchColumn();

    $result['sqlite_version'] = $version;
    $result['success'] = true;

} catch (Throwable $e) {
    $result['error'] = $e->getMessage();
}

echo json_encode(
    $result,
    JSON_UNESCAPED_UNICODE |
    JSON_PRETTY_PRINT
);