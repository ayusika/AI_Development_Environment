<?php

declare(strict_types=1);

/*
 * Compatibility bridge.
 *
 * Kohaku Work owns the database adapter now.
 * Existing /api/v1 and /api/next/v1 endpoints may continue
 * requiring this legacy path until their repository move
 * and runtime routing are completed.
 */

require_once __DIR__
    . '/../../../../../060_Kohaku_Work/server/core/database.php';
