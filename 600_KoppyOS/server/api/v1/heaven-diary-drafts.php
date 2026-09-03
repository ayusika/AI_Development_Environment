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

function readHeavenDiaryDraftJsonBody(): array
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


function findHeavenDiaryDraftVisit(
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
                id

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


function fetchHeavenDiaryDraft(
    PDO $pdo,
    int $visitId
): ?array {

    $statement =
        $pdo->prepare(
            '
            SELECT
                id,
                visit_id,
                body,
                note,
                extra_note,
                place,
                created_at,
                updated_at

            FROM heaven_diary_drafts

            WHERE visit_id = ?

            LIMIT 1
            '
        );


    $statement->execute([
        $visitId,
    ]);


    $draft =
        $statement->fetch();


    return
        $draft
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
   予約のクラウド下書きを取得
========================================================= */

    if ($requestMethod === 'GET') {

        $visitId =
            isset(
                $_GET['visit_id']
            )
                ? (int)
                    $_GET['visit_id']
                : 0;


        findHeavenDiaryDraftVisit(
            $pdo,
            $visitId
        );


        respondSuccess([
            'visit_id' =>
                $visitId,

            'draft' =>
                fetchHeavenDiaryDraft(
                    $pdo,
                    $visitId
                ),
        ]);
    }


/* =========================================================
   POST
   クラウド下書きを新規保存 / 上書き保存
========================================================= */

    if ($requestMethod === 'POST') {

        $payload =
            readHeavenDiaryDraftJsonBody();


        $visitId =
            isset(
                $payload['visit_id']
            )
                ? (int)
                    $payload['visit_id']
                : 0;


        $body =
            (string) (
                $payload['body']
                ?? ''
            );


        $note =
            (string) (
                $payload['note']
                ?? ''
            );


        $extraNote =
            (string) (
                $payload['extra_note']
                ?? ''
            );


        $place =
            trim(
                (string) (
                    $payload['place']
                    ?? 'hotel'
                )
            );


        if (
            trim($body) === ''
            && trim($note) === ''
            && trim($extraNote) === ''
        ) {

            respondError(
                '保存する下書きがありません。',
                422
            );
        }


        if (
            !in_array(
                $place,
                [
                    'hotel',
                    'room',
                ],
                true
            )
        ) {

            respondError(
                'Invalid diary place.',
                422
            );
        }


        findHeavenDiaryDraftVisit(
            $pdo,
            $visitId
        );


        $existingDraft =
            fetchHeavenDiaryDraft(
                $pdo,
                $visitId
            );


        if ($existingDraft) {

            $statement =
                $pdo->prepare(
                    '
                    UPDATE heaven_diary_drafts

                    SET
                        body = ?,
                        note = ?,
                        extra_note = ?,
                        place = ?,
                        updated_at = strftime(
                            \'%Y-%m-%d %H:%M\',
                            \'now\',
                            \'localtime\'
                        )

                    WHERE visit_id = ?
                    '
                );


            $statement->execute([
                $body,
                $note,
                $extraNote,
                $place,
                $visitId,
            ]);


        } else {

            $statement =
                $pdo->prepare(
                    '
                    INSERT INTO heaven_diary_drafts (
                        visit_id,
                        body,
                        note,
                        extra_note,
                        place
                    )

                    VALUES (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?
                    )
                    '
                );


            $statement->execute([
                $visitId,
                $body,
                $note,
                $extraNote,
                $place,
            ]);
        }


        respondSuccess([
            'visit_id' =>
                $visitId,

            'draft' =>
                fetchHeavenDiaryDraft(
                    $pdo,
                    $visitId
                ),
        ]);
    }


/* =========================================================
   DELETE
   予約のクラウド下書きを削除
========================================================= */

    if ($requestMethod === 'DELETE') {

        $visitId =
            isset(
                $_GET['visit_id']
            )
                ? (int)
                    $_GET['visit_id']
                : 0;


        findHeavenDiaryDraftVisit(
            $pdo,
            $visitId
        );


        $statement =
            $pdo->prepare(
                '
                DELETE FROM heaven_diary_drafts

                WHERE visit_id = ?
                '
            );


        $statement->execute([
            $visitId,
        ]);


        respondSuccess([
            'visit_id' =>
                $visitId,

            'deleted' =>
                true,
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