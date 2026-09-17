#!/usr/bin/env bash

# Koppy Package Utility
# Runtime Source of Truth
# Version: 0.5.0
#
# Safe to source from ~/.bashrc:
# this file intentionally does not change caller shell options.

KPACKAGE_RUNTIME_VERSION="0.5.0"

_kpackage_help() {
  cat <<'EOF'
Koppy Package Utility 0.5.0

Implemented:
  kpackage inspect <package.zip>
      Read-only ZIP inspection. Does not extract or modify the repository.

  kpackage stage <package.zip>
      Safely extracts a PASS package to a repository-external session.
      Does not modify repository files.

  kpackage diff <session>
      Read-only comparison of a validated Stage session against its repository.
      Classifies staged files as NEW, REPLACE, or IDENTICAL.

  kpackage apply <session>
      Explicitly applies a validated STAGED session to its repository.
      Creates repository-external backup metadata first.
      Does not commit or push.

  kpackage rollback <session>
      Explicitly restores a validated APPLIED session to its pre-Apply state.
      Refuses rollback when later repository changes are detected.
      Does not commit or push.

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

repo = pathlib.Path(os.path.abspath(os.path.expanduser(repo_arg)))
try:
    repo_real = repo.resolve(strict=True)
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

if is_within(package, repo_real):
    raise SystemExit(block("Package must be outside the repository."))

if is_within(session_root_resolved, repo_real) or is_within(repo_real, session_root_resolved):
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
print("Next: kpackage diff <session>")
print()
print("===== END KPACKAGE STAGE =====")
PY
}


_kpackage_diff() {
  local session="${1:-}"
  local session_root current_repo current_branch current_head status_output worktree_dirty

  if [ -z "$session" ]; then
    echo "Usage: kpackage diff <session>"
    return 1
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "===== KPACKAGE DIFF ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: python3 is required but was not found."
    echo
    echo "===== END KPACKAGE DIFF ====="
    return 1
  fi

  session_root="${KPACKAGE_SESSION_ROOT:-$HOME/.koppy/package_sessions}"

  current_repo="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  if [ -z "$current_repo" ]; then
    echo "===== KPACKAGE DIFF ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: current directory is not inside a Git repository."
    echo "No repository files were modified."
    echo "No Session files were modified."
    echo
    echo "===== END KPACKAGE DIFF ====="
    return 1
  fi

  current_branch="$(git -C "$current_repo" branch --show-current 2>/dev/null || true)"
  current_head="$(git -C "$current_repo" rev-parse HEAD 2>/dev/null || true)"
  status_output="$(git -C "$current_repo" status --porcelain=v1 --untracked-files=all 2>/dev/null || true)"

  worktree_dirty="0"
  if [ -n "$status_output" ]; then
    worktree_dirty="1"
  fi

  python3 -     "$session"     "$session_root"     "$KPACKAGE_RUNTIME_VERSION"     "$current_repo"     "$current_branch"     "$current_head"     "$worktree_dirty" <<'PY'
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import sys
import unicodedata

(
    session_arg,
    session_root_arg,
    runtime_version,
    current_repo_arg,
    current_branch,
    current_head,
    worktree_dirty,
) = sys.argv[1:]

def safe_display(value: object) -> str:
    return repr(str(value))

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

def has_control_or_format(value: str) -> bool:
    return any(unicodedata.category(ch) in {"Cc", "Cf"} for ch in value)

def block(reason: str) -> int:
    print("===== KPACKAGE DIFF =====")
    print()
    print("Result: BLOCK")
    print(f"Reason: {reason}")
    print("No repository files were modified.")
    print("No Session files were modified.")
    print()
    print("===== END KPACKAGE DIFF =====")
    return 1

session_root = pathlib.Path(session_root_arg).expanduser()
try:
    session_root = session_root.resolve(strict=True)
except OSError as exc:
    raise SystemExit(block(f"Session root could not be resolved: {safe_display(exc)}"))

if not session_root.is_dir() or session_root.is_symlink():
    raise SystemExit(block("Session root must be a real directory."))

raw_arg = pathlib.Path(session_arg).expanduser()
if "/" in session_arg or session_arg.startswith(".") or raw_arg.is_absolute():
    candidate = raw_arg
else:
    candidate = session_root / session_arg

if candidate.is_symlink():
    raise SystemExit(block("Session path must not be a symlink."))

try:
    session_path = candidate.resolve(strict=True)
except OSError as exc:
    raise SystemExit(block(f"Session path could not be resolved: {safe_display(exc)}"))

if not session_path.is_dir():
    raise SystemExit(block("Session path is not a directory."))

if session_path.parent != session_root:
    raise SystemExit(block("Session must be a direct child of the configured Session root."))

session_json = session_path / "session.json"
staging = session_path / "staging"

if session_json.is_symlink() or not session_json.is_file():
    raise SystemExit(block("session.json is missing or is not a regular file."))

if staging.is_symlink() or not staging.is_dir():
    raise SystemExit(block("staging directory is missing or is not a real directory."))

try:
    manifest = json.loads(session_json.read_text(encoding="utf-8"))
except (OSError, UnicodeError, json.JSONDecodeError) as exc:
    raise SystemExit(block(f"session.json could not be read: {safe_display(exc)}"))

if not isinstance(manifest, dict):
    raise SystemExit(block("session.json root must be an object."))

required = {
    "schema_version",
    "status",
    "session_id",
    "runtime_version",
    "package_path",
    "package_sha256",
    "repository_root",
    "branch",
    "repository_head",
    "session_path",
    "staging_path",
    "staged_file_count",
    "staged_files",
    "staged_directories",
    "created_at_utc",
}
missing = sorted(required.difference(manifest))
if missing:
    raise SystemExit(block(f"session.json missing required fields: {missing!r}"))

if manifest["schema_version"] != 1:
    raise SystemExit(block("Unsupported Session schema version."))

if manifest["status"] != "STAGED":
    raise SystemExit(block("Session status is not STAGED."))

if manifest["session_id"] != session_path.name:
    raise SystemExit(block("Session ID does not match Session directory name."))

try:
    manifest_session = pathlib.Path(manifest["session_path"]).expanduser().resolve(strict=True)
    manifest_staging = pathlib.Path(manifest["staging_path"]).expanduser().resolve(strict=True)
except (TypeError, OSError) as exc:
    raise SystemExit(block(f"Session path metadata is invalid: {safe_display(exc)}"))

if manifest_session != session_path:
    raise SystemExit(block("Session path metadata does not match the selected Session."))

if manifest_staging != staging:
    raise SystemExit(block("Staging path metadata does not match the selected Session."))

try:
    repo = pathlib.Path(os.path.abspath(os.path.expanduser(manifest["repository_root"])))
    repo_real = repo.resolve(strict=True)
    current_repo = pathlib.Path(os.path.abspath(os.path.expanduser(current_repo_arg)))
    current_repo_real = current_repo.resolve(strict=True)
except (TypeError, OSError) as exc:
    raise SystemExit(block(f"Repository root metadata is invalid: {safe_display(exc)}"))

if not repo.is_dir():
    raise SystemExit(block("Repository root is not a directory."))

if is_within(session_path, repo_real) or is_within(repo_real, session_path):
    raise SystemExit(block("Session and repository must remain separated."))

try:
    if not os.path.samefile(repo_real, current_repo_real):
        raise SystemExit(block("Current Git repository does not match the Session repository."))
except OSError as exc:
    raise SystemExit(block(f"Repository identity could not be verified: {safe_display(exc)}"))

if not current_branch:
    raise SystemExit(block("Detached HEAD is not supported for Package Diff."))

if not current_head:
    raise SystemExit(block("Current repository HEAD could not be resolved."))

if current_branch != manifest["branch"]:
    raise SystemExit(block("Current branch does not match the Stage-time branch."))

if current_head != manifest["repository_head"]:
    raise SystemExit(block("Current HEAD does not match the Stage-time repository HEAD."))

if worktree_dirty != "0":
    raise SystemExit(block("Worktree must be clean for Package Diff."))

try:
    package = pathlib.Path(manifest["package_path"]).expanduser().resolve(strict=True)
except (TypeError, OSError) as exc:
    raise SystemExit(block(f"Package path could not be resolved: {safe_display(exc)}"))

if not package.is_file():
    raise SystemExit(block("Package is no longer a regular file."))

package_sha = manifest["package_sha256"]
if not isinstance(package_sha, str) or len(package_sha) != 64:
    raise SystemExit(block("Package SHA256 metadata is invalid."))

if sha256_file(package) != package_sha:
    raise SystemExit(block("Package hash no longer matches the Stage Session."))

rows = manifest["staged_files"]
if not isinstance(rows, list):
    raise SystemExit(block("staged_files must be an array."))

if manifest["staged_file_count"] != len(rows):
    raise SystemExit(block("staged_file_count does not match staged_files."))

seen: dict[str, str] = {}
expected_paths: list[str] = []
validated_rows: list[tuple[str, pathlib.Path, str, int]] = []

for row in rows:
    if not isinstance(row, dict):
        raise SystemExit(block("Each staged_files entry must be an object."))

    rel = row.get("path")
    expected_sha = row.get("sha256")
    expected_size = row.get("size")

    if not isinstance(rel, str) or not rel:
        raise SystemExit(block("Staged file path metadata is invalid."))

    if (
        rel.startswith("/")
        or "\\" in rel
        or has_control_or_format(rel)
    ):
        raise SystemExit(block(f"Unsafe staged path metadata: {safe_display(rel)}"))

    parts = rel.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise SystemExit(block(f"Unsafe staged path component: {safe_display(rel)}"))

    if any(part.casefold() == ".git" for part in parts):
        raise SystemExit(block(f"Git metadata path in Session: {safe_display(rel)}"))

    canonical = unicodedata.normalize("NFC", rel).casefold()
    previous = seen.get(canonical)
    if previous is not None:
        raise SystemExit(block(
            f"Duplicate/colliding staged path metadata: {safe_display(previous)} <-> {safe_display(rel)}"
        ))
    seen[canonical] = rel

    if not isinstance(expected_sha, str) or len(expected_sha) != 64:
        raise SystemExit(block(f"Invalid staged SHA256 metadata: {safe_display(rel)}"))

    if not isinstance(expected_size, int) or expected_size < 0:
        raise SystemExit(block(f"Invalid staged size metadata: {safe_display(rel)}"))

    staged_path = staging.joinpath(*parts)
    if staged_path.is_symlink() or not staged_path.is_file():
        raise SystemExit(block(f"Staged file missing or unsafe: {safe_display(rel)}"))

    try:
        staged_resolved = staged_path.resolve(strict=True)
    except OSError as exc:
        raise SystemExit(block(f"Staged file could not be resolved: {safe_display(exc)}"))

    if not is_within(staged_resolved, staging):
        raise SystemExit(block(f"Staged file escaped the Staging Area: {safe_display(rel)}"))

    if staged_path.stat().st_size != expected_size:
        raise SystemExit(block(f"Staged file size no longer matches Session metadata: {safe_display(rel)}"))

    actual_sha = sha256_file(staged_path)
    if actual_sha != expected_sha:
        raise SystemExit(block(f"Staged file hash no longer matches Session metadata: {safe_display(rel)}"))

    expected_paths.append(rel)
    validated_rows.append((rel, staged_path, expected_sha, expected_size))

actual_paths: list[str] = []
for path in staging.rglob("*"):
    if path.is_symlink():
        raise SystemExit(block(f"Symlink appeared in Staging Area: {safe_display(path)}"))
    if path.is_file():
        actual_paths.append(path.relative_to(staging).as_posix())
    elif not path.is_dir():
        raise SystemExit(block(f"Special filesystem entry appeared in Staging Area: {safe_display(path)}"))

if sorted(actual_paths) != sorted(expected_paths):
    raise SystemExit(block("Staging file list no longer matches Session metadata."))

classifications: list[tuple[str, str, str, str | None]] = []
counts = {"NEW": 0, "REPLACE": 0, "IDENTICAL": 0}

for rel, staged_path, staged_sha, staged_size in sorted(validated_rows, key=lambda item: item[0]):
    parts = rel.split("/")
    current = repo
    target_exists = True

    for index, part in enumerate(parts):
        candidate_path = current / part
        last = index == len(parts) - 1

        if candidate_path.is_symlink():
            raise SystemExit(block(f"Repository target path contains a symlink: {safe_display(rel)}"))

        if candidate_path.exists():
            if last:
                current = candidate_path
                break
            if not candidate_path.is_dir():
                raise SystemExit(block(f"Repository parent path is not a directory: {safe_display(rel)}"))
            current = candidate_path
        else:
            target_exists = False
            current = candidate_path
            for remaining in parts[index + 1:]:
                current = current / remaining
            break

    target = current
    target_resolved = target.resolve(strict=False)
    if not is_within(target_resolved, repo_real):
        raise SystemExit(block(f"Repository target escaped repository root: {safe_display(rel)}"))

    if not target_exists or not target.exists():
        classification = "NEW"
        repo_sha = None
    else:
        if target.is_symlink():
            raise SystemExit(block(f"Repository target is a symlink: {safe_display(rel)}"))
        if not target.is_file():
            raise SystemExit(block(f"Repository target is not a regular file: {safe_display(rel)}"))
        repo_sha = sha256_file(target)
        classification = "IDENTICAL" if repo_sha == staged_sha else "REPLACE"

    counts[classification] += 1
    classifications.append((classification, rel, staged_sha, repo_sha))

print("===== KPACKAGE DIFF =====")
print()
print("■ SESSION")
print(f"Session ID: {safe_display(manifest['session_id'])}")
print(f"Session path: {safe_display(session_path)}")
print(f"Runtime: {runtime_version}")
print()
print("■ REPOSITORY")
print(f"Repository: {safe_display(repo)}")
print(f"Branch: {current_branch}")
print(f"HEAD: {current_head}")
print()
print("■ CLASSIFICATION")
for classification, rel, staged_sha, repo_sha in classifications:
    print(f"{classification:<9} {safe_display(rel)}")
    print(f"  staged_sha256: {staged_sha}")
    if repo_sha is not None:
        print(f"  repo_sha256:   {repo_sha}")

print()
print("■ SUMMARY")
print(f"NEW: {counts['NEW']}")
print(f"REPLACE: {counts['REPLACE']}")
print(f"IDENTICAL: {counts['IDENTICAL']}")
print(f"TOTAL: {len(classifications)}")
print("DELETE: unsupported / not inferred")
print()
print("■ RESULT")
print("Result: DIFF_READY")
print("Repository files modified: NO")
print("Session files modified: NO")
print("File contents were not printed.")
print()
print("===== END KPACKAGE DIFF =====")

raise SystemExit(0)
PY
}


_kpackage_apply() {
  local session="${1:-}"
  local session_root current_repo current_branch current_head status_output worktree_dirty

  if [ -z "$session" ]; then
    echo "Usage: kpackage apply <session>"
    return 1
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "===== KPACKAGE APPLY ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: python3 is required but was not found."
    echo
    echo "===== END KPACKAGE APPLY ====="
    return 1
  fi

  session_root="${KPACKAGE_SESSION_ROOT:-$HOME/.koppy/package_sessions}"

  current_repo="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  if [ -z "$current_repo" ]; then
    echo "===== KPACKAGE APPLY ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: current directory is not inside a Git repository."
    echo "No repository files were modified."
    echo
    echo "===== END KPACKAGE APPLY ====="
    return 1
  fi

  current_branch="$(git -C "$current_repo" branch --show-current 2>/dev/null || true)"
  current_head="$(git -C "$current_repo" rev-parse HEAD 2>/dev/null || true)"

  if ! status_output="$(git -C "$current_repo" status --porcelain=v1 --untracked-files=all 2>/dev/null)"; then
    echo "===== KPACKAGE APPLY ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: repository worktree status could not be resolved."
    echo "No repository files were modified."
    echo
    echo "===== END KPACKAGE APPLY ====="
    return 1
  fi

  worktree_dirty="0"
  if [ -n "$status_output" ]; then
    worktree_dirty="1"
  fi

  python3 - \
    "$session" \
    "$session_root" \
    "$KPACKAGE_RUNTIME_VERSION" \
    "$current_repo" \
    "$current_branch" \
    "$current_head" \
    "$worktree_dirty" <<'PY'
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import pathlib
import secrets
import shutil
import stat
import sys
import unicodedata

(
    session_arg,
    session_root_arg,
    runtime_version,
    current_repo_arg,
    current_branch,
    current_head,
    worktree_dirty,
) = sys.argv[1:]

def safe_display(value: object) -> str:
    return repr(str(value))

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

def has_control_or_format(value: str) -> bool:
    return any(unicodedata.category(ch) in {"Cc", "Cf"} for ch in value)

def block(reason: str) -> int:
    print("===== KPACKAGE APPLY =====")
    print()
    print("Result: BLOCK")
    print(f"Reason: {reason}")
    print("No repository files were modified.")
    print()
    print("===== END KPACKAGE APPLY =====")
    return 1

def write_json_atomic(path: pathlib.Path, data: dict) -> None:
    tmp = path.with_name(path.name + f".tmp-{secrets.token_hex(4)}")
    try:
        tmp.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()

session_root = pathlib.Path(session_root_arg).expanduser()
try:
    session_root = session_root.resolve(strict=True)
except OSError as exc:
    raise SystemExit(block(f"Session root could not be resolved: {safe_display(exc)}"))

if not session_root.is_dir() or session_root.is_symlink():
    raise SystemExit(block("Session root must be a real directory."))

raw_arg = pathlib.Path(session_arg).expanduser()
if "/" in session_arg or session_arg.startswith(".") or raw_arg.is_absolute():
    candidate = raw_arg
else:
    candidate = session_root / session_arg

if candidate.is_symlink():
    raise SystemExit(block("Session path must not be a symlink."))

try:
    session_path = candidate.resolve(strict=True)
except OSError as exc:
    raise SystemExit(block(f"Session path could not be resolved: {safe_display(exc)}"))

if not session_path.is_dir():
    raise SystemExit(block("Session path is not a directory."))

if session_path.parent != session_root:
    raise SystemExit(block("Session must be a direct child of the configured Session root."))

session_json = session_path / "session.json"
staging = session_path / "staging"
backup_dir = session_path / "backup"
apply_json = session_path / "apply.json"

if session_json.is_symlink() or not session_json.is_file():
    raise SystemExit(block("session.json is missing or is not a regular file."))

if staging.is_symlink() or not staging.is_dir():
    raise SystemExit(block("staging directory is missing or is not a real directory."))

if backup_dir.exists() or backup_dir.is_symlink():
    raise SystemExit(block("Session backup already exists. Refusing ambiguous re-apply."))

if apply_json.exists() or apply_json.is_symlink():
    raise SystemExit(block("Session apply metadata already exists. Refusing ambiguous re-apply."))

if any(session_path.glob(".apply-backup-partial-*")):
    raise SystemExit(block("Incomplete Apply backup state exists in Session. Review is required."))

try:
    manifest = json.loads(session_json.read_text(encoding="utf-8"))
except (OSError, UnicodeError, json.JSONDecodeError) as exc:
    raise SystemExit(block(f"session.json could not be read: {safe_display(exc)}"))

if not isinstance(manifest, dict):
    raise SystemExit(block("session.json root must be an object."))

required = {
    "schema_version",
    "status",
    "session_id",
    "runtime_version",
    "package_path",
    "package_sha256",
    "repository_root",
    "branch",
    "repository_head",
    "session_path",
    "staging_path",
    "staged_file_count",
    "staged_files",
    "staged_directories",
    "created_at_utc",
}
missing = sorted(required.difference(manifest))
if missing:
    raise SystemExit(block(f"session.json missing required fields: {missing!r}"))

if manifest["schema_version"] != 1:
    raise SystemExit(block("Unsupported Session schema version."))

if manifest["status"] != "STAGED":
    raise SystemExit(block("Session status is not STAGED."))

if manifest["session_id"] != session_path.name:
    raise SystemExit(block("Session ID does not match Session directory name."))

try:
    manifest_session = pathlib.Path(manifest["session_path"]).expanduser().resolve(strict=True)
    manifest_staging = pathlib.Path(manifest["staging_path"]).expanduser().resolve(strict=True)
except (TypeError, OSError) as exc:
    raise SystemExit(block(f"Session path metadata is invalid: {safe_display(exc)}"))

if manifest_session != session_path:
    raise SystemExit(block("Session path metadata does not match the selected Session."))

if manifest_staging != staging:
    raise SystemExit(block("Staging path metadata does not match the selected Session."))

try:
    repo = pathlib.Path(os.path.abspath(os.path.expanduser(manifest["repository_root"])))
    repo_real = repo.resolve(strict=True)
    current_repo = pathlib.Path(os.path.abspath(os.path.expanduser(current_repo_arg)))
    current_repo_real = current_repo.resolve(strict=True)
except (TypeError, OSError) as exc:
    raise SystemExit(block(f"Repository root metadata is invalid: {safe_display(exc)}"))

if not repo.is_dir():
    raise SystemExit(block("Repository root is not a directory."))

if is_within(session_path, repo_real) or is_within(repo_real, session_path):
    raise SystemExit(block("Session and repository must remain separated."))

try:
    if not os.path.samefile(repo_real, current_repo_real):
        raise SystemExit(block("Current Git repository does not match the Session repository."))
except OSError as exc:
    raise SystemExit(block(f"Repository identity could not be verified: {safe_display(exc)}"))

if not current_branch:
    raise SystemExit(block("Detached HEAD is not supported for Package Apply."))

if not current_head:
    raise SystemExit(block("Current repository HEAD could not be resolved."))

if current_branch != manifest["branch"]:
    raise SystemExit(block("Current branch does not match the Stage-time branch."))

if current_head != manifest["repository_head"]:
    raise SystemExit(block("Current HEAD does not match the Stage-time repository HEAD."))

if worktree_dirty != "0":
    raise SystemExit(block("Worktree must be clean for Package Apply."))

try:
    package = pathlib.Path(manifest["package_path"]).expanduser().resolve(strict=True)
except (TypeError, OSError) as exc:
    raise SystemExit(block(f"Package path could not be resolved: {safe_display(exc)}"))

if not package.is_file():
    raise SystemExit(block("Package is no longer a regular file."))

package_sha = manifest["package_sha256"]
if not isinstance(package_sha, str) or len(package_sha) != 64:
    raise SystemExit(block("Package SHA256 metadata is invalid."))

if sha256_file(package) != package_sha:
    raise SystemExit(block("Package hash no longer matches the Stage Session."))

rows = manifest["staged_files"]
if not isinstance(rows, list):
    raise SystemExit(block("staged_files must be an array."))

if manifest["staged_file_count"] != len(rows):
    raise SystemExit(block("staged_file_count does not match staged_files."))

seen: dict[str, str] = {}
expected_paths: list[str] = []
validated: list[dict] = []

for row in rows:
    if not isinstance(row, dict):
        raise SystemExit(block("Each staged_files entry must be an object."))

    rel = row.get("path")
    expected_sha = row.get("sha256")
    expected_size = row.get("size")

    if not isinstance(rel, str) or not rel:
        raise SystemExit(block("Staged file path metadata is invalid."))

    if rel.startswith("/") or "\\" in rel or has_control_or_format(rel):
        raise SystemExit(block(f"Unsafe staged path metadata: {safe_display(rel)}"))

    parts = rel.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise SystemExit(block(f"Unsafe staged path component: {safe_display(rel)}"))

    if any(part.casefold() == ".git" for part in parts):
        raise SystemExit(block(f"Git metadata path in Session: {safe_display(rel)}"))

    canonical = unicodedata.normalize("NFC", rel).casefold()
    previous = seen.get(canonical)
    if previous is not None:
        raise SystemExit(block(
            f"Duplicate/colliding staged path metadata: {safe_display(previous)} <-> {safe_display(rel)}"
        ))
    seen[canonical] = rel

    if not isinstance(expected_sha, str) or len(expected_sha) != 64:
        raise SystemExit(block(f"Invalid staged SHA256 metadata: {safe_display(rel)}"))

    if not isinstance(expected_size, int) or expected_size < 0:
        raise SystemExit(block(f"Invalid staged size metadata: {safe_display(rel)}"))

    staged_path = staging.joinpath(*parts)
    if staged_path.is_symlink() or not staged_path.is_file():
        raise SystemExit(block(f"Staged file missing or unsafe: {safe_display(rel)}"))

    try:
        staged_resolved = staged_path.resolve(strict=True)
    except OSError as exc:
        raise SystemExit(block(f"Staged file could not be resolved: {safe_display(exc)}"))

    if not is_within(staged_resolved, staging):
        raise SystemExit(block(f"Staged file escaped the Staging Area: {safe_display(rel)}"))

    if staged_path.stat().st_size != expected_size:
        raise SystemExit(block(f"Staged file size no longer matches Session metadata: {safe_display(rel)}"))

    actual_sha = sha256_file(staged_path)
    if actual_sha != expected_sha:
        raise SystemExit(block(f"Staged file hash no longer matches Session metadata: {safe_display(rel)}"))

    expected_paths.append(rel)
    validated.append({
        "rel": rel,
        "parts": parts,
        "staged": staged_path,
        "staged_sha": expected_sha,
        "size": expected_size,
        "archive_mode": row.get("archive_mode"),
    })

actual_paths: list[str] = []
for path in staging.rglob("*"):
    if path.is_symlink():
        raise SystemExit(block(f"Symlink appeared in Staging Area: {safe_display(path)}"))
    if path.is_file():
        actual_paths.append(path.relative_to(staging).as_posix())
    elif not path.is_dir():
        raise SystemExit(block(f"Special filesystem entry appeared in Staging Area: {safe_display(path)}"))

if sorted(actual_paths) != sorted(expected_paths):
    raise SystemExit(block("Staging file list no longer matches Session metadata."))

counts = {"NEW": 0, "REPLACE": 0, "IDENTICAL": 0}
targets: list[dict] = []

for item in sorted(validated, key=lambda x: x["rel"]):
    rel = item["rel"]
    parts = item["parts"]
    current = repo
    target_exists = True

    for index, part in enumerate(parts):
        candidate_path = current / part
        last = index == len(parts) - 1

        if candidate_path.is_symlink():
            raise SystemExit(block(f"Repository target path contains a symlink: {safe_display(rel)}"))

        if candidate_path.exists():
            if last:
                current = candidate_path
                break
            if not candidate_path.is_dir():
                raise SystemExit(block(f"Repository parent path is not a directory: {safe_display(rel)}"))
            current = candidate_path
        else:
            target_exists = False
            current = candidate_path
            for remaining in parts[index + 1:]:
                current = current / remaining
            break

    target = current
    target_resolved = target.resolve(strict=False)
    if not is_within(target_resolved, repo_real):
        raise SystemExit(block(f"Repository target escaped repository root: {safe_display(rel)}"))

    if not target_exists or not target.exists():
        classification = "NEW"
        pre_sha = None
        pre_mode = None
    else:
        if target.is_symlink():
            raise SystemExit(block(f"Repository target is a symlink: {safe_display(rel)}"))
        if not target.is_file():
            raise SystemExit(block(f"Repository target is not a regular file: {safe_display(rel)}"))
        pre_sha = sha256_file(target)
        pre_mode = stat.S_IMODE(target.stat().st_mode)
        classification = "IDENTICAL" if pre_sha == item["staged_sha"] else "REPLACE"

    counts[classification] += 1
    item.update({
        "target": target,
        "classification": classification,
        "pre_sha": pre_sha,
        "pre_mode": pre_mode,
    })
    targets.append(item)

for item in targets:
    target = item["target"]
    classification = item["classification"]
    if classification == "NEW":
        if target.exists() or target.is_symlink():
            raise SystemExit(block(f"Repository target appeared after validation: {safe_display(item['rel'])}"))
    else:
        if target.is_symlink() or not target.is_file():
            raise SystemExit(block(f"Repository target changed type after validation: {safe_display(item['rel'])}"))
        if sha256_file(target) != item["pre_sha"]:
            raise SystemExit(block(f"Repository target changed after validation: {safe_display(item['rel'])}"))

partial_backup = session_path / f".apply-backup-partial-{secrets.token_hex(6)}"
partial_replaced = partial_backup / "replaced"

try:
    partial_replaced.mkdir(parents=True, mode=0o700)
    os.chmod(partial_backup, 0o700)
    os.chmod(partial_replaced, 0o700)

    for item in targets:
        if item["classification"] != "REPLACE":
            continue
        backup_path = partial_replaced.joinpath(*item["parts"])
        backup_path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        shutil.copy2(item["target"], backup_path)
        os.chmod(backup_path, 0o600)
        if sha256_file(backup_path) != item["pre_sha"]:
            raise RuntimeError(f"Backup hash mismatch: {item['rel']!r}")
        item["backup_path"] = backup_path
except BaseException as exc:
    shutil.rmtree(partial_backup, ignore_errors=True)
    raise SystemExit(block(f"Apply backup creation failed: {safe_display(exc)}"))

written: list[dict] = []
created_dirs: list[pathlib.Path] = []

def ensure_parent_dirs(item: dict) -> None:
    current = repo
    for part in item["parts"][:-1]:
        candidate = current / part
        if candidate.is_symlink():
            raise RuntimeError(f"Repository parent became symlink: {item['rel']!r}")
        if candidate.exists():
            if not candidate.is_dir():
                raise RuntimeError(f"Repository parent became non-directory: {item['rel']!r}")
        else:
            candidate.mkdir(mode=0o755)
            created_dirs.append(candidate)
        current = candidate

def desired_mode(item: dict) -> int:
    if item["classification"] == "REPLACE" and item["pre_mode"] is not None:
        return int(item["pre_mode"])
    archive_mode = item.get("archive_mode")
    if isinstance(archive_mode, str):
        try:
            parsed = int(archive_mode, 8)
            if parsed & 0o111:
                return 0o755
        except ValueError:
            pass
    return 0o644

def copy_staged_to_target(item: dict) -> None:
    target = item["target"]
    ensure_parent_dirs(item)

    if item["classification"] == "NEW":
        if target.exists() or target.is_symlink():
            raise RuntimeError(f"NEW target appeared before write: {item['rel']!r}")
    elif item["classification"] == "REPLACE":
        if target.is_symlink() or not target.is_file():
            raise RuntimeError(f"REPLACE target changed type before write: {item['rel']!r}")
        if sha256_file(target) != item["pre_sha"]:
            raise RuntimeError(f"REPLACE target changed before write: {item['rel']!r}")

    temp = target.parent / f".kpackage-apply-{manifest['session_id']}-{secrets.token_hex(4)}.tmp"
    try:
        with item["staged"].open("rb") as src, temp.open("xb") as dst:
            shutil.copyfileobj(src, dst, length=1024 * 1024)
        os.chmod(temp, desired_mode(item))
        if sha256_file(temp) != item["staged_sha"]:
            raise RuntimeError(f"Temporary Apply copy hash mismatch: {item['rel']!r}")
        os.replace(temp, target)

        if (
            os.environ.get("KPACKAGE_TEST_MODE") == "1"
            and os.environ.get("KPACKAGE_TEST_INJECT_POST_REPLACE_FAILURE") == "1"
        ):
            raise RuntimeError("Injected post-replace Apply failure for integration test")
    finally:
        if temp.exists():
            temp.unlink()

    if target.is_symlink() or not target.is_file():
        raise RuntimeError(f"Applied target is not a regular file: {item['rel']!r}")
    if sha256_file(target) != item["staged_sha"]:
        raise RuntimeError(f"Applied target hash mismatch: {item['rel']!r}")

def restore_repository() -> tuple[bool, list[str]]:
    errors: list[str] = []
    backup_root = backup_dir if backup_dir.exists() else partial_backup

    for item in reversed(written):
        target = item["target"]
        try:
            if item["classification"] == "NEW":
                if target.is_symlink():
                    raise RuntimeError("NEW target became a symlink during restore")
                if target.exists():
                    if not target.is_file():
                        raise RuntimeError("NEW target became non-file during restore")
                    target.unlink()
            elif item["classification"] == "REPLACE":
                source = backup_root / "replaced"
                source = source.joinpath(*item["parts"])
                if source.is_symlink() or not source.is_file():
                    raise RuntimeError("Backup file missing during restore")
                temp = target.parent / f".kpackage-restore-{secrets.token_hex(4)}.tmp"
                try:
                    shutil.copy2(source, temp)
                    os.chmod(temp, int(item["pre_mode"]))
                    if sha256_file(temp) != item["pre_sha"]:
                        raise RuntimeError("Restore temp hash mismatch")
                    os.replace(temp, target)
                finally:
                    if temp.exists():
                        temp.unlink()
        except BaseException as exc:
            errors.append(f"{item['rel']}: {exc!r}")

    for directory in reversed(created_dirs):
        try:
            directory.rmdir()
        except OSError:
            pass

    for item in targets:
        target = item["target"]
        try:
            if item["classification"] == "NEW":
                if target.exists() or target.is_symlink():
                    raise RuntimeError("NEW target still exists")
            else:
                if target.is_symlink() or not target.is_file():
                    raise RuntimeError("Original target type not restored")
                if sha256_file(target) != item["pre_sha"]:
                    raise RuntimeError("Original target hash not restored")
        except BaseException as exc:
            errors.append(f"{item['rel']}: {exc!r}")

    return (not errors, errors)

try:
    test_mode = os.environ.get("KPACKAGE_TEST_MODE") == "1"
    fail_after = 0
    if test_mode:
        raw_fail = os.environ.get("KPACKAGE_TEST_INJECT_APPLY_FAILURE_AFTER", "")
        if raw_fail:
            fail_after = int(raw_fail)

    for item in targets:
        if item["classification"] == "IDENTICAL":
            continue

        # Register the mutation before copy_staged_to_target(), because that
        # function can cross the atomic os.replace() boundary and then fail.
        # restore_repository() must include this target in either case.
        written.append(item)
        copy_staged_to_target(item)

        if fail_after and len(written) >= fail_after:
            raise RuntimeError("Injected Apply failure for integration test")

    for item in targets:
        target = item["target"]
        if item["classification"] == "IDENTICAL":
            if target.is_symlink() or not target.is_file():
                raise RuntimeError(f"IDENTICAL target changed type: {item['rel']!r}")
            if sha256_file(target) != item["pre_sha"]:
                raise RuntimeError(f"IDENTICAL target changed during Apply: {item['rel']!r}")
        else:
            if target.is_symlink() or not target.is_file():
                raise RuntimeError(f"Applied target changed type: {item['rel']!r}")
            if sha256_file(target) != item["staged_sha"]:
                raise RuntimeError(f"Applied target changed after write: {item['rel']!r}")

    os.replace(partial_backup, backup_dir)

    applied_at = dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")

    target_rows = []
    for item in targets:
        row = {
            "path": item["rel"],
            "classification": item["classification"],
            "staged_sha256": item["staged_sha"],
            "pre_apply_sha256": item["pre_sha"],
            "post_apply_sha256": item["staged_sha"] if item["classification"] != "IDENTICAL" else item["pre_sha"],
            "pre_apply_mode": (oct(item["pre_mode"]) if item["pre_mode"] is not None else None),
        }
        if item["classification"] == "REPLACE":
            row["backup_path"] = str(backup_dir / "replaced" / pathlib.Path(item["rel"]))
        target_rows.append(row)

    apply_metadata = {
        "schema_version": 1,
        "status": "APPLIED",
        "session_id": manifest["session_id"],
        "runtime_version": runtime_version,
        "applied_at_utc": applied_at,
        "repository_root": str(repo),
        "branch": current_branch,
        "repository_head": current_head,
        "package_sha256": package_sha,
        "backup_path": str(backup_dir),
        "created_directories": [
            path.relative_to(repo).as_posix()
            for path in sorted(created_dirs, key=lambda p: (len(p.parts), p.as_posix()))
        ],
        "new_files": [item["rel"] for item in targets if item["classification"] == "NEW"],
        "replaced_files": [item["rel"] for item in targets if item["classification"] == "REPLACE"],
        "identical_files": [item["rel"] for item in targets if item["classification"] == "IDENTICAL"],
        "targets": target_rows,
    }

    write_json_atomic(apply_json, apply_metadata)

    updated_manifest = dict(manifest)
    updated_manifest["status"] = "APPLIED"
    updated_manifest["applied_at_utc"] = applied_at
    updated_manifest["apply_manifest_path"] = str(apply_json)
    updated_manifest["backup_path"] = str(backup_dir)
    updated_manifest["apply_repository_head"] = current_head
    write_json_atomic(session_json, updated_manifest)

except BaseException as exc:
    restored, restore_errors = restore_repository()

    if restored:
        try:
            if apply_json.exists():
                apply_json.unlink()
            if backup_dir.exists():
                shutil.rmtree(backup_dir)
            if partial_backup.exists():
                shutil.rmtree(partial_backup)
        except OSError:
            pass

        print("===== KPACKAGE APPLY =====")
        print()
        print("Result: APPLY_FAILED_RESTORED")
        print(f"Reason: {safe_display(exc)}")
        print("Repository restoration verified: YES")
        print("Session status remains: STAGED")
        print("Commit performed: NO")
        print("Push performed: NO")
        print()
        print("===== END KPACKAGE APPLY =====")
        raise SystemExit(1)

    print("===== KPACKAGE APPLY =====")
    print()
    print("Result: APPLY_FAILED_RESTORE_INCOMPLETE")
    print(f"Reason: {safe_display(exc)}")
    print("Repository restoration verified: NO")
    for message in restore_errors[:10]:
        print(f"- {safe_display(message)}")
    print(f"Backup evidence preserved at: {safe_display(backup_dir if backup_dir.exists() else partial_backup)}")
    print("STOP: manual review required.")
    print("Commit performed: NO")
    print("Push performed: NO")
    print()
    print("===== END KPACKAGE APPLY =====")
    raise SystemExit(1)

print("===== KPACKAGE APPLY =====")
print()
print("Result: APPLIED")
print(f"Session ID: {safe_display(manifest['session_id'])}")
print(f"Repository: {safe_display(repo)}")
print(f"Branch: {current_branch}")
print(f"Repository HEAD: {current_head}")
print(f"NEW applied: {counts['NEW']}")
print(f"REPLACE applied: {counts['REPLACE']}")
print(f"IDENTICAL skipped: {counts['IDENTICAL']}")
print(f"Backup path: {safe_display(backup_dir)}")
print(f"Apply metadata: {safe_display(apply_json)}")
print("Commit performed: NO")
print("Push performed: NO")
print()
print("Next: kclip review")
print()
print("===== END KPACKAGE APPLY =====")

raise SystemExit(0)
PY
}


_kpackage_rollback() {
  local session="${1:-}"
  local session_root current_repo current_branch current_head status_file rc

  if [ -z "$session" ]; then
    echo "Usage: kpackage rollback <session>"
    return 1
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "===== KPACKAGE ROLLBACK ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: python3 is required but was not found."
    echo
    echo "===== END KPACKAGE ROLLBACK ====="
    return 1
  fi

  session_root="${KPACKAGE_SESSION_ROOT:-$HOME/.koppy/package_sessions}"
  current_repo="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  if [ -z "$current_repo" ]; then
    echo "===== KPACKAGE ROLLBACK ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: current directory is not inside a Git repository."
    echo "No repository files were modified."
    echo
    echo "===== END KPACKAGE ROLLBACK ====="
    return 1
  fi

  current_branch="$(git -C "$current_repo" branch --show-current 2>/dev/null || true)"
  current_head="$(git -C "$current_repo" rev-parse HEAD 2>/dev/null || true)"
  status_file="$(mktemp "${TMPDIR:-/tmp}/kpackage-rollback-status.XXXXXX")" || {
    echo "===== KPACKAGE ROLLBACK ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: could not create repository status snapshot."
    echo "No repository files were modified."
    echo
    echo "===== END KPACKAGE ROLLBACK ====="
    return 1
  }

  if ! git -C "$current_repo" status --porcelain=v1 -z --untracked-files=all > "$status_file" 2>/dev/null; then
    rm -f "$status_file"
    echo "===== KPACKAGE ROLLBACK ====="
    echo
    echo "Result: BLOCK"
    echo "Reason: repository worktree status could not be resolved."
    echo "No repository files were modified."
    echo
    echo "===== END KPACKAGE ROLLBACK ====="
    return 1
  fi

  python3 - \
    "$session" \
    "$session_root" \
    "$KPACKAGE_RUNTIME_VERSION" \
    "$current_repo" \
    "$current_branch" \
    "$current_head" \
    "$status_file" <<'PY'
from __future__ import annotations
import datetime as dt
import hashlib
import json
import os
import pathlib
import secrets
import shutil
import stat
import sys
import unicodedata

(session_arg, session_root_arg, runtime_version, current_repo_arg,
 current_branch, current_head, status_file_arg) = sys.argv[1:]

def safe_display(value: object) -> str:
    return repr(str(value))

def sha256_file(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def is_within(path: pathlib.Path, root: pathlib.Path) -> bool:
    try:
        return os.path.commonpath([str(path), str(root)]) == str(root)
    except ValueError:
        return False

def has_control_or_format(value: str) -> bool:
    return any(unicodedata.category(ch) in {'Cc', 'Cf'} for ch in value)

def block(reason: str) -> int:
    print('===== KPACKAGE ROLLBACK =====')
    print()
    print('Result: BLOCK')
    print(f'Reason: {reason}')
    print('No repository files were modified.')
    print('Session status was not changed.')
    print()
    print('===== END KPACKAGE ROLLBACK =====')
    return 1

def write_json_atomic(path: pathlib.Path, data: dict) -> None:
    tmp = path.with_name(path.name + f'.tmp-{secrets.token_hex(4)}')
    try:
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()

def expected_new_mode(archive_mode: object) -> int:
    if isinstance(archive_mode, str):
        try:
            parsed = int(archive_mode, 8)
            if parsed & 0o111:
                return 0o755
        except ValueError:
            pass
    return 0o644

session_root = pathlib.Path(session_root_arg).expanduser()
try:
    session_root = session_root.resolve(strict=True)
except OSError as exc:
    raise SystemExit(block(f'Session root could not be resolved: {safe_display(exc)}'))
if not session_root.is_dir() or session_root.is_symlink():
    raise SystemExit(block('Session root must be a real directory.'))

raw_arg = pathlib.Path(session_arg).expanduser()
if '/' in session_arg or session_arg.startswith('.') or raw_arg.is_absolute():
    candidate = raw_arg
else:
    candidate = session_root / session_arg
if candidate.is_symlink():
    raise SystemExit(block('Session path must not be a symlink.'))
try:
    session_path = candidate.resolve(strict=True)
except OSError as exc:
    raise SystemExit(block(f'Session path could not be resolved: {safe_display(exc)}'))
if not session_path.is_dir() or session_path.parent != session_root:
    raise SystemExit(block('Session must be a real direct child of the configured Session root.'))

session_json = session_path / 'session.json'
staging = session_path / 'staging'
backup_dir = session_path / 'backup'
apply_json = session_path / 'apply.json'
rollback_json = session_path / 'rollback.json'

for path, label, kind in ((session_json,'session.json','file'),(apply_json,'apply.json','file'),(staging,'staging','dir'),(backup_dir,'backup','dir')):
    if path.is_symlink():
        raise SystemExit(block(f'{label} must not be a symlink.'))
    if kind == 'file' and not path.is_file():
        raise SystemExit(block(f'{label} is missing or is not a regular file.'))
    if kind == 'dir' and not path.is_dir():
        raise SystemExit(block(f'{label} is missing or is not a real directory.'))

if rollback_json.exists() or rollback_json.is_symlink():
    raise SystemExit(block('Session rollback metadata already exists. Refusing repeated rollback.'))
if any(session_path.glob('.rollback-partial-*')):
    raise SystemExit(block('Incomplete Rollback state exists in Session. Review is required.'))

try:
    manifest = json.loads(session_json.read_text(encoding='utf-8'))
    apply = json.loads(apply_json.read_text(encoding='utf-8'))
except (OSError, UnicodeError, json.JSONDecodeError) as exc:
    raise SystemExit(block(f'Session metadata could not be read: {safe_display(exc)}'))
if not isinstance(manifest, dict) or not isinstance(apply, dict):
    raise SystemExit(block('Session metadata roots must be objects.'))
if manifest.get('schema_version') != 1 or apply.get('schema_version') != 1:
    raise SystemExit(block('Unsupported Session metadata schema version.'))
if manifest.get('status') != 'APPLIED' or apply.get('status') != 'APPLIED':
    raise SystemExit(block('Session is not in APPLIED state.'))
if manifest.get('session_id') != session_path.name or apply.get('session_id') != session_path.name:
    raise SystemExit(block('Session ID metadata does not match Session directory name.'))

try:
    manifest_session = pathlib.Path(manifest['session_path']).expanduser().resolve(strict=True)
    manifest_staging = pathlib.Path(manifest['staging_path']).expanduser().resolve(strict=True)
    manifest_apply = pathlib.Path(manifest['apply_manifest_path']).expanduser().resolve(strict=True)
    manifest_backup = pathlib.Path(manifest['backup_path']).expanduser().resolve(strict=True)
    apply_backup = pathlib.Path(apply['backup_path']).expanduser().resolve(strict=True)
except (KeyError, TypeError, OSError) as exc:
    raise SystemExit(block(f'Apply Session path metadata is invalid: {safe_display(exc)}'))
if manifest_session != session_path or manifest_staging != staging:
    raise SystemExit(block('Session/staging path metadata does not match selected Session.'))
if manifest_apply != apply_json or manifest_backup != backup_dir or apply_backup != backup_dir:
    raise SystemExit(block('Apply/backup path metadata does not match selected Session.'))

try:
    repo = pathlib.Path(os.path.abspath(os.path.expanduser(apply['repository_root'])))
    repo_real = repo.resolve(strict=True)
    current_repo = pathlib.Path(os.path.abspath(os.path.expanduser(current_repo_arg)))
    current_repo_real = current_repo.resolve(strict=True)
except (KeyError, TypeError, OSError) as exc:
    raise SystemExit(block(f'Repository metadata is invalid: {safe_display(exc)}'))
if not repo.is_dir():
    raise SystemExit(block('Repository root is not a directory.'))
try:
    if not os.path.samefile(repo_real, current_repo_real):
        raise SystemExit(block('Current Git repository does not match the Apply repository.'))
except OSError as exc:
    raise SystemExit(block(f'Repository identity could not be verified: {safe_display(exc)}'))
if not current_branch:
    raise SystemExit(block('Detached HEAD is not supported for Package Rollback.'))
if current_branch != apply.get('branch'):
    raise SystemExit(block('Current branch does not match the Apply-time branch.'))
if not current_head or current_head != apply.get('repository_head') or current_head != manifest.get('apply_repository_head'):
    raise SystemExit(block('Current HEAD does not match the Apply-time repository HEAD.'))

created_dirs_raw = apply.get('created_directories')
if not isinstance(created_dirs_raw, list):
    raise SystemExit(block('Apply metadata predates safe Rollback directory tracking. Restage and re-Apply with Runtime 0.5+.'))
rows = apply.get('targets')
if not isinstance(rows, list) or not rows:
    raise SystemExit(block('Apply target metadata is missing or invalid.'))
staged_rows = manifest.get('staged_files')
if not isinstance(staged_rows, list):
    raise SystemExit(block('Staged file metadata is missing.'))
staged_by_path = {row.get('path'): row for row in staged_rows if isinstance(row, dict)}

seen = set()
targets = []
for row in rows:
    if not isinstance(row, dict):
        raise SystemExit(block('Each Apply target entry must be an object.'))
    rel = row.get('path')
    classification = row.get('classification')
    post_sha = row.get('post_apply_sha256')
    pre_sha = row.get('pre_apply_sha256')
    pre_mode_raw = row.get('pre_apply_mode')
    if not isinstance(rel, str) or not rel or rel.startswith('/') or '\\' in rel or has_control_or_format(rel):
        raise SystemExit(block(f'Unsafe Apply target path metadata: {safe_display(rel)}'))
    parts = rel.split('/')
    if any(part in {'', '.', '..'} for part in parts) or any(part.casefold() == '.git' for part in parts):
        raise SystemExit(block(f'Unsafe Apply target path component: {safe_display(rel)}'))
    canonical = unicodedata.normalize('NFC', rel).casefold()
    if canonical in seen:
        raise SystemExit(block(f'Duplicate/colliding Apply target path: {safe_display(rel)}'))
    seen.add(canonical)
    if classification not in {'NEW','REPLACE','IDENTICAL'}:
        raise SystemExit(block(f'Unknown Apply classification: {safe_display(rel)}'))
    if not isinstance(post_sha, str) or len(post_sha) != 64:
        raise SystemExit(block(f'Invalid post-Apply hash metadata: {safe_display(rel)}'))
    if classification in {'REPLACE','IDENTICAL'} and (not isinstance(pre_sha, str) or len(pre_sha) != 64):
        raise SystemExit(block(f'Invalid pre-Apply hash metadata: {safe_display(rel)}'))
    if classification == 'NEW' and pre_sha is not None:
        raise SystemExit(block(f'NEW target unexpectedly has pre-Apply hash: {safe_display(rel)}'))
    staged = staged_by_path.get(rel)
    if not isinstance(staged, dict) or staged.get('sha256') != post_sha:
        raise SystemExit(block(f'Staged/apply metadata mismatch: {safe_display(rel)}'))
    staged_path = staging.joinpath(*parts)
    if staged_path.is_symlink() or not staged_path.is_file() or sha256_file(staged_path) != post_sha:
        raise SystemExit(block(f'Staged rollback source is missing or changed: {safe_display(rel)}'))
    target = repo.joinpath(*parts)
    if not is_within(target.resolve(strict=False), repo_real):
        raise SystemExit(block(f'Rollback target escaped repository root: {safe_display(rel)}'))
    if target.is_symlink() or not target.is_file() or sha256_file(target) != post_sha:
        raise SystemExit(block(f'Applied target changed after Apply: {safe_display(rel)}'))
    if classification in {'REPLACE','IDENTICAL'}:
        try:
            expected_mode = int(pre_mode_raw, 8)
        except (TypeError, ValueError):
            raise SystemExit(block(f'Invalid pre-Apply mode metadata: {safe_display(rel)}'))
    else:
        expected_mode = expected_new_mode(staged.get('archive_mode'))
    if stat.S_IMODE(target.stat().st_mode) != expected_mode:
        raise SystemExit(block(f'Applied target mode changed after Apply: {safe_display(rel)}'))
    backup_path = None
    if classification == 'REPLACE':
        backup_raw = row.get('backup_path')
        if not isinstance(backup_raw, str):
            raise SystemExit(block(f'Replace backup path metadata missing: {safe_display(rel)}'))
        try:
            backup_path = pathlib.Path(backup_raw).expanduser().resolve(strict=True)
            expected_backup = (backup_dir / 'replaced').joinpath(*parts).resolve(strict=True)
        except OSError as exc:
            raise SystemExit(block(f'Replace backup could not be resolved: {safe_display(exc)}'))
        if backup_path != expected_backup or backup_path.is_symlink() or not backup_path.is_file() or sha256_file(backup_path) != pre_sha:
            raise SystemExit(block(f'Replace backup validation failed: {safe_display(rel)}'))
    targets.append({'rel':rel,'parts':parts,'classification':classification,'pre_sha':pre_sha,'post_sha':post_sha,'pre_mode':(int(pre_mode_raw,8) if pre_mode_raw is not None else None),'post_mode':expected_mode,'target':target,'staged':staged_path,'backup':backup_path})

target_paths = {item['rel'] for item in targets}
try:
    status_data = pathlib.Path(status_file_arg).read_bytes()
except OSError as exc:
    raise SystemExit(block(f'Git status snapshot could not be read: {safe_display(exc)}'))
entries = status_data.split(b'\0')
i = 0
while i < len(entries):
    token = entries[i]
    if not token:
        i += 1
        continue
    if len(token) < 4 or token[2:3] != b' ':
        raise SystemExit(block('Git status snapshot has an unsupported format.'))
    try:
        xy = token[:2].decode('ascii')
        path = token[3:].decode('utf-8')
    except UnicodeError:
        raise SystemExit(block('Git status contains an undecodable path.'))
    status_paths = [path]
    if 'R' in xy or 'C' in xy:
        i += 1
        if i >= len(entries) or not entries[i]:
            raise SystemExit(block('Git rename/copy status is incomplete.'))
        status_paths.append(entries[i].decode('utf-8'))
    if xy[0] not in {' ', '?'}:
        raise SystemExit(block('Index/staged changes exist after Apply. Rollback will not proceed.'))
    for status_path in status_paths:
        if status_path not in target_paths:
            raise SystemExit(block(f'Unrelated worktree change exists after Apply: {safe_display(status_path)}'))
    i += 1

created_dirs = []
created_rel_set = set()
for rel in created_dirs_raw:
    if not isinstance(rel, str) or not rel or rel.startswith('/') or '\\' in rel or has_control_or_format(rel):
        raise SystemExit(block(f'Unsafe created directory metadata: {safe_display(rel)}'))
    parts = rel.split('/')
    if any(part in {'', '.', '..'} for part in parts) or any(part.casefold() == '.git' for part in parts):
        raise SystemExit(block(f'Unsafe created directory path: {safe_display(rel)}'))
    path = repo.joinpath(*parts)
    if path.is_symlink() or not path.is_dir() or not is_within(path.resolve(strict=True), repo_real):
        raise SystemExit(block(f'Apply-created directory is missing or unsafe: {safe_display(rel)}'))
    created_dirs.append(path)
    created_rel_set.add(rel)
allowed_fs = target_paths | created_rel_set
for directory in created_dirs:
    for child in directory.iterdir():
        rel = child.relative_to(repo).as_posix()
        if rel not in allowed_fs:
            raise SystemExit(block(f'Unexpected entry exists in Apply-created directory: {safe_display(rel)}'))

partial = session_path / f'.rollback-partial-{secrets.token_hex(6)}'
try:
    partial.mkdir(mode=0o700)
except OSError as exc:
    raise SystemExit(block(f'Rollback partial state could not be created: {safe_display(exc)}'))
mutated = []

def atomic_copy(source, target, mode, expected_sha):
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.parent / f'.kpackage-rollback-{manifest["session_id"]}-{secrets.token_hex(4)}.tmp'
    try:
        shutil.copy2(source, temp)
        os.chmod(temp, mode)
        if sha256_file(temp) != expected_sha:
            raise RuntimeError('Rollback temporary copy hash mismatch')
        os.replace(temp, target)
    finally:
        if temp.exists():
            temp.unlink()

def restore_applied_state():
    errors = []
    for item in reversed(mutated):
        try:
            if item['target'].is_symlink():
                raise RuntimeError('target became symlink during failure recovery')
            atomic_copy(item['staged'], item['target'], item['post_mode'], item['post_sha'])
        except BaseException as exc:
            errors.append(f"{item['rel']}: {exc!r}")
    for item in targets:
        try:
            target = item['target']
            if target.is_symlink() or not target.is_file() or sha256_file(target) != item['post_sha'] or stat.S_IMODE(target.stat().st_mode) != item['post_mode']:
                raise RuntimeError('applied target state not restored')
        except BaseException as exc:
            errors.append(f"{item['rel']}: {exc!r}")
    return (not errors, errors)

try:
    fail_after = 0
    if os.environ.get('KPACKAGE_TEST_MODE') == '1':
        raw_fail = os.environ.get('KPACKAGE_TEST_INJECT_ROLLBACK_FAILURE_AFTER', '')
        if raw_fail:
            fail_after = int(raw_fail)
    mutation_count = 0
    for item in sorted(targets, key=lambda x: x['rel']):
        if item['classification'] == 'IDENTICAL':
            continue
        mutated.append(item)
        if item['classification'] == 'NEW':
            item['target'].unlink()
        else:
            atomic_copy(item['backup'], item['target'], int(item['pre_mode']), item['pre_sha'])
        mutation_count += 1
        if fail_after and mutation_count >= fail_after:
            raise RuntimeError('Injected Rollback failure for integration test')
    for directory in sorted(created_dirs, key=lambda p: (-len(p.parts), p.as_posix())):
        directory.rmdir()
    for item in targets:
        target = item['target']
        if item['classification'] == 'NEW':
            if target.exists() or target.is_symlink():
                raise RuntimeError(f"NEW target still exists after Rollback: {item['rel']!r}")
        else:
            if target.is_symlink() or not target.is_file() or sha256_file(target) != item['pre_sha'] or stat.S_IMODE(target.stat().st_mode) != int(item['pre_mode']):
                raise RuntimeError(f"Original target state not restored: {item['rel']!r}")
    for directory in created_dirs:
        if directory.exists() or directory.is_symlink():
            raise RuntimeError(f'Apply-created directory still exists: {directory!r}')
    rolled_at = dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00','Z')
    rollback_metadata = {
        'schema_version':1,'status':'ROLLED_BACK','session_id':manifest['session_id'],'runtime_version':runtime_version,
        'rolled_back_at_utc':rolled_at,'repository_root':str(repo),'branch':current_branch,'repository_head':current_head,
        'apply_manifest_path':str(apply_json),'backup_path':str(backup_dir),
        'removed_new_files':[item['rel'] for item in targets if item['classification']=='NEW'],
        'restored_replaced_files':[item['rel'] for item in targets if item['classification']=='REPLACE'],
        'untouched_identical_files':[item['rel'] for item in targets if item['classification']=='IDENTICAL'],
        'removed_created_directories':created_dirs_raw,
    }
    # Remove the transient marker before committing Session metadata.
    # After session.json becomes ROLLED_BACK there must be no later fallible
    # filesystem operation that can send execution into APPLIED-state recovery.
    shutil.rmtree(partial)

    write_json_atomic(rollback_json, rollback_metadata)

    if (
        os.environ.get('KPACKAGE_TEST_MODE') == '1'
        and os.environ.get('KPACKAGE_TEST_INJECT_ROLLBACK_METADATA_FAILURE') == '1'
    ):
        raise RuntimeError('Injected Rollback metadata failure for integration test')

    updated_manifest = dict(manifest)
    updated_manifest['status'] = 'ROLLED_BACK'
    updated_manifest['rolled_back_at_utc'] = rolled_at
    updated_manifest['rollback_manifest_path'] = str(rollback_json)
    write_json_atomic(session_json, updated_manifest)
except BaseException as exc:
    restored, errors = restore_applied_state()
    if restored:
        try:
            if rollback_json.exists(): rollback_json.unlink()
            if partial.exists(): shutil.rmtree(partial)
        except OSError:
            pass
        print('===== KPACKAGE ROLLBACK =====')
        print()
        print('Result: ROLLBACK_FAILED_RESTORED')
        print(f'Reason: {safe_display(exc)}')
        print('Applied repository state restoration verified: YES')
        print('Session status remains: APPLIED')
        print('Commit performed: NO')
        print('Push performed: NO')
        print()
        print('===== END KPACKAGE ROLLBACK =====')
        raise SystemExit(1)
    print('===== KPACKAGE ROLLBACK =====')
    print()
    print('Result: ROLLBACK_FAILED_RESTORE_INCOMPLETE')
    print(f'Reason: {safe_display(exc)}')
    print('Applied repository state restoration verified: NO')
    for message in errors[:10]: print(f'- {safe_display(message)}')
    print(f'Rollback evidence preserved at: {safe_display(partial)}')
    print('STOP: manual review required.')
    print('Commit performed: NO')
    print('Push performed: NO')
    print()
    print('===== END KPACKAGE ROLLBACK =====')
    raise SystemExit(1)

print('===== KPACKAGE ROLLBACK =====')
print()
print('Result: ROLLED_BACK')
print(f"Session ID: {safe_display(manifest['session_id'])}")
print(f'Repository: {safe_display(repo)}')
print(f'Branch: {current_branch}')
print(f'Repository HEAD: {current_head}')
print(f"NEW removed: {sum(1 for item in targets if item['classification']=='NEW')}")
print(f"REPLACE restored: {sum(1 for item in targets if item['classification']=='REPLACE')}")
print(f"IDENTICAL untouched: {sum(1 for item in targets if item['classification']=='IDENTICAL')}")
print(f'Rollback metadata: {safe_display(rollback_json)}')
print('Backup retained: YES')
print('Commit performed: NO')
print('Push performed: NO')
print()
print('Next: kclip review')
print()
print('===== END KPACKAGE ROLLBACK =====')
raise SystemExit(0)
PY
  rc=$?
  rm -f "$status_file"
  return "$rc"
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
    diff)
      _kpackage_diff "$@"
      ;;
    apply)
      _kpackage_apply "$@"
      ;;
    rollback)
      _kpackage_rollback "$@"
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
