#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME="${1:-$SCRIPT_DIR/koppy_package.sh}"

if [ ! -f "$RUNTIME" ]; then
  echo "FAIL: runtime not found: $RUNTIME"
  exit 1
fi

RUNTIME="$(cd "$(dirname "$RUNTIME")" && pwd)/$(basename "$RUNTIME")"

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

with zipfile.ZipFile(d / "stage-valid.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("600_KoppyOS/stage-test.txt", "stage-ok\n")
    z.writestr("900_Lab/日本語-stage.txt", "日本語-ok\n")

with zipfile.ZipFile(d / "stage-wrapper.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("wrapper/600_KoppyOS/exact-path.txt", "do-not-strip-wrapper\n")
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

# ------------------------------------------------------------
# Stage tests
# ------------------------------------------------------------
STAGE_REPO="$TMP/repo"
SESSION_ROOT="$TMP/sessions"

mkdir -p "$STAGE_REPO"
git -C "$STAGE_REPO" init -q
git -C "$STAGE_REPO" checkout -q -b main
git -C "$STAGE_REPO" config user.email "kpackage-test@example.invalid"
git -C "$STAGE_REPO" config user.name "KPackage Test"
printf 'baseline\n' > "$STAGE_REPO/README.md"
git -C "$STAGE_REPO" add README.md
git -C "$STAGE_REPO" commit -q -m "baseline"

BASE_HEAD="$(git -C "$STAGE_REPO" rev-parse HEAD)"

STAGE_OUT="$TMP/stage-valid.out"
(
  cd "$STAGE_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$SESSION_ROOT" bash "$RUNTIME" stage "$TMP/stage-valid.zip"
) >"$STAGE_OUT" 2>&1
stage_rc=$?

if [ "$stage_rc" -ne 0 ]; then
  echo "FAIL: stage-valid rc=$stage_rc expected=0"
  cat "$STAGE_OUT"
  fail=1
elif ! grep -Fq "Result: STAGED" "$STAGE_OUT"; then
  echo "FAIL: stage-valid did not report STAGED"
  cat "$STAGE_OUT"
  fail=1
else
  echo "PASS: stage-valid -> STAGED"
fi

if [ -n "$(git -C "$STAGE_REPO" status --porcelain=v1 --untracked-files=all)" ]; then
  echo "FAIL: Stage modified repository worktree"
  git -C "$STAGE_REPO" status --short
  fail=1
elif [ "$(git -C "$STAGE_REPO" rev-parse HEAD)" != "$BASE_HEAD" ]; then
  echo "FAIL: Stage changed repository HEAD"
  fail=1
else
  echo "PASS: Stage left repository unchanged"
fi

if ! python3 - "$SESSION_ROOT" "$STAGE_REPO" "$TMP/stage-valid.zip" "$BASE_HEAD" <<'PY'
from pathlib import Path
import hashlib
import json
import sys

root = Path(sys.argv[1])
repo = Path(sys.argv[2]).resolve()
package = Path(sys.argv[3]).resolve()
head = sys.argv[4]

sessions = [p for p in root.iterdir() if p.is_dir() and not p.name.startswith(".partial-")]
if len(sessions) != 1:
    print(f"FAIL: expected 1 complete session, found {len(sessions)}")
    raise SystemExit(1)

session = sessions[0]
manifest = json.loads((session / "session.json").read_text(encoding="utf-8"))

if manifest["status"] != "STAGED":
    raise SystemExit("FAIL: session status")
if Path(manifest["repository_root"]) != repo:
    raise SystemExit("FAIL: repository_root")
if manifest["branch"] != "main":
    raise SystemExit("FAIL: branch")
if manifest["repository_head"] != head:
    raise SystemExit("FAIL: repository_head")
if Path(manifest["package_path"]) != package:
    raise SystemExit("FAIL: package_path")
if Path(manifest["staging_path"]) != session / "staging":
    raise SystemExit("FAIL: staging_path")

expected = {
    "600_KoppyOS/stage-test.txt": b"stage-ok\n",
    "900_Lab/日本語-stage.txt": "日本語-ok\n".encode(),
}

rows = {row["path"]: row for row in manifest["staged_files"]}
if set(rows) != set(expected):
    raise SystemExit(f"FAIL: staged path set {set(rows)!r}")

for rel, content in expected.items():
    path = session / "staging" / rel
    if path.read_bytes() != content:
        raise SystemExit(f"FAIL: staged content {rel}")
    digest = hashlib.sha256(content).hexdigest()
    if rows[rel]["sha256"] != digest:
        raise SystemExit(f"FAIL: staged hash {rel}")

print("PASS: Stage session manifest and hashes verified")
PY
then
  fail=1
fi

REVIEW_OUT="$TMP/stage-review.out"
(
  cd "$STAGE_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$SESSION_ROOT" bash "$RUNTIME" stage "$TMP/secret.zip"
) >"$REVIEW_OUT" 2>&1
review_rc=$?

if [ "$review_rc" -ne 2 ]; then
  echo "FAIL: Stage REVIEW rc=$review_rc expected=2"
  cat "$REVIEW_OUT"
  fail=1
elif ! grep -Fq "Result: REVIEW" "$REVIEW_OUT"; then
  echo "FAIL: Stage REVIEW result missing"
  cat "$REVIEW_OUT"
  fail=1
else
  echo "PASS: Stage rejects REVIEW package"
fi

session_count="$(find "$SESSION_ROOT" -mindepth 1 -maxdepth 1 -type d ! -name '.partial-*' | wc -l | tr -d ' ')"
if [ "$session_count" -ne 1 ]; then
  echo "FAIL: REVIEW package created a Stage session"
  fail=1
else
  echo "PASS: REVIEW package created no Stage session"
fi

printf 'dirty\n' >> "$STAGE_REPO/README.md"
DIRTY_OUT="$TMP/stage-dirty.out"
(
  cd "$STAGE_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$SESSION_ROOT" bash "$RUNTIME" stage "$TMP/stage-valid.zip"
) >"$DIRTY_OUT" 2>&1
dirty_rc=$?
git -C "$STAGE_REPO" checkout -q -- README.md

if [ "$dirty_rc" -ne 1 ]; then
  echo "FAIL: dirty Stage rc=$dirty_rc expected=1"
  cat "$DIRTY_OUT"
  fail=1
elif ! grep -Fq "worktree must be clean" "$DIRTY_OUT"; then
  echo "FAIL: dirty Stage reason missing"
  cat "$DIRTY_OUT"
  fail=1
else
  echo "PASS: dirty worktree blocks Stage"
fi

WRAPPER_ROOT="$TMP/wrapper-sessions"
WRAPPER_OUT="$TMP/stage-wrapper.out"
(
  cd "$STAGE_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$WRAPPER_ROOT" bash "$RUNTIME" stage "$TMP/stage-wrapper.zip"
) >"$WRAPPER_OUT" 2>&1
wrapper_rc=$?

if [ "$wrapper_rc" -ne 0 ]; then
  echo "FAIL: wrapper Stage rc=$wrapper_rc expected=0"
  cat "$WRAPPER_OUT"
  fail=1
elif ! python3 - "$WRAPPER_ROOT" <<'PY'
from pathlib import Path
import json
import sys

root = Path(sys.argv[1])
sessions = [p for p in root.iterdir() if p.is_dir() and not p.name.startswith(".partial-")]
if len(sessions) != 1:
    raise SystemExit("FAIL: wrapper session count")
manifest = json.loads((sessions[0] / "session.json").read_text(encoding="utf-8"))
paths = [row["path"] for row in manifest["staged_files"]]
if paths != ["wrapper/600_KoppyOS/exact-path.txt"]:
    raise SystemExit(f"FAIL: wrapper path was changed: {paths!r}")
print("PASS: Stage preserved wrapper path exactly")
PY
then
  fail=1
fi

if find "$SESSION_ROOT" "$WRAPPER_ROOT" -maxdepth 1 -type d -name '.partial-*' | grep -q .; then
  echo "FAIL: partial Stage session was left behind"
  fail=1
else
  echo "PASS: no partial Stage sessions remain"
fi

if [ "$fail" -ne 0 ]; then
  echo "RESULT: FAIL"
  exit 1
fi

echo "RESULT: PASS"
