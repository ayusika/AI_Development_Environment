<?php

declare(strict_types=1);

/*
 * Compatibility bridge.
 *
 * Kohaku Work owns the database round-trip test now.
 * Keep the legacy /api/v1 route available until the
 * Pro runtime cutover is complete.
 */

require_once __DIR__
    . '/../../../../060_Kohaku_Work/server/api/v1/database-test.php';
