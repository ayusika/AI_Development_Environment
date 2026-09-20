<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../../../600_KoppyOS/server/auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/../../core/database.php';

function nextCustomerProfileMetaReadJsonBody(): array
{
    $rawBody = file_get_contents('php://input');

    if ($rawBody === false || trim($rawBody) === '') {
        return [];
    }

    $payload = json_decode($rawBody, true);

    if (!is_array($payload)) {
        throw new RuntimeException('Invalid JSON body.');
    }

    return $payload;
}

function nextCustomerProfileMetaFetch(PDO $pdo, int $customerId): array
{
    $customerStatement = $pdo->prepare(
        "SELECT id, customer_code, updated_at
         FROM customers
         WHERE id = ?
         LIMIT 1"
    );
    $customerStatement->execute([$customerId]);
    $customer = $customerStatement->fetch();

    if (!$customer) {
        throw new RuntimeException('Customer was not found.');
    }

    $nameStatement = $pdo->prepare(
        "SELECT id, name_type, name, store_id, is_primary, note, created_at, updated_at
         FROM customer_names
         WHERE customer_id = ?
         ORDER BY is_primary DESC, id ASC"
    );
    $nameStatement->execute([$customerId]);

    $sourceStatement = $pdo->prepare(
        "SELECT id, customer_id, source_type, source_detail, note, created_at, updated_at
         FROM customer_acquisition_sources
         WHERE customer_id = ?
         LIMIT 1"
    );
    $sourceStatement->execute([$customerId]);

    $customer['names'] = $nameStatement->fetchAll();
    $customer['acquisition_source'] = $sourceStatement->fetch() ?: null;

    return $customer;
}

try {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $pdo = koppyDatabase();

    if ($method === 'GET') {
        $customerId = isset($_GET['id']) ? (int) $_GET['id'] : 0;

        if ($customerId <= 0) {
            throw new RuntimeException('id is required.');
        }

        echo json_encode(
            [
                'success' => true,
                'customer' => nextCustomerProfileMetaFetch($pdo, $customerId),
                'error' => null,
            ],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
        );
        exit;
    }

    if ($method !== 'PATCH') {
        http_response_code(405);
        throw new RuntimeException('GET or PATCH only.');
    }

    $payload = nextCustomerProfileMetaReadJsonBody();
    $customerId = isset($payload['id']) ? (int) $payload['id'] : 0;

    if ($customerId <= 0) {
        throw new RuntimeException('id is required.');
    }

    nextCustomerProfileMetaFetch($pdo, $customerId);

    $hasNames = array_key_exists('names', $payload);
    $hasAcquisition = array_key_exists('acquisition_source', $payload);

    if (!$hasNames && !$hasAcquisition) {
        throw new RuntimeException('No writable field was supplied.');
    }

    $allowedNameTypes = [
        'nickname',
        'kashikoi',
        'okini_talk',
        'line',
        'x',
        'instagram',
    ];

    $allowedSourceTypes = [
        'heaven',
        'x',
        'instagram',
        'okini_talk',
        'store_site',
        'referral',
        'review',
        'store_route',
        'other',
        'unknown',
    ];

    $pdo->beginTransaction();

    if ($hasNames) {
        $names = $payload['names'];

        if (!is_array($names)) {
            throw new RuntimeException('names must be an object.');
        }

        foreach ($names as $nameType => $rawName) {
            if (!in_array($nameType, $allowedNameTypes, true)) {
                throw new RuntimeException('Invalid name_type.');
            }

            $name = trim((string) $rawName);

            $existingStatement = $pdo->prepare(
                "SELECT id, is_primary
                 FROM customer_names
                 WHERE customer_id = ? AND name_type = ?
                 ORDER BY is_primary DESC, id ASC
                 LIMIT 1"
            );
            $existingStatement->execute([$customerId, $nameType]);
            $existing = $existingStatement->fetch();

            if ($name === '') {
                if ($existing) {
                    $deleteStatement = $pdo->prepare(
                        'DELETE FROM customer_names WHERE id = ?'
                    );
                    $deleteStatement->execute([(int) $existing['id']]);
                }
                continue;
            }

            if ($existing) {
                $updateStatement = $pdo->prepare(
                    "UPDATE customer_names
                     SET name = ?, is_primary = ?,
                         updated_at = strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
                     WHERE id = ?"
                );
                $updateStatement->execute([
                    $name,
                    $nameType === 'nickname' ? 1 : (int) $existing['is_primary'],
                    (int) $existing['id'],
                ]);
                continue;
            }

            $insertStatement = $pdo->prepare(
                'INSERT INTO customer_names (customer_id, name_type, name, is_primary)
                 VALUES (?, ?, ?, ?)'
            );
            $insertStatement->execute([
                $customerId,
                $nameType,
                $name,
                $nameType === 'nickname' ? 1 : 0,
            ]);
        }
    }

    if ($hasAcquisition) {
        $source = $payload['acquisition_source'];

        if (!is_array($source)) {
            throw new RuntimeException('acquisition_source must be an object.');
        }

        $sourceType = trim((string) ($source['source_type'] ?? ''));
        $sourceDetail = trim((string) ($source['source_detail'] ?? ''));

        if (!in_array($sourceType, $allowedSourceTypes, true)) {
            throw new RuntimeException('Invalid acquisition source type.');
        }

        $existingSourceStatement = $pdo->prepare(
            'SELECT id FROM customer_acquisition_sources WHERE customer_id = ? LIMIT 1'
        );
        $existingSourceStatement->execute([$customerId]);
        $existingSource = $existingSourceStatement->fetch();

        if ($existingSource) {
            $saveSourceStatement = $pdo->prepare(
                "UPDATE customer_acquisition_sources
                 SET source_type = ?, source_detail = ?,
                     updated_at = strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
                 WHERE id = ?"
            );
            $saveSourceStatement->execute([
                $sourceType,
                $sourceDetail === '' ? null : $sourceDetail,
                (int) $existingSource['id'],
            ]);
        } else {
            $saveSourceStatement = $pdo->prepare(
                "INSERT INTO customer_acquisition_sources
                 (customer_id, source_type, source_detail, note, created_at, updated_at)
                 VALUES (?, ?, ?, NULL,
                    strftime('%Y-%m-%d %H:%M', 'now', 'localtime'),
                    strftime('%Y-%m-%d %H:%M', 'now', 'localtime'))"
            );
            $saveSourceStatement->execute([
                $customerId,
                $sourceType,
                $sourceDetail === '' ? null : $sourceDetail,
            ]);
        }
    }

    $touchStatement = $pdo->prepare(
        "UPDATE customers
         SET updated_at = strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
         WHERE id = ?"
    );
    $touchStatement->execute([$customerId]);

    $pdo->commit();

    echo json_encode(
        [
            'success' => true,
            'customer' => nextCustomerProfileMetaFetch($pdo, $customerId),
            'error' => null,
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
    );

} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if (http_response_code() < 400) {
        http_response_code(400);
    }

    echo json_encode(
        [
            'success' => false,
            'customer' => null,
            'error' => $error->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
    );
}
