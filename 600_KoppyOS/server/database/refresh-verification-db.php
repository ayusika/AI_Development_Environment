<?php

declare(strict_types=1);

function verificationRefreshFail(
    string $message,
    int $code = 2
): never {
    fwrite(
        STDERR,
        "FAIL CLOSED: {$message}\n"
    );

    exit($code);
}

if (PHP_SAPI !== 'cli') {
    verificationRefreshFail(
        'CLI execution is required.'
    );
}

$sourceArgument =
    (string) ($argv[1] ?? '');

$destinationArgument =
    (string) ($argv[2] ?? '');

if (
    $sourceArgument === ''
    || $destinationArgument === ''
) {
    verificationRefreshFail(
        'Usage: refresh-verification-db.php SOURCE DESTINATION'
    );
}

$sourcePath =
    realpath($sourceArgument);

if (
    $sourcePath === false
    || !is_file($sourcePath)
) {
    verificationRefreshFail(
        'Production source database was not found.'
    );
}

$destinationDirectory =
    dirname($destinationArgument);

if (!is_dir($destinationDirectory)) {
    verificationRefreshFail(
        'Verification database directory was not found.'
    );
}

$destinationDirectoryReal =
    realpath($destinationDirectory);

if ($destinationDirectoryReal === false) {
    verificationRefreshFail(
        'Verification database directory could not be resolved.'
    );
}

$destinationPath =
    $destinationDirectoryReal
    . DIRECTORY_SEPARATOR
    . basename($destinationArgument);

if (
    basename($sourcePath)
    !== 'kohaku-work.sqlite'
) {
    verificationRefreshFail(
        'Unexpected production database filename.'
    );
}

if (
    basename($destinationPath)
    !== 'kohaku-work-verification.sqlite'
) {
    verificationRefreshFail(
        'Unexpected verification database filename.'
    );
}

if ($sourcePath === $destinationPath) {
    verificationRefreshFail(
        'Source and destination must be different files.'
    );
}

$tempPath =
    $destinationPath
    . '.tmp-'
    . bin2hex(
        random_bytes(6)
    );

$previousPath =
    $destinationPath
    . '.previous';

$destinationMoved = false;

try {
    $sourcePdo =
        new PDO(
            'sqlite:' . $sourcePath,
            null,
            null,
            [
                PDO::ATTR_ERRMODE =>
                    PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE =>
                    PDO::FETCH_ASSOC,
            ]
        );

    $sourcePdo->exec(
        'PRAGMA busy_timeout = 10000'
    );

    $sourceIntegrity =
        (string) $sourcePdo
            ->query(
                'PRAGMA integrity_check'
            )
            ->fetchColumn();

    if ($sourceIntegrity !== 'ok') {
        throw new RuntimeException(
            'Production database integrity check failed.'
        );
    }

    $sourceVisitCount =
        (int) $sourcePdo
            ->query(
                'SELECT COUNT(*) FROM visits'
            )
            ->fetchColumn();

    $sourcePdo->exec(
        'VACUUM INTO '
        . $sourcePdo->quote($tempPath)
    );

    if (!is_file($tempPath)) {
        throw new RuntimeException(
            'Temporary verification snapshot was not created.'
        );
    }

    $verificationPdo =
        new PDO(
            'sqlite:' . $tempPath,
            null,
            null,
            [
                PDO::ATTR_ERRMODE =>
                    PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE =>
                    PDO::FETCH_ASSOC,
            ]
        );

    $verificationPdo->exec(
        'PRAGMA foreign_keys = ON'
    );

    $verificationIntegrity =
        (string) $verificationPdo
            ->query(
                'PRAGMA integrity_check'
            )
            ->fetchColumn();

    if ($verificationIntegrity !== 'ok') {
        throw new RuntimeException(
            'Verification snapshot integrity check failed.'
        );
    }

    $verificationVisitCount =
        (int) $verificationPdo
            ->query(
                'SELECT COUNT(*) FROM visits'
            )
            ->fetchColumn();

    if (
        $verificationVisitCount
        !== $sourceVisitCount
    ) {
        throw new RuntimeException(
            'Verification snapshot visit count does not match production.'
        );
    }

    $verificationPdo = null;
    $sourcePdo = null;

    if (is_file($previousPath)) {
        if (!unlink($previousPath)) {
            throw new RuntimeException(
                'Previous verification backup could not be removed.'
            );
        }
    }

    if (is_file($destinationPath)) {
        if (
            !rename(
                $destinationPath,
                $previousPath
            )
        ) {
            throw new RuntimeException(
                'Current verification database could not be preserved.'
            );
        }

        $destinationMoved = true;
    }

    if (
        !rename(
            $tempPath,
            $destinationPath
        )
    ) {
        throw new RuntimeException(
            'Verification snapshot could not be activated.'
        );
    }

    @chmod(
        $destinationPath,
        0600
    );

    clearstatcache(
        true,
        $destinationPath
    );

    fwrite(
        STDOUT,
        "Verification database refreshed.\n"
        . "visits={$verificationVisitCount}\n"
        . "bytes="
        . (string) filesize($destinationPath)
        . "\n"
    );

} catch (Throwable $error) {
    if (is_file($tempPath)) {
        @unlink($tempPath);
    }

    if (
        $destinationMoved
        && !is_file($destinationPath)
        && is_file($previousPath)
    ) {
        @rename(
            $previousPath,
            $destinationPath
        );
    }

    verificationRefreshFail(
        $error->getMessage()
    );
}
