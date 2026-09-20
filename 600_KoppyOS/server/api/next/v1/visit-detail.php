<?php

declare(strict_types=1);

/*
 * Compatibility bridge.
 *
 * Kohaku Work owns this implementation now.
 * Preserve the legacy /api/next/v1 route and its production
 * database context until the Pro runtime cutover is complete.
 */

require_once __DIR__ . '/_bootstrap.php';

require_once __DIR__
    . '/../../../../../060_Kohaku_Work/server/api/v1/visit-detail.php';
