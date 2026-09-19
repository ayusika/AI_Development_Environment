<?php

if (
    defined('KOPPY_DATABASE_CONTEXT')
    && KOPPY_DATABASE_CONTEXT !== 'production'
) {
    throw new RuntimeException(
        'NEXT API database context conflict.'
    );
}

if (!defined('KOPPY_DATABASE_CONTEXT')) {
    define(
        'KOPPY_DATABASE_CONTEXT',
        'production'
    );
}
