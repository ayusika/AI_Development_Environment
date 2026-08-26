<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

require_once
    __DIR__
    . '/lib/database.php';


$requestMethod =
    strtoupper(
        $_SERVER['REQUEST_METHOD']
        ?? 'GET'
    );


/* =========================================================
   Helpers
========================================================= */

function readHeavenDiaryJsonBody(): array
{
    $rawBody =
        file_get_contents(
            'php://input'
        );


    if (
        $rawBody === false
        || trim($rawBody) === ''
    ) {

        return [];
    }


    $payload =
        json_decode(
            $rawBody,
            true
        );


    if (!is_array($payload)) {

        respondError(
            'Invalid JSON body.',
            400
        );
    }


    return $payload;
}


function findHeavenDiaryVisit(
    PDO $pdo,
    int $visitId
): array {

    if ($visitId <= 0) {

        respondError(
            'visit_id must be a positive integer.',
            422
        );
    }


    $statement =
        $pdo->prepare(
            '
            SELECT
                id,
                customer_id

            FROM visits

            WHERE id = ?

            LIMIT 1
            '
        );


    $statement->execute([
        $visitId,
    ]);


    $visit =
        $statement->fetch();


    if (!$visit) {

        respondError(
            'Visit was not found.',
            404
        );
    }


    return $visit;
}


function fetchHeavenDiary(
    PDO $pdo,
    int $visitId
): ?array {

    $statement =
        $pdo->prepare(
            '
            SELECT
                id,
                visit_id,
                customer_id,
                body,
                source,
                platform,
                created_at,
                updated_at

            FROM heaven_diaries

            WHERE visit_id = ?

            LIMIT 1
            '
        );


    $statement->execute([
        $visitId,
    ]);


    $diary =
        $statement->fetch();


    return
        $diary
            ?: null;
}


/* =========================================================
   Database
========================================================= */

try {

    $pdo =
        koppyDatabase();


/* =========================================================
   GET
   予約に保存済みの日記を取得
========================================================= */

    if ($requestMethod === 'GET') {

        $visitId =
            isset(
                $_GET['visit_id']
            )
                ? (int)
                    $_GET['visit_id']
                : 0;


        findHeavenDiaryVisit(
            $pdo,
            $visitId
        );


        respondSuccess([
            'visit_id' =>
                $visitId,

            'diary' =>
                fetchHeavenDiary(
                    $pdo,
                    $visitId
                ),
        ]);
    }


/* =========================================================
   POST
   新規保存 / 上書き保存
========================================================= */

    if ($requestMethod === 'POST') {

        $payload =
            readHeavenDiaryJsonBody();


        $visitId =
            isset(
                $payload['visit_id']
            )
                ? (int)
                    $payload['visit_id']
                : 0;


        $body =
            trim(
                (string) (
                    $payload['body']
                    ?? ''
                )
            );


        $source =
            trim(
                (string) (
                    $payload['source']
                    ?? 'manual'
                )
            );


        if ($body === '') {

            respondError(
                '日記本文を入力してください。',
                422
            );
        }


        $allowedSources = [
            'manual',
            'ai',
            'ai_edited',
        ];


        if (
            !in_array(
                $source,
                $allowedSources,
                true
            )
        ) {

            respondError(
                'Invalid diary source.',
                422
            );
        }


        $visit =
            findHeavenDiaryVisit(
                $pdo,
                $visitId
            );


        $customerId =
            isset(
                $visit['customer_id']
            )
            && $visit['customer_id'] !== null
                ? (int)
                    $visit['customer_id']
                : null;


        $existingDiary =
            fetchHeavenDiary(
                $pdo,
                $visitId
            );


        if ($existingDiary) {

            $statement =
                $pdo->prepare(
                    '
                    UPDATE heaven_diaries

                    SET
                        customer_id = ?,
                        body = ?,
                        source = ?,
                        platform = \'heaven\',
                        updated_at = strftime(
                            \'%Y-%m-%d %H:%M\',
                            \'now\',
                            \'localtime\'
                        )

                    WHERE visit_id = ?
                    '
                );


            $statement->execute([
                $customerId,
                $body,
                $source,
                $visitId,
            ]);


        } else {

            $statement =
                $pdo->prepare(
                    '
                    INSERT INTO heaven_diaries (
                        visit_id,
                        customer_id,
                        body,
                        source,
                        platform
                    )

                    VALUES (
                        ?,
                        ?,
                        ?,
                        ?,
                        \'heaven\'
                    )
                    '
                );


            $statement->execute([
                $visitId,
                $customerId,
                $body,
                $source,
            ]);
        }


        respondSuccess([
            'visit_id' =>
                $visitId,

            'diary' =>
                fetchHeavenDiary(
                    $pdo,
                    $visitId
                ),
        ]);
    }


/* =========================================================
   Other methods
========================================================= */

    respondError(
        'Method not allowed.',
        405
    );


} catch (Throwable $error) {

    respondError(
        $error->getMessage(),
        500
    );
}