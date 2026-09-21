<?php

declare(strict_types=1);


/*
 * Resolve a runtime path from an environment variable.
 *
 * Pro provides explicit paths through PHP-FPM.
 * Legacy Lolipop continues to use the existing fallback path.
 */
function koppyResolveRuntimePath(
    string $environmentVariable,
    string $legacyPath
): string {

    $configuredPath =
        getenv(
            $environmentVariable
        );


    if ($configuredPath !== false) {

        $configuredPath =
            trim(
                $configuredPath
            );


        if ($configuredPath !== '') {
            return $configuredPath;
        }
    }


    return $legacyPath;
}
