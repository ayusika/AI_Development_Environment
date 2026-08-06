<?php

header('Content-Type: text/plain; charset=utf-8');

echo "__DIR__\n";
echo __DIR__;

echo "\n\nDOCUMENT_ROOT\n";
echo $_SERVER['DOCUMENT_ROOT'] ?? '未取得';

echo "\n\nSCRIPT_FILENAME\n";
echo $_SERVER['SCRIPT_FILENAME'] ?? '未取得';
