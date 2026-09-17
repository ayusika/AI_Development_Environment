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

with zipfile.ZipFile(d / "diff-valid.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("new.txt", "new-from-package\n")
    z.writestr("same.txt", "same-content\n")
    z.writestr("replace.txt", "replacement-content\n")

with zipfile.ZipFile(d / "apply-failure.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("a-replace.txt", "replacement-after-failure-test\n")
    z.writestr("z-new.txt", "new-before-injected-failure\n")

with zipfile.ZipFile(d / "rollback-valid.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("nested/new.txt", "new-from-package\n")
    z.writestr("same.txt", "same-content\n")
    z.writestr("replace.txt", "replacement-content\n")
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

# ------------------------------------------------------------
# Diff tests
# ------------------------------------------------------------
DIFF_REPO="$TMP/diff-repo"
DIFF_SESSION_ROOT="$TMP/diff-sessions"

mkdir -p "$DIFF_REPO"
git -C "$DIFF_REPO" init -q
git -C "$DIFF_REPO" checkout -q -b main
git -C "$DIFF_REPO" config user.email "kpackage-test@example.invalid"
git -C "$DIFF_REPO" config user.name "KPackage Test"
printf 'baseline\n' > "$DIFF_REPO/README.md"
printf 'same-content\n' > "$DIFF_REPO/same.txt"
printf 'old-content\n' > "$DIFF_REPO/replace.txt"
printf 'repo-only\n' > "$DIFF_REPO/repo-only.txt"
git -C "$DIFF_REPO" add README.md same.txt replace.txt repo-only.txt
git -C "$DIFF_REPO" commit -q -m "diff baseline"

DIFF_BASE_HEAD="$(git -C "$DIFF_REPO" rev-parse HEAD)"

DIFF_STAGE_A="$TMP/diff-stage-a.out"
(
  cd "$DIFF_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$DIFF_SESSION_ROOT" bash "$RUNTIME" stage "$TMP/diff-valid.zip"
) >"$DIFF_STAGE_A" 2>&1
diff_stage_a_rc=$?

if [ "$diff_stage_a_rc" -ne 0 ]; then
  echo "FAIL: diff fixture Stage A rc=$diff_stage_a_rc"
  cat "$DIFF_STAGE_A"
  fail=1
fi

DIFF_SESSION_A="$(find "$DIFF_SESSION_ROOT" -mindepth 1 -maxdepth 1 -type d ! -name '.partial-*' | head -1)"

if [ -z "$DIFF_SESSION_A" ]; then
  echo "FAIL: diff fixture Session A not found"
  fail=1
else
  DIFF_OUT="$TMP/diff-valid.out"
  (
    cd "$DIFF_REPO" || exit 1
    KPACKAGE_SESSION_ROOT="$DIFF_SESSION_ROOT" bash "$RUNTIME" diff "$DIFF_SESSION_A"
  ) >"$DIFF_OUT" 2>&1
  diff_rc=$?

  if [ "$diff_rc" -ne 0 ]; then
    echo "FAIL: diff-valid rc=$diff_rc expected=0"
    cat "$DIFF_OUT"
    fail=1
  elif ! grep -Fq "Result: DIFF_READY" "$DIFF_OUT"; then
    echo "FAIL: diff-valid result missing"
    cat "$DIFF_OUT"
    fail=1
  elif ! grep -Fq "NEW       'new.txt'" "$DIFF_OUT"; then
    echo "FAIL: NEW classification missing"
    cat "$DIFF_OUT"
    fail=1
  elif ! grep -Fq "IDENTICAL 'same.txt'" "$DIFF_OUT"; then
    echo "FAIL: IDENTICAL classification missing"
    cat "$DIFF_OUT"
    fail=1
  elif ! grep -Fq "REPLACE   'replace.txt'" "$DIFF_OUT"; then
    echo "FAIL: REPLACE classification missing"
    cat "$DIFF_OUT"
    fail=1
  elif ! grep -Fq "NEW: 1" "$DIFF_OUT" ||
       ! grep -Fq "REPLACE: 1" "$DIFF_OUT" ||
       ! grep -Fq "IDENTICAL: 1" "$DIFF_OUT"; then
    echo "FAIL: diff summary counts incorrect"
    cat "$DIFF_OUT"
    fail=1
  elif grep -Fq "repo-only.txt" "$DIFF_OUT"; then
    echo "FAIL: repository-only file was inferred into Package Diff"
    cat "$DIFF_OUT"
    fail=1
  else
    echo "PASS: Diff classified NEW / REPLACE / IDENTICAL correctly"
  fi

  if [ -n "$(git -C "$DIFF_REPO" status --porcelain=v1 --untracked-files=all)" ] ||
     [ "$(git -C "$DIFF_REPO" rev-parse HEAD)" != "$DIFF_BASE_HEAD" ]; then
    echo "FAIL: Diff modified repository state"
    fail=1
  else
    echo "PASS: Diff left repository unchanged"
  fi

  printf 'dirty\n' >> "$DIFF_REPO/README.md"
  DIFF_DIRTY_OUT="$TMP/diff-dirty.out"
  (
    cd "$DIFF_REPO" || exit 1
    KPACKAGE_SESSION_ROOT="$DIFF_SESSION_ROOT" bash "$RUNTIME" diff "$DIFF_SESSION_A"
  ) >"$DIFF_DIRTY_OUT" 2>&1
  diff_dirty_rc=$?
  git -C "$DIFF_REPO" checkout -q -- README.md

  if [ "$diff_dirty_rc" -ne 1 ] ||
     ! grep -Fq "Worktree must be clean" "$DIFF_DIRTY_OUT"; then
    echo "FAIL: dirty worktree did not block Diff"
    cat "$DIFF_DIRTY_OUT"
    fail=1
  else
    echo "PASS: dirty worktree blocks Diff"
  fi
fi

# Create Session B under the same HEAD for stale-HEAD validation.
DIFF_STAGE_B="$TMP/diff-stage-b.out"
(
  cd "$DIFF_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$DIFF_SESSION_ROOT" bash "$RUNTIME" stage "$TMP/diff-valid.zip"
) >"$DIFF_STAGE_B" 2>&1
diff_stage_b_rc=$?

if [ "$diff_stage_b_rc" -ne 0 ]; then
  echo "FAIL: diff fixture Stage B rc=$diff_stage_b_rc"
  cat "$DIFF_STAGE_B"
  fail=1
fi

DIFF_SESSION_B="$(
  find "$DIFF_SESSION_ROOT" -mindepth 1 -maxdepth 1 -type d ! -name '.partial-*' |
  grep -Fvx "$DIFF_SESSION_A" |
  head -1
)"

if [ -z "$DIFF_SESSION_B" ]; then
  echo "FAIL: diff fixture Session B not found"
  fail=1
else
  printf 'later\n' > "$DIFF_REPO/later.txt"
  git -C "$DIFF_REPO" add later.txt
  git -C "$DIFF_REPO" commit -q -m "advance head"

  DIFF_STALE_OUT="$TMP/diff-stale.out"
  (
    cd "$DIFF_REPO" || exit 1
    KPACKAGE_SESSION_ROOT="$DIFF_SESSION_ROOT" bash "$RUNTIME" diff "$DIFF_SESSION_B"
  ) >"$DIFF_STALE_OUT" 2>&1
  diff_stale_rc=$?

  if [ "$diff_stale_rc" -ne 1 ] ||
     ! grep -Fq "Current HEAD does not match" "$DIFF_STALE_OUT"; then
    echo "FAIL: stale HEAD did not block Diff"
    cat "$DIFF_STALE_OUT"
    fail=1
  else
    echo "PASS: stale HEAD blocks Diff"
  fi
fi

# Tamper Session A after restoring the Stage-time HEAD in the disposable test repo.
# Keep branch=main so the tamper check is the first failing safety gate.
if [ -n "$DIFF_SESSION_A" ]; then
  git -C "$DIFF_REPO" reset -q --hard "$DIFF_BASE_HEAD"

  printf 'tampered\n' >> "$DIFF_SESSION_A/staging/same.txt"
  DIFF_TAMPER_OUT="$TMP/diff-tamper.out"
  (
    cd "$DIFF_REPO" || exit 1
    KPACKAGE_SESSION_ROOT="$DIFF_SESSION_ROOT" bash "$RUNTIME" diff "$DIFF_SESSION_A"
  ) >"$DIFF_TAMPER_OUT" 2>&1
  diff_tamper_rc=$?

  if [ "$diff_tamper_rc" -ne 1 ] ||
     ! grep -Fq "Staged file size no longer matches" "$DIFF_TAMPER_OUT"; then
    echo "FAIL: staged file tamper did not block Diff"
    cat "$DIFF_TAMPER_OUT"
    fail=1
  else
    echo "PASS: staged file tamper blocks Diff"
  fi
fi

# ------------------------------------------------------------
# Apply tests
# ------------------------------------------------------------
APPLY_REPO="$TMP/apply-repo"
APPLY_SESSION_ROOT="$TMP/apply-sessions"

mkdir -p "$APPLY_REPO"
git -C "$APPLY_REPO" init -q
git -C "$APPLY_REPO" checkout -q -b main
git -C "$APPLY_REPO" config user.email "kpackage-test@example.invalid"
git -C "$APPLY_REPO" config user.name "KPackage Test"
printf 'baseline\n' > "$APPLY_REPO/README.md"
printf 'same-content\n' > "$APPLY_REPO/same.txt"
printf 'old-content\n' > "$APPLY_REPO/replace.txt"
printf 'repo-only\n' > "$APPLY_REPO/repo-only.txt"
git -C "$APPLY_REPO" add README.md same.txt replace.txt repo-only.txt
git -C "$APPLY_REPO" commit -q -m "apply baseline"

APPLY_BASE_HEAD="$(git -C "$APPLY_REPO" rev-parse HEAD)"

stage_apply_session() {
  local out="$1"
  (
    cd "$APPLY_REPO" || return 1
    KPACKAGE_SESSION_ROOT="$APPLY_SESSION_ROOT" bash "$RUNTIME" stage "$TMP/diff-valid.zip"
  ) >"$out" 2>&1
}

session_from_output() {
  sed -n "s/^Session path: '\\(.*\\)'$/\\1/p" "$1"
}

APPLY_STAGE_OUT="$TMP/apply-stage.out"
stage_apply_session "$APPLY_STAGE_OUT"
apply_stage_rc=$?

if [ "$apply_stage_rc" -ne 0 ]; then
  echo "FAIL: Apply fixture Stage rc=$apply_stage_rc"
  cat "$APPLY_STAGE_OUT"
  fail=1
fi

APPLY_SESSION="$(session_from_output "$APPLY_STAGE_OUT")"

if [ -z "$APPLY_SESSION" ]; then
  echo "FAIL: Apply fixture Session not found"
  fail=1
else
  APPLY_OUT="$TMP/apply-success.out"
  (
    cd "$APPLY_REPO" || exit 1
    KPACKAGE_SESSION_ROOT="$APPLY_SESSION_ROOT" bash "$RUNTIME" apply "$APPLY_SESSION"
  ) >"$APPLY_OUT" 2>&1
  apply_rc=$?

  if [ "$apply_rc" -ne 0 ] ||
     ! grep -Fq "Result: APPLIED" "$APPLY_OUT"; then
    echo "FAIL: Apply success rc=$apply_rc"
    cat "$APPLY_OUT"
    fail=1
  elif [ "$(cat "$APPLY_REPO/new.txt")" != "new-from-package" ] ||
       [ "$(cat "$APPLY_REPO/replace.txt")" != "replacement-content" ] ||
       [ "$(cat "$APPLY_REPO/same.txt")" != "same-content" ] ||
       [ "$(cat "$APPLY_REPO/repo-only.txt")" != "repo-only" ]; then
    echo "FAIL: Apply repository contents incorrect"
    fail=1
  elif [ "$(git -C "$APPLY_REPO" rev-parse HEAD)" != "$APPLY_BASE_HEAD" ]; then
    echo "FAIL: Apply changed repository HEAD"
    fail=1
  else
    echo "PASS: Apply handled NEW / REPLACE / IDENTICAL without commit"
  fi

  if ! python3 - "$APPLY_SESSION" <<'PY'
from pathlib import Path
import hashlib
import json
import sys

session = Path(sys.argv[1])
manifest = json.loads((session / "session.json").read_text(encoding="utf-8"))
apply = json.loads((session / "apply.json").read_text(encoding="utf-8"))

if manifest["status"] != "APPLIED":
    raise SystemExit("FAIL: Session status not APPLIED")
if apply["status"] != "APPLIED":
    raise SystemExit("FAIL: apply.json status")
if apply["new_files"] != ["new.txt"]:
    raise SystemExit(f"FAIL: new_files {apply['new_files']!r}")
if apply["replaced_files"] != ["replace.txt"]:
    raise SystemExit(f"FAIL: replaced_files {apply['replaced_files']!r}")
if apply["identical_files"] != ["same.txt"]:
    raise SystemExit(f"FAIL: identical_files {apply['identical_files']!r}")

backup = session / "backup" / "replaced" / "replace.txt"
if backup.read_bytes() != b"old-content\n":
    raise SystemExit("FAIL: replaced backup content")
if hashlib.sha256(backup.read_bytes()).hexdigest() != next(
    row["pre_apply_sha256"] for row in apply["targets"] if row["path"] == "replace.txt"
):
    raise SystemExit("FAIL: backup hash metadata")

print("PASS: Apply Session metadata and backup verified")
PY
  then
    fail=1
  fi

  REAPPLY_OUT="$TMP/apply-reapply.out"
  (
    cd "$APPLY_REPO" || exit 1
    KPACKAGE_SESSION_ROOT="$APPLY_SESSION_ROOT" bash "$RUNTIME" apply "$APPLY_SESSION"
  ) >"$REAPPLY_OUT" 2>&1
  reapply_rc=$?

  if [ "$reapply_rc" -ne 1 ] ||
     ! grep -Fq "Session backup already exists" "$REAPPLY_OUT"; then
    echo "FAIL: repeated Apply was not blocked"
    cat "$REAPPLY_OUT"
    fail=1
  else
    echo "PASS: repeated Apply blocks"
  fi
fi

git -C "$APPLY_REPO" reset -q --hard "$APPLY_BASE_HEAD"
git -C "$APPLY_REPO" clean -fdq

APPLY_DIRTY_STAGE="$TMP/apply-dirty-stage.out"
stage_apply_session "$APPLY_DIRTY_STAGE"
APPLY_DIRTY_SESSION="$(session_from_output "$APPLY_DIRTY_STAGE")"
printf 'dirty\n' >> "$APPLY_REPO/README.md"

APPLY_DIRTY_OUT="$TMP/apply-dirty.out"
(
  cd "$APPLY_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$APPLY_SESSION_ROOT" bash "$RUNTIME" apply "$APPLY_DIRTY_SESSION"
) >"$APPLY_DIRTY_OUT" 2>&1
apply_dirty_rc=$?
git -C "$APPLY_REPO" checkout -q -- README.md

if [ "$apply_dirty_rc" -ne 1 ] ||
   ! grep -Fq "Worktree must be clean" "$APPLY_DIRTY_OUT"; then
  echo "FAIL: dirty worktree did not block Apply"
  cat "$APPLY_DIRTY_OUT"
  fail=1
else
  echo "PASS: dirty worktree blocks Apply"
fi

APPLY_STALE_STAGE="$TMP/apply-stale-stage.out"
stage_apply_session "$APPLY_STALE_STAGE"
APPLY_STALE_SESSION="$(session_from_output "$APPLY_STALE_STAGE")"
printf 'later\n' > "$APPLY_REPO/later.txt"
git -C "$APPLY_REPO" add later.txt
git -C "$APPLY_REPO" commit -q -m "advance apply head"

APPLY_STALE_OUT="$TMP/apply-stale.out"
(
  cd "$APPLY_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$APPLY_SESSION_ROOT" bash "$RUNTIME" apply "$APPLY_STALE_SESSION"
) >"$APPLY_STALE_OUT" 2>&1
apply_stale_rc=$?

if [ "$apply_stale_rc" -ne 1 ] ||
   ! grep -Fq "Current HEAD does not match" "$APPLY_STALE_OUT"; then
  echo "FAIL: stale HEAD did not block Apply"
  cat "$APPLY_STALE_OUT"
  fail=1
else
  echo "PASS: stale HEAD blocks Apply"
fi

git -C "$APPLY_REPO" reset -q --hard "$APPLY_BASE_HEAD"
git -C "$APPLY_REPO" clean -fdq

APPLY_TAMPER_STAGE="$TMP/apply-tamper-stage.out"
stage_apply_session "$APPLY_TAMPER_STAGE"
APPLY_TAMPER_SESSION="$(session_from_output "$APPLY_TAMPER_STAGE")"
printf 'tampered\n' >> "$APPLY_TAMPER_SESSION/staging/same.txt"

APPLY_TAMPER_OUT="$TMP/apply-tamper.out"
(
  cd "$APPLY_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$APPLY_SESSION_ROOT" bash "$RUNTIME" apply "$APPLY_TAMPER_SESSION"
) >"$APPLY_TAMPER_OUT" 2>&1
apply_tamper_rc=$?

if [ "$apply_tamper_rc" -ne 1 ] ||
   ! grep -Fq "Staged file size no longer matches" "$APPLY_TAMPER_OUT"; then
  echo "FAIL: staged tamper did not block Apply"
  cat "$APPLY_TAMPER_OUT"
  fail=1
else
  echo "PASS: staged tamper blocks Apply"
fi

APPLY_EXTRA_STAGE="$TMP/apply-extra-stage.out"
stage_apply_session "$APPLY_EXTRA_STAGE"
APPLY_EXTRA_SESSION="$(session_from_output "$APPLY_EXTRA_STAGE")"
printf 'rogue\n' > "$APPLY_EXTRA_SESSION/staging/rogue.txt"

APPLY_EXTRA_OUT="$TMP/apply-extra.out"
(
  cd "$APPLY_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$APPLY_SESSION_ROOT" bash "$RUNTIME" apply "$APPLY_EXTRA_SESSION"
) >"$APPLY_EXTRA_OUT" 2>&1
apply_extra_rc=$?

if [ "$apply_extra_rc" -ne 1 ] ||
   ! grep -Fq "Staging file list no longer matches" "$APPLY_EXTRA_OUT"; then
  echo "FAIL: unexpected staging file did not block Apply"
  cat "$APPLY_EXTRA_OUT"
  fail=1
else
  echo "PASS: unexpected staging file blocks Apply"
fi

FAIL_REPO="$TMP/apply-failure-repo"
FAIL_SESSION_ROOT="$TMP/apply-failure-sessions"

mkdir -p "$FAIL_REPO"
git -C "$FAIL_REPO" init -q
git -C "$FAIL_REPO" checkout -q -b main
git -C "$FAIL_REPO" config user.email "kpackage-test@example.invalid"
git -C "$FAIL_REPO" config user.name "KPackage Test"
printf 'before-failure\n' > "$FAIL_REPO/a-replace.txt"
printf 'baseline\n' > "$FAIL_REPO/README.md"
git -C "$FAIL_REPO" add a-replace.txt README.md
git -C "$FAIL_REPO" commit -q -m "failure baseline"
FAIL_BASE_HEAD="$(git -C "$FAIL_REPO" rev-parse HEAD)"

FAIL_STAGE_OUT="$TMP/apply-failure-stage.out"
(
  cd "$FAIL_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$FAIL_SESSION_ROOT" bash "$RUNTIME" stage "$TMP/apply-failure.zip"
) >"$FAIL_STAGE_OUT" 2>&1
FAIL_SESSION="$(session_from_output "$FAIL_STAGE_OUT")"

FAIL_APPLY_OUT="$TMP/apply-failure.out"
(
  cd "$FAIL_REPO" || exit 1
  KPACKAGE_TEST_MODE=1 \
  KPACKAGE_TEST_INJECT_APPLY_FAILURE_AFTER=1 \
  KPACKAGE_SESSION_ROOT="$FAIL_SESSION_ROOT" \
  bash "$RUNTIME" apply "$FAIL_SESSION"
) >"$FAIL_APPLY_OUT" 2>&1
failure_rc=$?

if [ "$failure_rc" -ne 1 ] ||
   ! grep -Fq "Result: APPLY_FAILED_RESTORED" "$FAIL_APPLY_OUT"; then
  echo "FAIL: injected Apply failure did not report restored"
  cat "$FAIL_APPLY_OUT"
  fail=1
elif [ "$(cat "$FAIL_REPO/a-replace.txt")" != "before-failure" ] ||
     [ -e "$FAIL_REPO/z-new.txt" ] ||
     [ "$(git -C "$FAIL_REPO" rev-parse HEAD)" != "$FAIL_BASE_HEAD" ] ||
     [ -n "$(git -C "$FAIL_REPO" status --porcelain=v1 --untracked-files=all)" ]; then
  echo "FAIL: injected Apply failure did not restore repository exactly"
  git -C "$FAIL_REPO" status --short
  fail=1
else
  echo "PASS: mid-Apply failure restores repository"
fi

if [ -n "$FAIL_SESSION" ]; then
  if [ -e "$FAIL_SESSION/apply.json" ] ||
     [ -e "$FAIL_SESSION/backup" ] ||
     find "$FAIL_SESSION" -maxdepth 1 -name '.apply-backup-partial-*' | grep -q .; then
    echo "FAIL: restored Apply left finalized/partial backup metadata"
    fail=1
  elif ! grep -Fq '"status": "STAGED"' "$FAIL_SESSION/session.json"; then
    echo "FAIL: restored Apply did not keep Session STAGED"
    fail=1
  else
    echo "PASS: restored Apply keeps Session reusable as STAGED"
  fi
fi

# Failure exactly after the repository atomic replace must also restore.
POST_REPLACE_REPO="$TMP/apply-post-replace-repo"
POST_REPLACE_SESSION_ROOT="$TMP/apply-post-replace-sessions"

mkdir -p "$POST_REPLACE_REPO"
git -C "$POST_REPLACE_REPO" init -q
git -C "$POST_REPLACE_REPO" checkout -q -b main
git -C "$POST_REPLACE_REPO" config user.email "kpackage-test@example.invalid"
git -C "$POST_REPLACE_REPO" config user.name "KPackage Test"
printf 'before-failure\n' > "$POST_REPLACE_REPO/a-replace.txt"
printf 'baseline\n' > "$POST_REPLACE_REPO/README.md"
git -C "$POST_REPLACE_REPO" add a-replace.txt README.md
git -C "$POST_REPLACE_REPO" commit -q -m "post-replace baseline"
POST_REPLACE_HEAD="$(git -C "$POST_REPLACE_REPO" rev-parse HEAD)"

POST_REPLACE_STAGE_OUT="$TMP/apply-post-replace-stage.out"
(
  cd "$POST_REPLACE_REPO" || exit 1
  KPACKAGE_SESSION_ROOT="$POST_REPLACE_SESSION_ROOT" \
  bash "$RUNTIME" stage "$TMP/apply-failure.zip"
) >"$POST_REPLACE_STAGE_OUT" 2>&1
POST_REPLACE_SESSION="$(session_from_output "$POST_REPLACE_STAGE_OUT")"

POST_REPLACE_APPLY_OUT="$TMP/apply-post-replace.out"
(
  cd "$POST_REPLACE_REPO" || exit 1
  KPACKAGE_TEST_MODE=1 \
  KPACKAGE_TEST_INJECT_POST_REPLACE_FAILURE=1 \
  KPACKAGE_SESSION_ROOT="$POST_REPLACE_SESSION_ROOT" \
  bash "$RUNTIME" apply "$POST_REPLACE_SESSION"
) >"$POST_REPLACE_APPLY_OUT" 2>&1
post_replace_rc=$?

if [ "$post_replace_rc" -ne 1 ] ||
   ! grep -Fq "Result: APPLY_FAILED_RESTORED" "$POST_REPLACE_APPLY_OUT"; then
  echo "FAIL: post-replace Apply failure did not report restored"
  cat "$POST_REPLACE_APPLY_OUT"
  fail=1
elif [ "$(cat "$POST_REPLACE_REPO/a-replace.txt")" != "before-failure" ] ||
     [ -e "$POST_REPLACE_REPO/z-new.txt" ] ||
     [ "$(git -C "$POST_REPLACE_REPO" rev-parse HEAD)" != "$POST_REPLACE_HEAD" ] ||
     [ -n "$(git -C "$POST_REPLACE_REPO" status --porcelain=v1 --untracked-files=all)" ]; then
  echo "FAIL: post-replace Apply failure did not restore repository exactly"
  git -C "$POST_REPLACE_REPO" status --short
  fail=1
else
  echo "PASS: post-replace failure restores repository"
fi

if [ -n "$POST_REPLACE_SESSION" ]; then
  if [ -e "$POST_REPLACE_SESSION/apply.json" ] ||
     [ -e "$POST_REPLACE_SESSION/backup" ] ||
     find "$POST_REPLACE_SESSION" -maxdepth 1 -name '.apply-backup-partial-*' | grep -q .; then
    echo "FAIL: post-replace restore left finalized/partial backup metadata"
    fail=1
  elif ! grep -Fq '"status": "STAGED"' "$POST_REPLACE_SESSION/session.json"; then
    echo "FAIL: post-replace restore did not keep Session STAGED"
    fail=1
  else
    echo "PASS: post-replace restore keeps Session STAGED"
  fi
fi

# ------------------------------------------------------------
# Rollback tests
# ------------------------------------------------------------
rollback_make_repo() {
  local repo="$1"
  mkdir -p "$repo"
  git -C "$repo" init -q
  git -C "$repo" checkout -q -b main
  git -C "$repo" config user.email "kpackage-test@example.invalid"
  git -C "$repo" config user.name "KPackage Test"
  printf 'baseline\n' > "$repo/README.md"
  printf 'same-content\n' > "$repo/same.txt"
  printf 'old-content\n' > "$repo/replace.txt"
  printf 'repo-only\n' > "$repo/repo-only.txt"
  git -C "$repo" add README.md same.txt replace.txt repo-only.txt
  git -C "$repo" commit -q -m "rollback baseline"
}

rollback_stage_apply() {
  local repo="$1" sessions="$2" stage_out="$3"
  (
    cd "$repo" || return 1
    KPACKAGE_SESSION_ROOT="$sessions" bash "$RUNTIME" stage "$TMP/rollback-valid.zip"
  ) >"$stage_out" 2>&1 || return 1
  local session
  session="$(session_from_output "$stage_out")"
  [ -n "$session" ] || return 1
  (
    cd "$repo" || return 1
    KPACKAGE_SESSION_ROOT="$sessions" bash "$RUNTIME" apply "$session"
  ) >"$stage_out.apply" 2>&1 || return 1
  printf '%s\n' "$session"
}

ROLLBACK_REPO="$TMP/rollback-repo"
ROLLBACK_SESSIONS="$TMP/rollback-sessions"
rollback_make_repo "$ROLLBACK_REPO"
ROLLBACK_HEAD="$(git -C "$ROLLBACK_REPO" rev-parse HEAD)"
ROLLBACK_STAGE_OUT="$TMP/rollback-stage.out"
ROLLBACK_SESSION="$(rollback_stage_apply "$ROLLBACK_REPO" "$ROLLBACK_SESSIONS" "$ROLLBACK_STAGE_OUT")"

if [ -z "$ROLLBACK_SESSION" ]; then
  echo "FAIL: rollback fixture Stage/Apply failed"
  cat "$ROLLBACK_STAGE_OUT" 2>/dev/null || true
  cat "$ROLLBACK_STAGE_OUT.apply" 2>/dev/null || true
  fail=1
else
  if ! python3 - "$ROLLBACK_SESSION" <<'PY'
from pathlib import Path
import json, sys
session = Path(sys.argv[1])
apply = json.loads((session / "apply.json").read_text(encoding="utf-8"))
if apply.get("created_directories") != ["nested"]:
    raise SystemExit(f"FAIL: created_directories {apply.get('created_directories')!r}")
print("PASS: Apply records created directories for Rollback")
PY
  then fail=1; fi

  ROLLBACK_OUT="$TMP/rollback-success.out"
  (
    cd "$ROLLBACK_REPO" || exit 1
    KPACKAGE_SESSION_ROOT="$ROLLBACK_SESSIONS" bash "$RUNTIME" rollback "$ROLLBACK_SESSION"
  ) >"$ROLLBACK_OUT" 2>&1
  rollback_rc=$?
  if [ "$rollback_rc" -ne 0 ] || ! grep -Fq "Result: ROLLED_BACK" "$ROLLBACK_OUT"; then
    echo "FAIL: Rollback success rc=$rollback_rc"; cat "$ROLLBACK_OUT"; fail=1
  elif [ -e "$ROLLBACK_REPO/nested/new.txt" ] || [ -d "$ROLLBACK_REPO/nested" ] ||
       [ "$(cat "$ROLLBACK_REPO/replace.txt")" != "old-content" ] ||
       [ "$(cat "$ROLLBACK_REPO/same.txt")" != "same-content" ] ||
       [ "$(cat "$ROLLBACK_REPO/repo-only.txt")" != "repo-only" ] ||
       [ "$(git -C "$ROLLBACK_REPO" rev-parse HEAD)" != "$ROLLBACK_HEAD" ] ||
       [ -n "$(git -C "$ROLLBACK_REPO" status --porcelain=v1 --untracked-files=all)" ]; then
    echo "FAIL: Rollback did not restore exact pre-Apply repository state"; git -C "$ROLLBACK_REPO" status --short; fail=1
  else
    echo "PASS: Rollback restores exact pre-Apply repository state"
  fi

  if ! python3 - "$ROLLBACK_SESSION" <<'PY'
from pathlib import Path
import json, sys
session = Path(sys.argv[1])
manifest = json.loads((session / "session.json").read_text(encoding="utf-8"))
rollback = json.loads((session / "rollback.json").read_text(encoding="utf-8"))
apply = json.loads((session / "apply.json").read_text(encoding="utf-8"))
if manifest.get("status") != "ROLLED_BACK" or rollback.get("status") != "ROLLED_BACK": raise SystemExit("FAIL: rollback status")
if rollback.get("removed_new_files") != ["nested/new.txt"]: raise SystemExit("FAIL: removed_new_files")
if rollback.get("restored_replaced_files") != ["replace.txt"]: raise SystemExit("FAIL: restored_replaced_files")
if rollback.get("untouched_identical_files") != ["same.txt"]: raise SystemExit("FAIL: untouched_identical_files")
if rollback.get("removed_created_directories") != ["nested"]: raise SystemExit("FAIL: removed_created_directories")
if not (session / "backup" / "replaced" / "replace.txt").is_file(): raise SystemExit("FAIL: backup not retained")
if apply.get("status") != "APPLIED": raise SystemExit("FAIL: apply audit changed")
print("PASS: Rollback metadata and retained backup verified")
PY
  then fail=1; fi

  REROLLBACK_OUT="$TMP/rollback-repeat.out"
  (cd "$ROLLBACK_REPO" || exit 1; KPACKAGE_SESSION_ROOT="$ROLLBACK_SESSIONS" bash "$RUNTIME" rollback "$ROLLBACK_SESSION") >"$REROLLBACK_OUT" 2>&1
  rerollback_rc=$?
  if [ "$rerollback_rc" -ne 1 ] || ! grep -Fq "rollback metadata already exists" "$REROLLBACK_OUT"; then
    echo "FAIL: repeated Rollback was not blocked"; cat "$REROLLBACK_OUT"; fail=1
  else echo "PASS: repeated Rollback blocks"; fi
fi

CHANGED_REPO="$TMP/rollback-changed-repo"; CHANGED_SESS="$TMP/rollback-changed-sessions"; rollback_make_repo "$CHANGED_REPO"
CHANGED_STAGE="$TMP/rollback-changed-stage.out"; CHANGED_SESSION="$(rollback_stage_apply "$CHANGED_REPO" "$CHANGED_SESS" "$CHANGED_STAGE")"
printf 'later-user-change\n' > "$CHANGED_REPO/replace.txt"
CHANGED_OUT="$TMP/rollback-changed.out"
(cd "$CHANGED_REPO" || exit 1; KPACKAGE_SESSION_ROOT="$CHANGED_SESS" bash "$RUNTIME" rollback "$CHANGED_SESSION") >"$CHANGED_OUT" 2>&1
changed_rc=$?
if [ "$changed_rc" -ne 1 ] || ! grep -Fq "Applied target changed after Apply" "$CHANGED_OUT"; then echo "FAIL: changed target did not block Rollback"; cat "$CHANGED_OUT"; fail=1; else echo "PASS: changed target blocks Rollback"; fi

UNRELATED_REPO="$TMP/rollback-unrelated-repo"; UNRELATED_SESS="$TMP/rollback-unrelated-sessions"; rollback_make_repo "$UNRELATED_REPO"
UNRELATED_STAGE="$TMP/rollback-unrelated-stage.out"; UNRELATED_SESSION="$(rollback_stage_apply "$UNRELATED_REPO" "$UNRELATED_SESS" "$UNRELATED_STAGE")"
printf 'unrelated\n' > "$UNRELATED_REPO/unrelated.txt"
UNRELATED_OUT="$TMP/rollback-unrelated.out"
(cd "$UNRELATED_REPO" || exit 1; KPACKAGE_SESSION_ROOT="$UNRELATED_SESS" bash "$RUNTIME" rollback "$UNRELATED_SESSION") >"$UNRELATED_OUT" 2>&1
unrelated_rc=$?
if [ "$unrelated_rc" -ne 1 ] || ! grep -Fq "Unrelated worktree change exists" "$UNRELATED_OUT"; then echo "FAIL: unrelated worktree change did not block Rollback"; cat "$UNRELATED_OUT"; fail=1; else echo "PASS: unrelated worktree change blocks Rollback"; fi

INDEX_REPO="$TMP/rollback-index-repo"; INDEX_SESS="$TMP/rollback-index-sessions"; rollback_make_repo "$INDEX_REPO"
INDEX_STAGE="$TMP/rollback-index-stage.out"; INDEX_SESSION="$(rollback_stage_apply "$INDEX_REPO" "$INDEX_SESS" "$INDEX_STAGE")"
git -C "$INDEX_REPO" add replace.txt
INDEX_OUT="$TMP/rollback-index.out"
(cd "$INDEX_REPO" || exit 1; KPACKAGE_SESSION_ROOT="$INDEX_SESS" bash "$RUNTIME" rollback "$INDEX_SESSION") >"$INDEX_OUT" 2>&1
index_rc=$?
if [ "$index_rc" -ne 1 ] || ! grep -Fq "Index/staged changes exist" "$INDEX_OUT"; then echo "FAIL: staged/index change did not block Rollback"; cat "$INDEX_OUT"; fail=1; else echo "PASS: staged/index change blocks Rollback"; fi

HEAD_REPO="$TMP/rollback-head-repo"; HEAD_SESS="$TMP/rollback-head-sessions"; rollback_make_repo "$HEAD_REPO"
HEAD_STAGE="$TMP/rollback-head-stage.out"; HEAD_SESSION="$(rollback_stage_apply "$HEAD_REPO" "$HEAD_SESS" "$HEAD_STAGE")"
git -C "$HEAD_REPO" add -A; git -C "$HEAD_REPO" commit -q -m "commit applied state"
HEAD_OUT="$TMP/rollback-head.out"
(cd "$HEAD_REPO" || exit 1; KPACKAGE_SESSION_ROOT="$HEAD_SESS" bash "$RUNTIME" rollback "$HEAD_SESSION") >"$HEAD_OUT" 2>&1
head_rc=$?
if [ "$head_rc" -ne 1 ] || ! grep -Fq "Current HEAD does not match" "$HEAD_OUT"; then echo "FAIL: advanced HEAD did not block Rollback"; cat "$HEAD_OUT"; fail=1; else echo "PASS: advanced HEAD blocks Rollback"; fi

FAIL_RB_REPO="$TMP/rollback-failure-repo"; FAIL_RB_SESS="$TMP/rollback-failure-sessions"; rollback_make_repo "$FAIL_RB_REPO"
FAIL_RB_STAGE="$TMP/rollback-failure-stage.out"; FAIL_RB_SESSION="$(rollback_stage_apply "$FAIL_RB_REPO" "$FAIL_RB_SESS" "$FAIL_RB_STAGE")"
FAIL_RB_HEAD="$(git -C "$FAIL_RB_REPO" rev-parse HEAD)"
FAIL_RB_OUT="$TMP/rollback-failure.out"
(
  cd "$FAIL_RB_REPO" || exit 1
  KPACKAGE_TEST_MODE=1 KPACKAGE_TEST_INJECT_ROLLBACK_FAILURE_AFTER=2 KPACKAGE_SESSION_ROOT="$FAIL_RB_SESS" bash "$RUNTIME" rollback "$FAIL_RB_SESSION"
) >"$FAIL_RB_OUT" 2>&1
fail_rb_rc=$?
if [ "$fail_rb_rc" -ne 1 ] || ! grep -Fq "Result: ROLLBACK_FAILED_RESTORED" "$FAIL_RB_OUT"; then
  echo "FAIL: injected Rollback failure did not report restored"; cat "$FAIL_RB_OUT"; fail=1
elif [ "$(cat "$FAIL_RB_REPO/nested/new.txt")" != "new-from-package" ] || [ "$(cat "$FAIL_RB_REPO/replace.txt")" != "replacement-content" ] || [ "$(cat "$FAIL_RB_REPO/same.txt")" != "same-content" ] || [ "$(git -C "$FAIL_RB_REPO" rev-parse HEAD)" != "$FAIL_RB_HEAD" ]; then
  echo "FAIL: Rollback failure did not restore APPLIED file state"; fail=1
else echo "PASS: mid-Rollback failure restores APPLIED repository state"; fi
if [ -n "$FAIL_RB_SESSION" ]; then
  if [ -e "$FAIL_RB_SESSION/rollback.json" ] || find "$FAIL_RB_SESSION" -maxdepth 1 -name '.rollback-partial-*' | grep -q .; then echo "FAIL: restored Rollback left rollback metadata/partial state"; fail=1
  elif ! grep -Fq '"status": "APPLIED"' "$FAIL_RB_SESSION/session.json"; then echo "FAIL: restored Rollback did not keep Session APPLIED"; fail=1
  else echo "PASS: restored Rollback keeps Session APPLIED"; fi
fi

# Metadata-commit failure must restore APPLIED repository + Session state.
META_RB_REPO="$TMP/rollback-metadata-failure-repo"
META_RB_SESS="$TMP/rollback-metadata-failure-sessions"
rollback_make_repo "$META_RB_REPO"
META_RB_STAGE="$TMP/rollback-metadata-failure-stage.out"
META_RB_SESSION="$(rollback_stage_apply "$META_RB_REPO" "$META_RB_SESS" "$META_RB_STAGE")"
META_RB_OUT="$TMP/rollback-metadata-failure.out"
(
  cd "$META_RB_REPO" || exit 1
  KPACKAGE_TEST_MODE=1 \
  KPACKAGE_TEST_INJECT_ROLLBACK_METADATA_FAILURE=1 \
  KPACKAGE_SESSION_ROOT="$META_RB_SESS" \
  bash "$RUNTIME" rollback "$META_RB_SESSION"
) >"$META_RB_OUT" 2>&1
meta_rb_rc=$?

if [ "$meta_rb_rc" -ne 1 ] || ! grep -Fq "Result: ROLLBACK_FAILED_RESTORED" "$META_RB_OUT"; then
  echo "FAIL: rollback metadata failure did not report restored"
  cat "$META_RB_OUT"
  fail=1
elif [ "$(cat "$META_RB_REPO/nested/new.txt")" != "new-from-package" ] || \
     [ "$(cat "$META_RB_REPO/replace.txt")" != "replacement-content" ] || \
     [ "$(cat "$META_RB_REPO/same.txt")" != "same-content" ]; then
  echo "FAIL: rollback metadata failure did not restore APPLIED repository state"
  fail=1
elif [ -e "$META_RB_SESSION/rollback.json" ] || \
     find "$META_RB_SESSION" -maxdepth 1 -name '.rollback-partial-*' | grep -q . || \
     ! grep -Fq '"status": "APPLIED"' "$META_RB_SESSION/session.json"; then
  echo "FAIL: rollback metadata failure left inconsistent Session state"
  fail=1
else
  echo "PASS: rollback metadata failure restores APPLIED state atomically"
fi

if [ "$fail" -ne 0 ]; then
  echo "RESULT: FAIL"
  exit 1
fi

echo "RESULT: PASS"
