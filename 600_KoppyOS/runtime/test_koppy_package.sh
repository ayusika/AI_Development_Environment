#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME="${1:-$SCRIPT_DIR/koppy_package.sh}"

if [ ! -f "$RUNTIME" ]; then
  echo "FAIL: runtime not found: $RUNTIME"
  exit 1
fi

if ! bash -n "$RUNTIME"; then
  echo "FAIL: bash -n runtime"
  exit 1
fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/kpackage-test.XXXXXX")" || exit 1
trap 'rm -rf "$TMP"' EXIT

python3 - "$TMP" <<'PY'
import pathlib
import stat
import sys
import zipfile

d = pathlib.Path(sys.argv[1])

with zipfile.ZipFile(d / "valid.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("600_KoppyOS/test.txt", "ok\n")
    z.writestr("900_Lab/日本語 file.txt", "ok\n")

with zipfile.ZipFile(d / "secret.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("600_KoppyOS/.env", "DO_NOT_PRINT_THIS_SECRET_VALUE\n")

with zipfile.ZipFile(d / "traversal.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("../escape.txt", "bad\n")

with zipfile.ZipFile(d / "git.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr(".git/config", "bad\n")

with zipfile.ZipFile(d / "symlink.zip", "w") as z:
    info = zipfile.ZipInfo("link")
    info.create_system = 3
    info.external_attr = (stat.S_IFLNK | 0o777) << 16
    z.writestr(info, "target")

with zipfile.ZipFile(d / "duplicate.zip", "w") as z:
    z.writestr("A/File.txt", "one")
    z.writestr("a/file.txt", "two")

with zipfile.ZipFile(d / "control.zip", "w") as z:
    z.writestr("600_KoppyOS/line\nFORGED_RESULT_PASS.txt", "one")
    z.writestr("600_KoppyOS/escape\x1b[31mRED.txt", "two")
    z.writestr("600_KoppyOS/tab\tname.txt", "three")
PY

fail=0

run_case() {
  local name="$1"
  local expected_rc="$2"
  local expected_result="$3"
  local out="$TMP/$name.out"

  bash "$RUNTIME" inspect "$TMP/$name.zip" >"$out" 2>&1
  local rc=$?

  if [ "$rc" -ne "$expected_rc" ]; then
    echo "FAIL: $name rc=$rc expected=$expected_rc"
    cat "$out"
    fail=1
    return
  fi

  if ! grep -Fq "Result: $expected_result" "$out"; then
    echo "FAIL: $name result expected=$expected_result"
    cat "$out"
    fail=1
    return
  fi

  echo "PASS: $name -> $expected_result (rc=$rc)"
}

run_case valid 0 PASS
run_case secret 2 REVIEW
run_case traversal 1 BLOCK
run_case git 1 BLOCK
run_case symlink 1 BLOCK
run_case duplicate 1 BLOCK
run_case control 1 BLOCK

# Ensure secret file contents were never printed.
if grep -Fq "DO_NOT_PRINT_THIS_SECRET_VALUE" "$TMP/secret.out"; then
  echo "FAIL: secret content leaked into inspect output"
  fail=1
else
  echo "PASS: secret content not printed"
fi

# Archive-controlled path strings must never emit literal Terminal control bytes.
if ! python3 - "$TMP/control.out" <<'PY'
from pathlib import Path
import sys

data = Path(sys.argv[1]).read_bytes()
text = data.decode("utf-8", errors="strict")

problems = []
if b"\x1b" in data:
    problems.append("literal ESC byte leaked")
if "line\\nFORGED_RESULT_PASS.txt" not in text:
    problems.append("newline path was not escaped visibly")
if "escape\\x1b[31mRED.txt" not in text:
    problems.append("ESC path was not escaped visibly")
if "tab\\tname.txt" not in text:
    problems.append("tab path was not escaped visibly")

if problems:
    print("FAIL: control-character output hardening: " + "; ".join(problems))
    raise SystemExit(1)

print("PASS: archive path control characters are escaped in output")
PY
then
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo "RESULT: FAIL"
  exit 1
fi

echo "RESULT: PASS"
