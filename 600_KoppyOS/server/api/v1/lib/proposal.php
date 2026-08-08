<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Koppy Writer Proposal Helpers
|--------------------------------------------------------------------------
|
| Writer Proposalの生成と保存を共通化する。
|
| 通常Proposal APIと、
| Chunk Upload Finalize APIの両方から利用する。
|--------------------------------------------------------------------------
*/

function createWriterProposal(
    string $targetPath,
    string $operation,
    string $content,
    string $search,
    string $replaceWith,
    string $reason
): array {
    $createdAt =
        date(DATE_ATOM);

    $proposalSeed =
        $targetPath
        . '|'
        . $operation
        . '|'
        . $content
        . '|'
        . $search
        . '|'
        . $replaceWith
        . '|'
        . $createdAt
        . '|'
        . bin2hex(
            random_bytes(8)
        );

    $proposalId =
        substr(
            hash(
                'sha256',
                $proposalSeed
            ),
            0,
            16
        );

    return [
        'id' =>
            $proposalId,

        'status' =>
            'awaiting_approval',

        'target_path' =>
            $targetPath,

        'operation' =>
            $operation,

        'content' =>
            $operation === 'patch'
                ? null
                : $content,

        'search' =>
            $operation === 'patch'
                ? $search
                : null,

        'replace_with' =>
            $operation === 'patch'
                ? $replaceWith
                : null,

        'reason' =>
            $reason,

        'created_at' =>
            $createdAt,

        'approved_at' =>
            null,

        'executed_at' =>
            null,
    ];
}


function saveWriterProposal(
    array $proposal
): string {
    $documentRoot =
        $_SERVER['DOCUMENT_ROOT']
        ?? '';

    if ($documentRoot === '') {
        respondError(
            'DOCUMENT_ROOT is unavailable.',
            500
        );
    }

    $privateRoot =
        dirname(
            $documentRoot,
            2
        )
        . '/.koppy-private';

    $proposalDirectory =
        $privateRoot
        . '/proposals';

    if (!is_dir($proposalDirectory)) {
        respondError(
            'Proposal directory was not found.',
            500
        );
    }

    $proposalId =
        (string) (
            $proposal['id']
            ?? ''
        );

    if (
        !preg_match(
            '/^[a-f0-9]{16}$/',
            $proposalId
        )
    ) {
        respondError(
            'Invalid proposal id.',
            500
        );
    }

    $proposalPath =
        $proposalDirectory
        . '/'
        . $proposalId
        . '.json';

    $json =
        json_encode(
            $proposal,
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
            | JSON_PRETTY_PRINT
        );

    if ($json === false) {
        respondError(
            'Failed to encode proposal.',
            500
        );
    }

    $result =
        file_put_contents(
            $proposalPath,
            $json,
            LOCK_EX
        );

    if ($result === false) {
        respondError(
            'Failed to save proposal.',
            500
        );
    }

    return $proposalPath;
}