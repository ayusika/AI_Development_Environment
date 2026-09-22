<?php

declare(strict_types=1);


require_once __DIR__
    . '/../../../600_KoppyOS/server/auth/auth.php';


koppyRequirePageAuth(
    '/auth/login.php'
);


readfile(
    __DIR__ . '/index.html'
);