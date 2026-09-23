<?php

declare(strict_types=1);

require_once __DIR__
    . '/lib/response.php';

require_once __DIR__
    . '/../../auth/auth.php';


header(
    'Content-Type: application/json; charset=utf-8'
);

header(
    'Cache-Control: no-store'
);


date_default_timezone_set(
    'Asia/Tokyo'
);


koppyRequireApiAuth();
