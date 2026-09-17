#!/usr/bin/env bash

# Explicit installer for Koppy Package Utility.
# Usage:
#   bash 600_KoppyOS/runtime/install_kpackage.sh --apply
#
# This installer is intended to run in a child Bash process.
# It never closes the user's parent Terminal.

_kpackage_installer_main() {
  local mode="${1:-}"
  local root source_rel source target bashrc
  local start_marker end_marker source_line
  local timestamp start_count end_count source_count tmp_target

  root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  source_rel="600_KoppyOS/runtime/koppy_package.sh"
  target="$HOME/.koppy_package.sh"
  bashrc="$HOME/.bashrc"
  start_marker="# >>> KOPPY PACKAGE RUNTIME >>>"
  end_marker="# <<< KOPPY PACKAGE RUNTIME <<<"
  source_line="[ -f \"\$HOME/.koppy_package.sh\" ] && . \"\$HOME/.koppy_package.sh\""

  echo "===== KPACKAGE INSTALLER ====="
  echo

  if [ -z "$root" ]; then
    echo "STOP: Git repository not found."
    return 1
  fi

  source="$root/$source_rel"

  echo "Source: $source"
  echo "Target: $target"
  echo "Shell init: $bashrc"
  echo

  if [ ! -f "$source" ]; then
    echo "STOP: Runtime source not found."
    return 1
  fi

  if ! bash -n "$source"; then
    echo "STOP: Runtime source failed bash -n."
    return 1
  fi

  if [ "$mode" != "--apply" ]; then
    echo "PLAN ONLY: no files changed."
    echo
    echo "To install explicitly:"
    echo "  bash $source_rel --apply"
    echo
    echo "===== END KPACKAGE INSTALLER ====="
    return 0
  fi

  timestamp="$(date +%Y%m%d-%H%M%S)"

  if [ -f "$target" ]; then
    if ! cp -p "$target" "$target.backup.$timestamp"; then
      echo "STOP: could not back up existing runtime."
      return 1
    fi
    echo "Backup: $target.backup.$timestamp"
  fi

  if [ -f "$bashrc" ]; then
    start_count="$(grep -Fxc "$start_marker" "$bashrc" 2>/dev/null || true)"
    end_count="$(grep -Fxc "$end_marker" "$bashrc" 2>/dev/null || true)"
    source_count="$(grep -Fxc "$source_line" "$bashrc" 2>/dev/null || true)"

    if [ "$start_count" -gt 1 ] || [ "$end_count" -gt 1 ] || [ "$source_count" -gt 1 ]; then
      echo "STOP: duplicate Koppy Package runtime entries detected in ~/.bashrc."
      return 1
    fi

    if { [ "$start_count" -eq 1 ] && [ "$end_count" -ne 1 ]; } ||
       { [ "$start_count" -ne 1 ] && [ "$end_count" -eq 1 ]; }; then
      echo "STOP: incomplete Koppy Package marker block in ~/.bashrc."
      return 1
    fi

    if ! cp -p "$bashrc" "$bashrc.kpackage-backup.$timestamp"; then
      echo "STOP: could not back up ~/.bashrc."
      return 1
    fi
    echo "Backup: $bashrc.kpackage-backup.$timestamp"
  else
    if ! : > "$bashrc"; then
      echo "STOP: could not create ~/.bashrc."
      return 1
    fi
  fi

  tmp_target="$(mktemp "${TMPDIR:-/tmp}/koppy_package_runtime.XXXXXX")" || {
    echo "STOP: could not create temporary runtime file."
    return 1
  }

  if ! cp "$source" "$tmp_target"; then
    rm -f "$tmp_target"
    echo "STOP: could not copy runtime to temporary file."
    return 1
  fi

  chmod 600 "$tmp_target"

  if ! mv "$tmp_target" "$target"; then
    rm -f "$tmp_target"
    echo "STOP: could not install runtime."
    return 1
  fi

  start_count="$(grep -Fxc "$start_marker" "$bashrc" 2>/dev/null || true)"
  source_count="$(grep -Fxc "$source_line" "$bashrc" 2>/dev/null || true)"

  if [ "$start_count" -eq 0 ] && [ "$source_count" -eq 0 ]; then
    if ! {
      echo
      echo "$start_marker"
      echo "$source_line"
      echo "$end_marker"
    } >> "$bashrc"; then
      echo "STOP: runtime installed, but ~/.bashrc update failed."
      return 1
    fi
    echo "Updated: $bashrc"
  elif [ "$start_count" -eq 1 ] && [ "$source_count" -eq 1 ]; then
    echo "Shell init entry already present."
  elif [ "$source_count" -eq 1 ]; then
    echo "Shell source line already present without managed marker; left unchanged."
  else
    echo "STOP: unexpected ~/.bashrc state after install."
    return 1
  fi

  echo
  echo "Installed runtime:"
  bash "$target" version
  echo
  echo "The parent shell is unchanged."
  echo "Run this in the current Terminal:"
  echo "  source ~/.bashrc"
  echo
  echo "===== END KPACKAGE INSTALLER ====="

  return 0
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  _kpackage_installer_main "$@"
else
  echo "Koppy Package installer should be executed with bash, not sourced."
fi
