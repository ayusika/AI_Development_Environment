<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

header(
    'Cache-Control: no-store'
);


require_once
    __DIR__
    . '/../../auth/auth.php';

koppyRequireApiAuth();


require_once
    __DIR__
    . '/../../core/koppyos-database.php';


function globalMemoResponse(
    array $data,
    int $status = 200
): never {

    http_response_code(
        $status
    );

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

    exit;
}


function globalMemoBody(): array
{
    $raw =
        file_get_contents(
            'php://input'
        );

    if (
        $raw === false
        || trim($raw) === ''
    ) {
        return [];
    }


    $decoded =
        json_decode(
            $raw,
            true,
            512,
            JSON_THROW_ON_ERROR
        );


    if (!is_array($decoded)) {
        throw new RuntimeException(
            'JSON body must be an object.'
        );
    }


    return $decoded;
}


function globalMemoId(
    mixed $value,
    string $label
): int {

    $id =
        filter_var(
            $value,
            FILTER_VALIDATE_INT,
            [
                'options' => [
                    'min_range' => 1,
                ],
            ]
        );


    if ($id === false) {
        throw new RuntimeException(
            $label
            . ' is invalid.'
        );
    }


    return (int)
        $id;
}


function globalMemoString(
    mixed $value,
    string $label,
    int $maxBytes
): string {

    $text =
        (string)
        ($value ?? '');


    if (
        strlen($text)
        > $maxBytes
    ) {
        throw new RuntimeException(
            $label
            . ' is too long.'
        );
    }


    return $text;
}


function globalMemoState(
    PDO $pdo
): array {

    $buttons =
        $pdo
            ->query(
                '
                SELECT
                    id,
                    sort_order,
                    created_at,
                    updated_at

                FROM
                    koppy_global_memo_buttons

                ORDER BY
                    sort_order ASC,
                    id ASC
                '
            )
            ->fetchAll();


    $pages =
        $pdo
            ->query(
                '
                SELECT
                    id,
                    button_id,
                    title,
                    content,
                    sort_order,
                    created_at,
                    updated_at

                FROM
                    koppy_global_memo_pages

                ORDER BY
                    button_id ASC,
                    sort_order ASC,
                    id ASC
                '
            )
            ->fetchAll();


    $pagesByButton = [];


    foreach ($pages as $page) {

        $buttonId =
            (int)
            $page['button_id'];


        $pagesByButton[
            $buttonId
        ][] = [
            'id' =>
                (int)
                $page['id'],

            'button_id' =>
                $buttonId,

            'title' =>
                (string)
                $page['title'],

            'content' =>
                (string)
                $page['content'],

            'sort_order' =>
                (int)
                $page['sort_order'],

            'created_at' =>
                (string)
                $page['created_at'],

            'updated_at' =>
                (string)
                $page['updated_at'],
        ];
    }


    $result = [];


    foreach ($buttons as $button) {

        $buttonId =
            (int)
            $button['id'];


        $result[] = [
            'id' =>
                $buttonId,

            'sort_order' =>
                (int)
                $button['sort_order'],

            'created_at' =>
                (string)
                $button['created_at'],

            'updated_at' =>
                (string)
                $button['updated_at'],

            'pages' =>
                $pagesByButton[
                    $buttonId
                ]
                ?? [],
        ];
    }


    return $result;
}


function globalMemoPage(
    PDO $pdo,
    int $pageId
): array {

    $statement =
        $pdo->prepare(
            '
            SELECT
                id,
                button_id,
                title,
                content,
                sort_order,
                created_at,
                updated_at

            FROM
                koppy_global_memo_pages

            WHERE
                id = ?
            '
        );


    $statement->execute([
        $pageId,
    ]);


    $page =
        $statement->fetch();


    if (!is_array($page)) {
        throw new RuntimeException(
            'Memo page was not found.'
        );
    }


    return [
        'id' =>
            (int)
            $page['id'],

        'button_id' =>
            (int)
            $page['button_id'],

        'title' =>
            (string)
            $page['title'],

        'content' =>
            (string)
            $page['content'],

        'sort_order' =>
            (int)
            $page['sort_order'],

        'created_at' =>
            (string)
            $page['created_at'],

        'updated_at' =>
            (string)
            $page['updated_at'],
    ];
}


try {

    $pdo =
        koppyOsDatabase();


    $method =
        strtoupper(
            $_SERVER[
                'REQUEST_METHOD'
            ]
            ?? 'GET'
        );


    if ($method === 'GET') {

        globalMemoResponse([
            'success' =>
                true,

            'buttons' =>
                globalMemoState(
                    $pdo
                ),

            'error' =>
                null,
        ]);
    }


    if ($method === 'POST') {

        $body =
            globalMemoBody();


        $action =
            (string)
            (
                $body['action']
                ?? ''
            );


        if (
            $action
            === 'create_button'
        ) {

            $count =
                (int)
                $pdo
                    ->query(
                        '
                        SELECT COUNT(*)
                        FROM koppy_global_memo_buttons
                        '
                    )
                    ->fetchColumn();


            if ($count >= 12) {
                throw new RuntimeException(
                    'Memo button limit reached.'
                );
            }


            $pdo->beginTransaction();


            $sortOrder =
                (int)
                $pdo
                    ->query(
                        '
                        SELECT
                            COALESCE(
                                MAX(sort_order),
                                -1
                            )
                            + 1

                        FROM
                            koppy_global_memo_buttons
                        '
                    )
                    ->fetchColumn();


            $statement =
                $pdo->prepare(
                    '
                    INSERT INTO
                        koppy_global_memo_buttons(
                            sort_order
                        )
                    VALUES (?)
                    '
                );


            $statement->execute([
                $sortOrder,
            ]);


            $buttonId =
                (int)
                $pdo->lastInsertId();


            $statement =
                $pdo->prepare(
                    '
                    INSERT INTO
                        koppy_global_memo_pages(
                            button_id,
                            title,
                            content,
                            sort_order
                        )
                    VALUES (
                        ?,
                        ?,
                        \'\',
                        0
                    )
                    '
                );


            $statement->execute([
                $buttonId,
                'メモ 1',
            ]);


            $pageId =
                (int)
                $pdo->lastInsertId();


            $pdo->commit();


            globalMemoResponse([
                'success' =>
                    true,

                'buttons' =>
                    globalMemoState(
                        $pdo
                    ),

                'created_button_id' =>
                    $buttonId,

                'created_page_id' =>
                    $pageId,

                'error' =>
                    null,
            ]);
        }


        if (
            $action
            === 'create_page'
        ) {

            $buttonId =
                globalMemoId(
                    $body['button_id']
                    ?? null,
                    'button_id'
                );


            $statement =
                $pdo->prepare(
                    '
                    SELECT COUNT(*)
                    FROM koppy_global_memo_buttons
                    WHERE id = ?
                    '
                );

            $statement->execute([
                $buttonId,
            ]);


            if (
                (int)
                $statement->fetchColumn()
                !== 1
            ) {
                throw new RuntimeException(
                    'Memo button was not found.'
                );
            }


            $statement =
                $pdo->prepare(
                    '
                    SELECT COUNT(*)
                    FROM koppy_global_memo_pages
                    WHERE button_id = ?
                    '
                );

            $statement->execute([
                $buttonId,
            ]);


            $pageCount =
                (int)
                $statement->fetchColumn();


            if ($pageCount >= 20) {
                throw new RuntimeException(
                    'Memo page limit reached.'
                );
            }


            $statement =
                $pdo->prepare(
                    '
                    SELECT
                        COALESCE(
                            MAX(sort_order),
                            -1
                        )
                        + 1

                    FROM
                        koppy_global_memo_pages

                    WHERE
                        button_id = ?
                    '
                );

            $statement->execute([
                $buttonId,
            ]);


            $sortOrder =
                (int)
                $statement->fetchColumn();


            $statement =
                $pdo->prepare(
                    '
                    INSERT INTO
                        koppy_global_memo_pages(
                            button_id,
                            title,
                            content,
                            sort_order
                        )
                    VALUES (
                        ?,
                        ?,
                        \'\',
                        ?
                    )
                    '
                );


            $statement->execute([
                $buttonId,
                'メモ '
                    . (
                        $pageCount
                        + 1
                    ),
                $sortOrder,
            ]);


            $pageId =
                (int)
                $pdo->lastInsertId();


            globalMemoResponse([
                'success' =>
                    true,

                'buttons' =>
                    globalMemoState(
                        $pdo
                    ),

                'created_button_id' =>
                    $buttonId,

                'created_page_id' =>
                    $pageId,

                'error' =>
                    null,
            ]);
        }


        throw new RuntimeException(
            'Unknown memo action.'
        );
    }


    if ($method === 'PATCH') {

        $body =
            globalMemoBody();


        $pageId =
            globalMemoId(
                $body['page_id']
                ?? null,
                'page_id'
            );


        $title =
            trim(
                globalMemoString(
                    $body['title']
                    ?? '',
                    'title',
                    240
                )
            );


        if ($title === '') {
            $title =
                'メモ';
        }


        $content =
            globalMemoString(
                $body['content']
                ?? '',
                'content',
                50000
            );


        $statement =
            $pdo->prepare(
                '
                UPDATE
                    koppy_global_memo_pages

                SET
                    title = ?,
                    content = ?,
                    updated_at = CURRENT_TIMESTAMP

                WHERE
                    id = ?
                '
            );


        $statement->execute([
            $title,
            $content,
            $pageId,
        ]);


        if (
            $statement->rowCount()
            !== 1
        ) {

            $check =
                $pdo->prepare(
                    '
                    SELECT COUNT(*)
                    FROM koppy_global_memo_pages
                    WHERE id = ?
                    '
                );

            $check->execute([
                $pageId,
            ]);


            if (
                (int)
                $check->fetchColumn()
                !== 1
            ) {
                throw new RuntimeException(
                    'Memo page was not found.'
                );
            }
        }


        globalMemoResponse([
            'success' =>
                true,

            'page' =>
                globalMemoPage(
                    $pdo,
                    $pageId
                ),

            'error' =>
                null,
        ]);
    }


    if ($method === 'DELETE') {

        $body =
            globalMemoBody();


        $action =
            (string)
            (
                $body['action']
                ?? ''
            );


        if (
            $action
            === 'delete_page'
        ) {

            $pageId =
                globalMemoId(
                    $body['page_id']
                    ?? null,
                    'page_id'
                );


            $pdo->beginTransaction();


            $statement =
                $pdo->prepare(
                    '
                    SELECT
                        button_id

                    FROM
                        koppy_global_memo_pages

                    WHERE
                        id = ?
                    '
                );


            $statement->execute([
                $pageId,
            ]);


            $page =
                $statement->fetch();


            if (!is_array($page)) {
                throw new RuntimeException(
                    'Memo page was not found.'
                );
            }


            $buttonId =
                (int)
                $page['button_id'];


            $statement =
                $pdo->prepare(
                    '
                    SELECT COUNT(*)

                    FROM
                        koppy_global_memo_pages

                    WHERE
                        button_id = ?
                    '
                );


            $statement->execute([
                $buttonId,
            ]);


            $pageCount =
                (int)
                $statement->fetchColumn();


            if ($pageCount <= 1) {
                throw new RuntimeException(
                    '最後のメモは削除できません。'
                );
            }


            $statement =
                $pdo->prepare(
                    '
                    DELETE FROM
                        koppy_global_memo_pages

                    WHERE
                        id = ?
                    '
                );


            $statement->execute([
                $pageId,
            ]);


            if (
                $statement->rowCount()
                !== 1
            ) {
                throw new RuntimeException(
                    'Memo page delete failed.'
                );
            }


            $pdo->commit();


            globalMemoResponse([
                'success' =>
                    true,

                'buttons' =>
                    globalMemoState(
                        $pdo
                    ),

                'deleted_page_id' =>
                    $pageId,

                'button_id' =>
                    $buttonId,

                'error' =>
                    null,
            ]);
        }


        if (
            $action
            === 'delete_button'
        ) {

            $buttonId =
                globalMemoId(
                    $body['button_id']
                    ?? null,
                    'button_id'
                );


            $pdo->beginTransaction();


            $buttonCount =
                (int)
                $pdo
                    ->query(
                        '
                        SELECT COUNT(*)
                        FROM koppy_global_memo_buttons
                        '
                    )
                    ->fetchColumn();


            if ($buttonCount <= 1) {
                throw new RuntimeException(
                    '最後のメモボタンは削除できません。'
                );
            }


            $statement =
                $pdo->prepare(
                    '
                    SELECT COUNT(*)

                    FROM
                        koppy_global_memo_buttons

                    WHERE
                        id = ?
                    '
                );


            $statement->execute([
                $buttonId,
            ]);


            if (
                (int)
                $statement->fetchColumn()
                !== 1
            ) {
                throw new RuntimeException(
                    'Memo button was not found.'
                );
            }


            $statement =
                $pdo->prepare(
                    '
                    DELETE FROM
                        koppy_global_memo_buttons

                    WHERE
                        id = ?
                    '
                );


            $statement->execute([
                $buttonId,
            ]);


            if (
                $statement->rowCount()
                !== 1
            ) {
                throw new RuntimeException(
                    'Memo button delete failed.'
                );
            }


            $pdo->commit();


            globalMemoResponse([
                'success' =>
                    true,

                'buttons' =>
                    globalMemoState(
                        $pdo
                    ),

                'deleted_button_id' =>
                    $buttonId,

                'error' =>
                    null,
            ]);
        }


        throw new RuntimeException(
            'Unknown memo delete action.'
        );
    }


    globalMemoResponse(
        [
            'success' =>
                false,

            'error' =>
                'Method not allowed.',
        ],
        405
    );


} catch (Throwable $error) {

    if (
        isset($pdo)
        && $pdo instanceof PDO
        && $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }


    globalMemoResponse(
        [
            'success' =>
                false,

            'error' =>
                $error->getMessage(),
        ],
        400
    );
}
