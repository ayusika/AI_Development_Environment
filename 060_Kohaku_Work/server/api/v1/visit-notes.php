<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../../../600_KoppyOS/server/auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/../../core/database.php';

function nextVisitNotesReadJsonBody(): array
{
    $rawBody = file_get_contents('php://input');

    if (
        $rawBody === false
        || trim($rawBody) === ''
    ) {
        return [];
    }

    $payload = json_decode(
        $rawBody,
        true
    );

    if (!is_array($payload)) {
        throw new RuntimeException(
            'Invalid JSON body.'
        );
    }

    return $payload;
}

function nextVisitNotesNullableText(
    array $payload,
    string $key
): ?string {
    if (!array_key_exists($key, $payload)) {
        throw new RuntimeException(
            $key . ' is required.'
        );
    }

    $value = trim(
        (string) ($payload[$key] ?? '')
    );

    return $value === ''
        ? null
        : $value;
}

try {
    $method =
        strtoupper(
            $_SERVER['REQUEST_METHOD']
            ?? 'GET'
        );

    if ($method !== 'PATCH') {
        http_response_code(405);

        throw new RuntimeException(
            'PATCH only.'
        );
    }

    $payload =
        nextVisitNotesReadJsonBody();

    $visitId =
        isset($payload['id'])
            ? (int) $payload['id']
            : 0;

    if ($visitId <= 0) {
        throw new RuntimeException(
            'id is required.'
        );
    }

    $customerFeatures =
        nextVisitNotesNullableText(
            $payload,
            'customer_features'
        );

    $conversationNotes =
        nextVisitNotesNullableText(
            $payload,
            'conversation_notes'
        );

    $visitNotes =
        nextVisitNotesNullableText(
            $payload,
            'visit_notes'
        );

    $pdo =
        koppyDatabase();

    $checkStatement =
        $pdo->prepare(
            "
            SELECT id
            FROM visits
            WHERE id = ?
            LIMIT 1
            "
        );

    $checkStatement->execute([
        $visitId,
    ]);

    if (!$checkStatement->fetch()) {
        http_response_code(404);

        throw new RuntimeException(
            'Visit was not found.'
        );
    }

    $statement =
        $pdo->prepare(
            "
            UPDATE visits

            SET
                customer_features = ?,
                conversation_notes = ?,
                visit_notes = ?,
                updated_at =
                    strftime(
                        '%Y-%m-%d %H:%M',
                        'now',
                        'localtime'
                    )

            WHERE id = ?
            "
        );

    $statement->execute([
        $customerFeatures,
        $conversationNotes,
        $visitNotes,
        $visitId,
    ]);

    $resultStatement =
        $pdo->prepare(
            "
            SELECT
                id,
                customer_features,
                conversation_notes,
                visit_notes,
                updated_at

            FROM visits

            WHERE id = ?

            LIMIT 1
            "
        );

    $resultStatement->execute([
        $visitId,
    ]);

    echo json_encode(
        [
            'success' => true,
            'visit' =>
                $resultStatement->fetch(),
            'error' => null,
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

} catch (Throwable $error) {
    if (http_response_code() < 400) {
        http_response_code(400);
    }

    echo json_encode(
        [
            'success' => false,
            'visit' => null,
            'error' =>
                $error->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );
}
