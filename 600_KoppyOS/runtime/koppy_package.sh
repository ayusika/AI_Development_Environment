#!/usr/bin/env bash

# Koppy Package Utility
# Runtime Source of Truth
# Version: 0.2.0
#
# Safe to source from ~/.bashrc:
# this file intentionally does not change caller shell options.

KPACKAGE_RUNTIME_VERSION="0.2.0"

_kpackage_help() {
  cat <<'EOF'
Koppy Package Utility 0.2.0

Implemented:
  kpackage inspect <package.zip>
      Read-only ZIP inspection. Does not extract or modify the repository.

  kpackage stage <package.zip>
      Safely extracts a PASS package to a repository-external session.
      Does not modify repository files.

Other package commands are not implemented yet.

  kpackage version
  kpackage help
EOF
}

_kpackage_inspect() {
  local package="${1:-}"

  if [ -z "$package" ]; then
    echo "Usage: kpackage inspect <package.zip>"
    return 1
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "===== KPACKAGE INSPECT ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: python3 is required but was not found."
    echo
    echo "===== END KPACKAGE INSPECT ====="
    return 1
  fi

  python3 - "$package" <<'PY'
from __future__ import annotations

import hashlib
import os
import pathlib
import re
import stat
import sys
import zipfile

package_arg = sys.argv[1]
path = pathlib.Path(package_arg).expanduser()

MAX_DISPLAY_ENTRIES = 200
MAX_DISPLAY_FINDINGS = 50
LARGE_ENTRY_BYTES = 100 * 1024 * 1024
LARGE_TOTAL_BYTES = 500 * 1024 * 1024
HIGH_RATIO_MIN_BYTES = 10 * 1024 * 1024
HIGH_RATIO = 1000.0
HIGH_ENTRY_COUNT = 10000

def safe_display(value: object) -> str:
    # repr() preserves ordinary Unicode while escaping newlines, tabs,
    # ESC and other non-printable characters before Terminal output.
    return repr(str(value))

def has_control_or_format(value: str) -> bool:
    import unicodedata
    return any(unicodedata.category(ch) in {"Cc", "Cf"} for ch in value)

def finish_block(reason: str) -> int:
    print("===== KPACKAGE INSPECT =====")
    print()
    print("Result: BLOCK")
    print(f"Reason: {reason}")
    print()
    print("No files were extracted.")
    print("===== END KPACKAGE INSPECT =====")
    return 1

try:
    resolved = path.resolve(strict=True)
except FileNotFoundError:
    raise SystemExit(finish_block(f"Package not found: {safe_display(path)}"))
except OSError as exc:
    raise SystemExit(finish_block(f"Cannot resolve package path: {safe_display(exc)}"))

if not resolved.is_file():
    raise SystemExit(finish_block(f"Package is not a regular file: {safe_display(resolved)}"))

if resolved.suffix.lower() != ".zip":
    raise SystemExit(finish_block("Phase 1 supports ZIP packages only."))

sha256 = hashlib.sha256()
try:
    with resolved.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            sha256.update(chunk)
except OSError as exc:
    raise SystemExit(finish_block(f"Cannot read package: {safe_display(exc)}"))

try:
    archive = zipfile.ZipFile(resolved, "r")
except (zipfile.BadZipFile, OSError) as exc:
    raise SystemExit(finish_block(f"Invalid ZIP package: {safe_display(exc)}"))

blocks: list[str] = []
warnings: list[str] = []
entry_rows: list[tuple[str, int, str]] = []
top_levels: set[str] = set()
canonical_seen: dict[str, str] = {}

secret_exact = {
    ".env", ".npmrc", ".pypirc", "credentials", "credentials.json",
    "secrets", "secrets.json", "id_rsa", "id_ed25519", "id_ecdsa",
    "id_dsa", "known_hosts", "authorized_keys",
}
secret_extensions = {".pem", ".p12", ".pfx", ".key", ".keystore"}
secret_terms = (
    "secret", "credential", "api_key", "apikey", "private_key",
    "private-key", "access_token", "refresh_token",
)

file_count = 0
dir_count = 0
total_uncompressed = 0

try:
    infos = archive.infolist()

    if not infos:
        warnings.append("Package contains no entries.")

    if len(infos) > HIGH_ENTRY_COUNT:
        warnings.append(
            f"High entry count: {len(infos)} entries "
            f"(review threshold: {HIGH_ENTRY_COUNT})."
        )

    for info in infos:
        raw = info.filename
        slash = raw.replace("\\", "/")
        parts_all = slash.split("/")
        parts = [p for p in parts_all if p not in ("", ".")]
        is_dir = info.is_dir() or slash.endswith("/")

        if parts:
            top_levels.add(parts[0])

        if has_control_or_format(raw):
            blocks.append(
                f"Control/format character in path: {safe_display(raw)}"
            )

        # Detect absolute / rooted path forms without changing the package path.
        if (
            raw.startswith("/")
            or raw.startswith("\\")
            or slash.startswith("//")
            or re.match(r"^[A-Za-z]:[\\/]", raw)
        ):
            blocks.append(f"Absolute/rooted path: {safe_display(raw)}")

        if ".." in parts:
            blocks.append(f"Path traversal component '..': {safe_display(raw)}")

        if any(p.casefold() == ".git" for p in parts):
            blocks.append(f"Git metadata path: {safe_display(raw)}")

        mode = (info.external_attr >> 16) & 0xFFFF
        if mode and stat.S_ISLNK(mode):
            blocks.append(f"Symlink entry: {safe_display(raw)}")

        if info.flag_bits & 0x1:
            blocks.append(f"Encrypted entry: {safe_display(raw)}")

        # Collision detection is safety-only. The original path is never rewritten.
        canonical_parts = [p for p in parts if p]
        canonical = "/".join(canonical_parts).casefold()
        if canonical:
            previous = canonical_seen.get(canonical)
            if previous is not None:
                blocks.append(f"Duplicate/colliding path: {safe_display(previous)} <-> {safe_display(raw)}")
            else:
                canonical_seen[canonical] = raw

        if is_dir:
            dir_count += 1
            entry_rows.append(("DIR", 0, raw))
            continue

        file_count += 1
        total_uncompressed += info.file_size
        entry_rows.append(("FILE", info.file_size, raw))

        basename = pathlib.PurePosixPath(slash).name.casefold()
        suffix = pathlib.PurePosixPath(slash).suffix.casefold()
        secret_candidate = (
            basename in secret_exact
            or suffix in secret_extensions
            or any(term in basename for term in secret_terms)
        )
        if secret_candidate:
            warnings.append(f"Secret/credential filename candidate: {safe_display(raw)}")

        if info.file_size > LARGE_ENTRY_BYTES:
            warnings.append(
                f"Large entry: {safe_display(raw)} ({info.file_size} bytes; "
                f"review threshold: {LARGE_ENTRY_BYTES})."
            )

        if info.file_size >= HIGH_RATIO_MIN_BYTES:
            compressed = max(info.compress_size, 1)
            ratio = info.file_size / compressed
            if ratio >= HIGH_RATIO:
                warnings.append(
                    f"High compression ratio: {safe_display(raw)} "
                    f"({ratio:.1f}x; review threshold: {HIGH_RATIO:.0f}x)."
                )

    if total_uncompressed > LARGE_TOTAL_BYTES:
        warnings.append(
            f"Large total uncompressed size: {total_uncompressed} bytes "
            f"(review threshold: {LARGE_TOTAL_BYTES})."
        )

finally:
    archive.close()

def unique_preserve(items: list[str]) -> list[str]:
    seen = set()
    out = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out

blocks = unique_preserve(blocks)
warnings = unique_preserve(warnings)

if blocks:
    result = "BLOCK"
    exit_code = 1
elif warnings:
    result = "REVIEW"
    exit_code = 2
else:
    result = "PASS"
    exit_code = 0

print("===== KPACKAGE INSPECT =====")
print()
print("■ PACKAGE")
print(f"Path: {safe_display(resolved)}")
print("Format: ZIP")
print(f"SHA256: {sha256.hexdigest()}")
print()
print("■ SUMMARY")
print(f"Entries: {len(entry_rows)}")
print(f"Files: {file_count}")
print(f"Directories: {dir_count}")
print(f"Total uncompressed bytes: {total_uncompressed}")
print(f"Top-level roots: {', '.join(safe_display(x) for x in sorted(top_levels)) if top_levels else '(none)'}")
print()
print("■ ENTRY PATHS")
for kind, size, raw in entry_rows[:MAX_DISPLAY_ENTRIES]:
    if kind == "DIR":
        print(f"DIR   {safe_display(raw)}")
    else:
        print(f"FILE  {size:>12}  {safe_display(raw)}")
if len(entry_rows) > MAX_DISPLAY_ENTRIES:
    print(
        f"... {len(entry_rows) - MAX_DISPLAY_ENTRIES} more entries inspected "
        "but omitted from display."
    )

if blocks:
    print()
    print("■ BLOCK FINDINGS")
    for item in blocks[:MAX_DISPLAY_FINDINGS]:
        print(f"- {item}")
    if len(blocks) > MAX_DISPLAY_FINDINGS:
        print(f"- ... {len(blocks) - MAX_DISPLAY_FINDINGS} more block findings")

if warnings:
    print()
    print("■ REVIEW FINDINGS")
    for item in warnings[:MAX_DISPLAY_FINDINGS]:
        print(f"- {item}")
    if len(warnings) > MAX_DISPLAY_FINDINGS:
        print(f"- ... {len(warnings) - MAX_DISPLAY_FINDINGS} more review findings")

print()
print("■ RESULT")
print(f"Result: {result}")
if result == "PASS":
    print("No blocking or review findings detected by Phase 1 metadata inspection.")
elif result == "REVIEW":
    print("Manual Koppy/user review is required before future staging.")
else:
    print("Do not stage or apply this package.")
print("No files were extracted.")
print("Package contents were not printed.")
print()
print("===== END KPACKAGE INSPECT =====")

raise SystemExit(exit_code)
PY
}


_kpackage_stage() {
  local package="${1:-}"
  local repo_root branch head status_output expected_sha session_root
  local inspect_rc

  if [ -z "$package" ]; then
    echo "Usage: kpackage stage <package.zip>"
    return 1
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "===== KPACKAGE STAGE ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: python3 is required but was not found."
    echo
    echo "===== END KPACKAGE STAGE ====="
    return 1
  fi

  repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  if [ -z "$repo_root" ]; then
    echo "===== KPACKAGE STAGE ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: current directory is not inside a Git repository."
    echo
    echo "===== END KPACKAGE STAGE ====="
    return 1
  fi

  branch="$(git -C "$repo_root" branch --show-current 2>/dev/null || true)"
  if [ -z "$branch" ]; then
    echo "===== KPACKAGE STAGE ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: detached HEAD is not supported for Stage."
    echo
    echo "===== END KPACKAGE STAGE ====="
    return 1
  fi

  head="$(git -C "$repo_root" rev-parse HEAD 2>/dev/null || true)"
  if [ -z "$head" ]; then
    echo "===== KPACKAGE STAGE ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: repository HEAD could not be resolved."
    echo
    echo "===== END KPACKAGE STAGE ====="
    return 1
  fi

  status_output="$(git -C "$repo_root" status --porcelain=v1 --untracked-files=all 2>/dev/null || true)"
  if [ -n "$status_output" ]; then
    echo "===== KPACKAGE STAGE ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: worktree must be clean before creating a Stage session."
    echo "Use kclip review / kclip preflight to inspect the current state."
    echo
    echo "===== END KPACKAGE STAGE ====="
    return 1
  fi

  expected_sha="$(
    python3 - "$package" <<'PY'
import hashlib
import pathlib
import sys

path = pathlib.Path(sys.argv[1]).expanduser()
try:
    resolved = path.resolve(strict=True)
except OSError:
    raise SystemExit(1)

if not resolved.is_file():
    raise SystemExit(1)

digest = hashlib.sha256()
with resolved.open("rb") as fh:
    for chunk in iter(lambda: fh.read(1024 * 1024), b""):
        digest.update(chunk)
print(digest.hexdigest())
PY
  )" || {
    echo "===== KPACKAGE STAGE ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: package could not be hashed before inspection."
    echo
    echo "===== END KPACKAGE STAGE ====="
    return 1
  }

  _kpackage_inspect "$package"
  inspect_rc=$?

  if [ "$inspect_rc" -eq 2 ]; then
    echo
    echo "===== KPACKAGE STAGE ====="
    echo
    echo "Result: REVIEW"
    echo "Reason: Phase 2 Stage accepts PASS packages only."
    echo "No Stage session was created."
    echo "===== END KPACKAGE STAGE ====="
    return 2
  fi

  if [ "$inspect_rc" -ne 0 ]; then
    echo
    echo "===== KPACKAGE STAGE ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: package inspection did not pass."
    echo "No Stage session was created."
    echo "===== END KPACKAGE STAGE ====="
    return 1
  fi

  session_root="${KPACKAGE_SESSION_ROOT:-$HOME/.koppy/package_sessions}"

  python3 - "$package" "$expected_sha" "$repo_root" "$branch" "$head" "$session_root" "$KPACKAGE_RUNTIME_VERSION" <<'PY'
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import secrets
import shutil
import stat
import sys
import unicodedata
import zipfile

package_arg, expected_sha, repo_arg, branch, head, session_root_arg, runtime_version = sys.argv[1:]

LARGE_ENTRY_BYTES = 100 * 1024 * 1024
LARGE_TOTAL_BYTES = 500 * 1024 * 1024
HIGH_RATIO_MIN_BYTES = 10 * 1024 * 1024
HIGH_RATIO = 1000.0
HIGH_ENTRY_COUNT = 10000

secret_exact = {
    ".env", ".npmrc", ".pypirc", "credentials", "credentials.json",
    "secrets", "secrets.json", "id_rsa", "id_ed25519", "id_ecdsa",
    "id_dsa", "known_hosts", "authorized_keys",
}
secret_extensions = {".pem", ".p12", ".pfx", ".key", ".keystore"}
secret_terms = (
    "secret", "credential", "api_key", "apikey", "private_key",
    "private-key", "access_token", "refresh_token",
)

def safe_display(value: object) -> str:
    return repr(str(value))

def has_control_or_format(value: str) -> bool:
    return any(unicodedata.category(ch) in {"Cc", "Cf"} for ch in value)

def sha256_file(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def is_within(path: pathlib.Path, root: pathlib.Path) -> bool:
    try:
        return os.path.commonpath([str(path), str(root)]) == str(root)
    except ValueError:
        return False

def block(reason: str, cleanup: pathlib.Path | None = None) -> int:
    if cleanup is not None:
        shutil.rmtree(cleanup, ignore_errors=True)
    print("===== KPACKAGE STAGE =====")
    print()
    print("Result: BLOCK")
    print(f"Reason: {reason}")
    print("No repository files were modified.")
    print("No complete Stage session was created.")
    print()
    print("===== END KPACKAGE STAGE =====")
    return 1

try:
    package = pathlib.Path(package_arg).expanduser().resolve(strict=True)
except OSError as exc:
    raise SystemExit(block(f"Package path could not be resolved: {safe_display(exc)}"))

try:
    repo = pathlib.Path(repo_arg).resolve(strict=True)
except OSError as exc:
    raise SystemExit(block(f"Repository path could not be resolved: {safe_display(exc)}"))

session_root = pathlib.Path(session_root_arg).expanduser()
try:
    session_root_resolved = session_root.resolve(strict=False)
except OSError as exc:
    raise SystemExit(block(f"Session root could not be resolved: {safe_display(exc)}"))

if not package.is_file():
    raise SystemExit(block("Package is not a regular file."))

if package.suffix.lower() != ".zip":
    raise SystemExit(block("Phase 2 Stage supports ZIP packages only."))

if is_within(package, repo):
    raise SystemExit(block("Package must be outside the repository."))

if is_within(session_root_resolved, repo) or is_within(repo, session_root_resolved):
    raise SystemExit(block("Session root must be separate from the repository."))

if is_within(package, session_root_resolved):
    raise SystemExit(block("Package must be outside the Session root."))

actual_sha = sha256_file(package)
if actual_sha != expected_sha:
    raise SystemExit(block("Package changed after inspection. Hash mismatch."))

try:
    archive = zipfile.ZipFile(package, "r")
except (zipfile.BadZipFile, OSError) as exc:
    raise SystemExit(block(f"Invalid ZIP package: {safe_display(exc)}"))

blocks: list[str] = []
warnings: list[str] = []
canonical_seen: dict[str, str] = {}
file_infos: list[tuple[zipfile.ZipInfo, list[str], int | None]] = []
directory_paths: list[str] = []
total_uncompressed = 0

try:
    infos = archive.infolist()

    if not infos:
        warnings.append("Package contains no entries.")

    if len(infos) > HIGH_ENTRY_COUNT:
        warnings.append(f"High entry count: {len(infos)}")

    for info in infos:
        raw = info.filename

        if not raw:
            blocks.append("Empty ZIP entry path.")
            continue

        if has_control_or_format(raw):
            blocks.append(f"Control/format character in path: {safe_display(raw)}")

        if "\\" in raw:
            blocks.append(f"Backslash path is not accepted for Stage: {safe_display(raw)}")

        if raw.startswith("/") or re.match(r"^[A-Za-z]:/", raw):
            blocks.append(f"Absolute/rooted path: {safe_display(raw)}")

        is_dir = info.is_dir() or raw.endswith("/")
        logical = raw[:-1] if is_dir and raw.endswith("/") else raw
        parts = logical.split("/") if logical else []

        if not parts or any(part == "" for part in parts):
            blocks.append(f"Empty path component: {safe_display(raw)}")
            continue

        if any(part == "." for part in parts):
            blocks.append(f"Dot path component is not accepted: {safe_display(raw)}")

        if any(part == ".." for part in parts):
            blocks.append(f"Path traversal component '..': {safe_display(raw)}")

        if any(part.casefold() == ".git" for part in parts):
            blocks.append(f"Git metadata path: {safe_display(raw)}")

        if len(raw.encode("utf-8")) > 4096:
            blocks.append(f"Path exceeds 4096 UTF-8 bytes: {safe_display(raw)}")

        for part in parts:
            if len(part.encode("utf-8")) > 255:
                blocks.append(f"Path component exceeds 255 UTF-8 bytes: {safe_display(raw)}")
                break

        mode = (info.external_attr >> 16) & 0xFFFF
        if mode and stat.S_ISLNK(mode):
            blocks.append(f"Symlink entry: {safe_display(raw)}")

        if mode:
            file_type = stat.S_IFMT(mode)
            if file_type and not (stat.S_ISREG(mode) or stat.S_ISDIR(mode)):
                blocks.append(f"Special file entry: {safe_display(raw)}")

        if info.flag_bits & 0x1:
            blocks.append(f"Encrypted entry: {safe_display(raw)}")

        canonical = unicodedata.normalize("NFC", "/".join(parts)).casefold()
        previous = canonical_seen.get(canonical)
        if previous is not None:
            blocks.append(
                f"Duplicate/colliding path: {safe_display(previous)} <-> {safe_display(raw)}"
            )
        else:
            canonical_seen[canonical] = raw

        if is_dir:
            directory_paths.append("/".join(parts))
            continue

        total_uncompressed += info.file_size

        basename = pathlib.PurePosixPath("/".join(parts)).name.casefold()
        suffix = pathlib.PurePosixPath("/".join(parts)).suffix.casefold()
        if (
            basename in secret_exact
            or suffix in secret_extensions
            or any(term in basename for term in secret_terms)
        ):
            warnings.append(f"Secret/credential filename candidate: {safe_display(raw)}")

        if info.file_size > LARGE_ENTRY_BYTES:
            warnings.append(f"Large entry: {safe_display(raw)}")

        if info.file_size >= HIGH_RATIO_MIN_BYTES:
            compressed = max(info.compress_size, 1)
            ratio = info.file_size / compressed
            if ratio >= HIGH_RATIO:
                warnings.append(f"High compression ratio: {safe_display(raw)}")

        archive_mode = mode if mode else None
        file_infos.append((info, parts, archive_mode))

    if total_uncompressed > LARGE_TOTAL_BYTES:
        warnings.append(f"Large total uncompressed size: {total_uncompressed} bytes")

    if blocks:
        raise SystemExit(block("Stage safety validation failed: " + "; ".join(blocks[:5])))

    if warnings:
        print("===== KPACKAGE STAGE =====")
        print()
        print("Result: REVIEW")
        print("Reason: Stage revalidation found review findings.")
        for item in warnings[:10]:
            print(f"- {item}")
        print("No Stage session was created.")
        print("No repository files were modified.")
        print()
        print("===== END KPACKAGE STAGE =====")
        raise SystemExit(2)

    current_sha = sha256_file(package)
    if current_sha != expected_sha:
        raise SystemExit(block("Package changed during Stage validation. Hash mismatch."))

    session_root.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        os.chmod(session_root, 0o700)
    except OSError:
        pass

    created_at = dt.datetime.now(dt.timezone.utc)
    session_id = (
        created_at.strftime("%Y%m%dT%H%M%SZ")
        + "-"
        + expected_sha[:12]
        + "-"
        + secrets.token_hex(3)
    )
    final_dir = session_root / session_id
    partial_dir = session_root / f".partial-{session_id}"

    if final_dir.exists() or partial_dir.exists():
        raise SystemExit(block("Generated Session ID already exists."))

    partial_dir.mkdir(mode=0o700)
    staging = partial_dir / "staging"
    staging.mkdir(mode=0o700)

    staged_files = []

    try:
        for directory in sorted(set(directory_paths)):
            target_dir = staging.joinpath(*directory.split("/"))
            resolved_target = target_dir.resolve(strict=False)
            if not is_within(resolved_target, staging.resolve()):
                raise RuntimeError(f"Directory escaped staging root: {directory!r}")
            target_dir.mkdir(parents=True, exist_ok=True, mode=0o700)

        for info, parts, archive_mode in file_infos:
            relative = "/".join(parts)
            target = staging.joinpath(*parts)
            resolved_target = target.resolve(strict=False)
            if not is_within(resolved_target, staging.resolve()):
                raise RuntimeError(f"File escaped staging root: {relative!r}")

            target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)

            if target.exists() or target.is_symlink():
                raise RuntimeError(f"Unexpected staged target collision: {relative!r}")

            with archive.open(info, "r") as src, target.open("xb") as dst:
                shutil.copyfileobj(src, dst, length=1024 * 1024)

            os.chmod(target, 0o600)

            staged_files.append({
                "path": relative,
                "sha256": sha256_file(target),
                "size": target.stat().st_size,
                "archive_mode": (oct(archive_mode) if archive_mode is not None else None),
            })

        actual_files = []
        for path in staging.rglob("*"):
            if path.is_symlink():
                raise RuntimeError(f"Symlink appeared in staging: {path}")
            if path.is_file():
                actual_files.append(path.relative_to(staging).as_posix())
            elif not path.is_dir():
                raise RuntimeError(f"Special filesystem entry appeared in staging: {path}")

        expected_files = sorted(item["path"] for item in staged_files)
        if sorted(actual_files) != expected_files:
            raise RuntimeError("Staging file list does not match validated archive entries.")

        staged_files.sort(key=lambda item: item["path"])
        for item in staged_files:
            staged_path = staging.joinpath(*item["path"].split("/"))
            if sha256_file(staged_path) != item["sha256"]:
                raise RuntimeError(f"Staged file changed during extraction: {item['path']!r}")

        manifest = {
            "schema_version": 1,
            "status": "STAGED",
            "session_id": session_id,
            "runtime_version": runtime_version,
            "created_at_utc": created_at.isoformat().replace("+00:00", "Z"),
            "package_path": str(package),
            "package_sha256": expected_sha,
            "repository_root": str(repo),
            "branch": branch,
            "repository_head": head,
            "session_path": str(final_dir),
            "staging_path": str(final_dir / "staging"),
            "staged_file_count": len(staged_files),
            "staged_files": staged_files,
            "staged_directories": sorted(set(directory_paths)),
        }

        session_json = partial_dir / "session.json"
        session_json.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        os.chmod(session_json, 0o600)

        if sha256_file(package) != expected_sha:
            raise RuntimeError("Package changed before Stage session finalization.")

        os.replace(partial_dir, final_dir)

    except BaseException as exc:
        shutil.rmtree(partial_dir, ignore_errors=True)
        raise SystemExit(block(f"Stage extraction failed: {safe_display(exc)}"))

finally:
    archive.close()

print("===== KPACKAGE STAGE =====")
print()
print("Result: STAGED")
print(f"Session ID: {session_id}")
print(f"Session path: {safe_display(final_dir)}")
print(f"Staging path: {safe_display(final_dir / 'staging')}")
print(f"Package SHA256: {expected_sha}")
print(f"Repository: {safe_display(repo)}")
print(f"Branch: {branch}")
print(f"Repository HEAD: {head}")
print(f"Staged files: {len(staged_files)}")
print("Repository files modified: NO")
print()
print("Next planned step: kpackage diff <session> (not implemented yet)")
print()
print("===== END KPACKAGE STAGE =====")
PY
}

kpackage() {
  local command="${1:-help}"

  if [ "$#" -gt 0 ]; then
    shift
  fi

  case "$command" in
    inspect)
      _kpackage_inspect "$@"
      ;;
    stage)
      _kpackage_stage "$@"
      ;;
    version)
      echo "Koppy Package Utility ${KPACKAGE_RUNTIME_VERSION}"
      ;;
    help|-h|--help)
      _kpackage_help
      ;;
    *)
      echo "Unknown Koppy Package command: $command"
      echo "Run: kpackage help"
      return 1
      ;;
  esac
}

# Allow both:
#   source ~/.koppy_package.sh  -> kpackage function
#   bash koppy_package.sh ...  -> direct execution
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  kpackage "$@"
fi
