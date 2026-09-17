#!/usr/bin/env bash

# Koppy Package Utility
# Runtime Source of Truth
# Version: 0.1.0
#
# Safe to source from ~/.bashrc:
# this file intentionally does not change caller shell options.

KPACKAGE_RUNTIME_VERSION="0.1.0"

_kpackage_help() {
  cat <<'EOF'
Koppy Package Utility 0.1.0

Implemented:
  kpackage inspect <package.zip>
      Read-only ZIP inspection. Does not extract or modify the repository.

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

kpackage() {
  local command="${1:-help}"

  if [ "$#" -gt 0 ]; then
    shift
  fi

  case "$command" in
    inspect)
      _kpackage_inspect "$@"
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
