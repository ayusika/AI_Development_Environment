<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This migration can only run from CLI.\n");
}

$databasePath = $argv[1] ?? '';
if ($databasePath === '' || !is_file($databasePath)) {
    fwrite(STDERR, "Database path is required and must exist.\n");
    exit(1);
}

$backupPath = $databasePath . '.backup-' . date('Ymd-His');
if (!copy($databasePath, $backupPath)) {
    fwrite(STDERR, "Database backup failed.\n");
    exit(1);
}

$pdo = new PDO('sqlite:' . $databasePath, null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
$pdo->exec('PRAGMA foreign_keys = ON');

try {
    $pdo->beginTransaction();
    $pdo->exec("CREATE TABLE IF NOT EXISTS heaven_diary_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_github_id INTEGER NOT NULL UNIQUE,
        settings_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime'))
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS heaven_diary_phrase_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_github_id INTEGER NOT NULL,
        business_date TEXT NOT NULL,
        phrase_id TEXT NOT NULL,
        category TEXT NOT NULL,
        used_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime'))
    )");
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_heaven_phrase_usage_owner_date ON heaven_diary_phrase_usage(owner_github_id, business_date)');
    $pdo->commit();
    echo "Migration completed successfully.\n";
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, "Migration failed: {$error->getMessage()}\nBackup: {$backupPath}\n");
    exit(1);
}
