#!/usr/bin/env bash
# CTS-A-O — Linux installer and service manager. The service runs from the project directory: install builds the
# project in place (<project>/.output) and the unit starts <project>/.output/server/index.mjs. Nothing is copied into
# /opt and nothing is cloned; --source DIR copies a checkout into the project first.
#
#   sudo ./scripts/linux/cts.sh install [--clean] [--name cts-a-o] [--port 8080] [options]
#   sudo ./scripts/linux/cts.sh update  [--force]
#   sudo ./scripts/linux/cts.sh reinstall
#   sudo ./scripts/linux/cts.sh remove
#   sudo ./scripts/linux/cts.sh start | stop | restart | status | logs | info
#
# Persistent data is kept on the server and survives remove and reinstall: /var/lib/NAME (env, state, database,
# logs), /etc/cts/NAME.conf (saved options), /var/log/NAME-build (build logs) and the service user NAME. Only
# `install --clean` deletes them (off by default). The project tree is never chowned, chmodded or deleted: the build
# writes <project>/.output (and node_modules through npm ci), and remove deletes .output.
#
# ---- usage ----
# Options (each defaults to the value saved by the last install of that name, then to the standard):
#   --name NAME       instance name: service, user and default paths                    (cts-a-o)
#   --port PORT       HTTP port                                                         (8080)
#   --host HOST       bind address                                                      (0.0.0.0)
#   --dir DIR         project directory: built in place and run from DIR/.output        (the checkout this script is in)
#   --data DIR        persistent data: env, state, database, logs                       (/var/lib/NAME)
#   --source DIR      copy the checkout DIR into --dir before the build (no clone)
#   --force           rebuild even when the build output is present
#   --clean           install only: delete the persistent data and the saved options first, then install fresh
#   --root DIR        test prefix: every absolute path written goes under DIR, and systemctl and useradd are not run.
#                     For the tests (scripts/linux/cts.test.mjs) only, never for a real install.
#
# Commands:
#   install     build, write the unit and the launcher, start, health check (keeps existing data and options)
#   update      rebuild in place (npm ci only when package-lock.json changed), restart
#   reinstall   remove, then install (data kept)
#   remove      stop the service; delete the unit, the launcher and DIR/.output (data kept)
#   start | stop | restart | status | logs | info
#
# Kept by install, update, reinstall and remove: /var/lib/NAME, /etc/cts/NAME.conf, /var/log/NAME-build and the
# service user. `install --clean` deletes the first three (printing each path) and installs fresh.
# `remove --purge` is not available: data is kept; use install --clean to remove it.
# ---- end usage ----
set -Eeuo pipefail

# ── defaults ─────────────────────────────────────────────────────────────────────────────────────────────────────
DEF_NAME="cts-a-o"
DEF_PORT="8080"
DEF_HOST="0.0.0.0"
NODE_MIN_MAJOR=22
NODE_MIN_MINOR=13 # node:sqlite without a flag
HEALTH_TIMEOUT=180

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
CHECKOUT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)" # the project this script belongs to
TEMPLATE="$SCRIPT_DIR/cts-a-o.service.template"

# ── output ───────────────────────────────────────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; D=$'\e[2m'; N=$'\e[0m'; else B= G= Y= R= D= N=; fi
step() { printf '%s==>%s %s\n' "$B" "$N" "$*"; }
ok() { printf '  %s✓%s %s\n' "$G" "$N" "$*"; }
skip() { printf '  %s•%s %s\n' "$D" "$N" "$*"; }
warn() { printf '  %s!%s %s\n' "$Y" "$N" "$*" >&2; }
die() { printf '%serror:%s %s\n' "$R" "$N" "$*" >&2; exit 1; }
trap 'die "failed at line $LINENO: $BASH_COMMAND"' ERR

# ── arguments ────────────────────────────────────────────────────────────────────────────────────────────────────
CMD="${1:-}"
[ -n "$CMD" ] && shift || true
case "$CMD" in -h | --help) CMD=help ;; esac
A_NAME= A_PORT= A_HOST= A_DIR= A_DATA= A_SOURCE= A_ROOT= FORCE=0 CLEAN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --name) A_NAME="${2:?--name needs a value}"; shift 2 ;;
    --port) A_PORT="${2:?--port needs a value}"; shift 2 ;;
    --host) A_HOST="${2:?--host needs a value}"; shift 2 ;;
    --dir) A_DIR="${2:?--dir needs a value}"; shift 2 ;;
    --data) A_DATA="${2:?--data needs a value}"; shift 2 ;;
    --source) A_SOURCE="${2:?--source needs a value}"; shift 2 ;;
    --root) A_ROOT="${2:?--root needs a value}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --clean) CLEAN=1; shift ;;
    --purge) die "--purge: data is kept; use install --clean to remove it" ;;
    --repo | --branch) die "$1 is gone: the project is built in place (use --dir, or --source DIR to copy a checkout)" ;;
    -y | --yes) shift ;;
    -h | --help) CMD=help; shift ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
done

usage() { awk '/^# ---- usage ----$/{f=1;next} /^# ---- end usage ----$/{f=0} f' "${BASH_SOURCE[0]:-$0}" | sed 's/^# \{0,1\}//'; }
case "$CMD" in
  install | update | reinstall | remove | start | stop | restart | status | logs | info) ;;
  help | "") usage; exit 0 ;;
  *) die "unknown command: $CMD (install | update | reinstall | remove | start | stop | restart | status | logs | info)" ;;
esac
[ "$CLEAN" -eq 0 ] || [ "$CMD" = install ] || die "--clean applies to install only (it deletes the persistent data)"

# --root DIR (tests only): every absolute path below is joined with ROOT_P ("" for the real root). Without root and
# without systemd the same logic runs: systemctl is not called and the service user is not created.
ROOT="${A_ROOT:-/}"
TEST_ROOT=0
if [ "$ROOT" != / ]; then
  [ "${CTS_TEST_ROOT:-}" = 1 ] || die "--root is for tests only (set CTS_TEST_ROOT=1)"
  [[ "$ROOT" = /* ]] && [ -d "$ROOT" ] || die "--root $ROOT: an existing absolute directory is needed"
  TEST_ROOT=1
fi
ROOT_P="${ROOT%/}"
[ "$TEST_ROOT" -eq 1 ] || [ "$(id -u)" -eq 0 ] || die "run as root (sudo $0 $CMD …)"

# instances installed by this script: "name data-dir" per line (lets later commands run without --name)
REGISTRY="$ROOT_P/etc/cts-instances"
if [ -z "$A_NAME" ] && [ -f "$REGISTRY" ] && ! grep -q "^$DEF_NAME " "$REGISTRY"; then
  n_inst="$(grep -c . "$REGISTRY" || true)"
  if [ "$n_inst" -eq 1 ]; then
    A_NAME="$(awk 'NF{print $1; exit}' "$REGISTRY")"
    [ -z "$A_DATA" ] && A_DATA="$(awk 'NF{print $2; exit}' "$REGISTRY")"
  elif [ "$n_inst" -gt 1 ] && [ "$CMD" != install ] && [ "$CMD" != help ]; then
    printf 'several instances are installed — choose one with --name:\n' >&2
    awk 'NF{print "  " $1 "  (data " $2 ")"}' "$REGISTRY" >&2
    exit 1
  fi
fi
[ -z "$A_DATA" ] && [ -n "$A_NAME" ] && [ -f "$REGISTRY" ] && A_DATA="$(awk -v n="$A_NAME" '$1==n{print $2; exit}' "$REGISTRY")"
NAME="${A_NAME:-$DEF_NAME}"
[[ "$NAME" =~ ^[a-z][a-z0-9-]{1,31}$ ]] || die "--name: lowercase letters, digits and '-' (2–32 chars)"

# the saved options of this instance live root-owned in /etc/cts. They are PARSED — KEY=VALUE lines of known keys,
# values verbatim — never executed as shell.
CONF_DIR="$ROOT_P/etc/cts"
CONF="$CONF_DIR/$NAME.conf"
# before: $DATA_DIR/install.conf, sourced as root although own() gives it to the service user. Migrated once (parsed,
# filtered, see legacy_filter), then deleted by save_conf.
LEGACY_CONF="${A_DATA:-$ROOT_P/var/lib/$NAME}/install.conf"
CONF_KEYS=" PORT HOST PROJECT_DIR DATA_DIR SOURCE APP_DIR "
C_PORT='' C_HOST='' C_PROJECT_DIR='' C_DATA_DIR='' C_SOURCE='' C_APP_DIR=''
parse_conf() { # $1 = file → C_<KEY>
  local line k v
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in '' | '#'*) continue ;; *=*) ;; *) continue ;; esac
    k="${line%%=*}"; v="${line#*=}"
    case "$CONF_KEYS" in *" $k "*) printf -v "C_$k" '%s' "$v" ;; esac
  done <"$1"
}
# the legacy file was writable by the service user: keep only values that cannot hand root foreign code or paths
legacy_filter() {
  C_DATA_DIR="$(dirname "$LEGACY_CONF")" # where it was found
  [[ "$C_PORT" =~ ^[0-9]{1,5}$ ]] || C_PORT=
  [[ "$C_HOST" =~ ^[0-9A-Za-z.:_-]+$ ]] || C_HOST=
  C_PROJECT_DIR= # never taken from a user-writable file
  # an earlier program copy only when it really was an install: root-owned, with the root-created `current` symlink
  if [ -n "$C_APP_DIR" ] && ! { [ -d "$C_APP_DIR" ] && [ ! -L "$C_APP_DIR" ] && [ "$(stat -c %u "$C_APP_DIR")" = 0 ] &&
    [ -L "$C_APP_DIR/current" ] && [ "$(stat -c %u "$C_APP_DIR/current")" = 0 ]; }; then
    warn "ignoring APP_DIR=$C_APP_DIR from $LEGACY_CONF (not an install)"
    C_APP_DIR=
  fi
  if [ -n "$C_SOURCE" ] && [ "$(stat -c %u "$C_SOURCE" 2>/dev/null)" != 0 ]; then
    warn "ignoring SOURCE from $LEGACY_CONF (not root-owned) — pass --source to keep it"
    C_SOURCE=
  fi
}
MIGRATE=0
if [ -f "$CONF" ] && [ ! -L "$CONF" ]; then
  parse_conf "$CONF"
elif [ -f "$LEGACY_CONF" ] && [ ! -L "$LEGACY_CONF" ]; then
  parse_conf "$LEGACY_CONF"
  legacy_filter
  MIGRATE=1
fi
PORT="${A_PORT:-${C_PORT:-$DEF_PORT}}"
HOST="${A_HOST:-${C_HOST:-$DEF_HOST}}"
DATA_DIR="${A_DATA:-${C_DATA_DIR:-$ROOT_P/var/lib/$NAME}}"
# the data directory is an absolute, canonical path of its own: --clean deletes it, so a relative or shared one is refused
case "$DATA_DIR" in /*) ;; *) die "--data must be an absolute path (got $DATA_DIR)" ;; esac
DATA_DIR="$(realpath -m -- "$DATA_DIR")"
case "$(basename "$DATA_DIR")" in "$NAME"*) ;; *) die "--data $DATA_DIR must be a dedicated instance directory (its name starts with $NAME)" ;; esac
SOURCE="${A_SOURCE:-${C_SOURCE:-}}"
# the project: --dir; install and reinstall default to the checkout this script is in, the other commands to the
# project saved by the last install
if [ -n "$A_DIR" ]; then
  PROJECT_DIR="$A_DIR"
elif [ "$CMD" = install ] || [ "$CMD" = reinstall ] || [ -z "$C_PROJECT_DIR" ]; then
  PROJECT_DIR="$CHECKOUT_DIR"
else
  PROJECT_DIR="$C_PROJECT_DIR"
fi
if [ -d "$PROJECT_DIR" ]; then PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd -P)"; fi
[[ "$PORT" =~ ^[0-9]+$ ]] && [ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ] || die "--port: 1–65535"
case "$PROJECT_DIR" in /|/usr|/etc|/var|/home|/root) die "--dir $PROJECT_DIR is not a project directory" ;; esac
case "$DATA_DIR" in /|/usr|/etc|/var|/home|/root) die "--data $DATA_DIR must be its own directory" ;; esac
# the unit holds these paths: systemd needs them without spaces, quotes, backslashes or %
for p in "$PROJECT_DIR" "$DATA_DIR"; do
  case "$p" in *[[:space:]]* | *\"* | *\'* | *%* | *\\*) die "$p: the unit needs a path without spaces, quotes, backslashes or %" ;; esac
done
case "$DATA_DIR" in "$PROJECT_DIR" | "$PROJECT_DIR"/*) die "--data $DATA_DIR must be outside the project ($PROJECT_DIR)" ;; esac
# --clean deletes the data directory: it must not hold the project either
case "$PROJECT_DIR" in "$DATA_DIR" | "$DATA_DIR"/*) die "--data $DATA_DIR holds the project ($PROJECT_DIR) — refusing (install --clean would delete it)" ;; esac

ENV_FILE="$DATA_DIR/env"
LOG_DIR="$DATA_DIR/logs"
RUN_DIR="$DATA_DIR/run"
OUT_DIR="$PROJECT_DIR/.output"             # the build of the project (the only thing the build writes)
SERVER_JS="$OUT_DIR/server/index.mjs"      # what the unit runs
# root-owned home of everything root executes or trusts (launcher, supervisor, pid files, the npm ci stamp). It must
# NOT live in the data directory: own() hands that to the service user.
LIB_DIR="$ROOT_P/usr/local/lib/$NAME"
BUILD_LOG_DIR="$ROOT_P/var/log/$NAME-build" # root-owned: npm-ci.log, build.log
UNIT="$ROOT_P/etc/systemd/system/$NAME.service"
# an earlier install ran a copy of the program from /opt (releases + current symlink); removed once replaced
if [ "$TEST_ROOT" -eq 1 ]; then LEGACY_APP_DIR="$ROOT_P/opt/$NAME"; else LEGACY_APP_DIR="${C_APP_DIR:-/opt/$NAME}"; fi
LOCK="$ROOT_P/run/lock/$NAME-installer.lock"

mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"
flock -n 9 || die "another $0 run for $NAME is in progress"

# ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────
have() { command -v "$1" >/dev/null 2>&1; }
# systemctl, except under --root: nothing is started or enabled there, the unit file is still written
sc() {
  if [ "$TEST_ROOT" -eq 1 ]; then [ "${1:-}" = is-active ] && return 1; return 0; fi
  systemctl "$@"
}
systemd_up() { [ "$TEST_ROOT" -eq 1 ] || { [ -d /run/systemd/system ] && have systemctl; }; }
root_own() { [ "$(id -u)" -eq 0 ] || return 0; chown root:root "$@"; }
svc_own() { [ "$TEST_ROOT" -eq 1 ] && return 0; chown "$@"; }
pkg_mgr() {
  for m in apt-get dnf yum zypper pacman apk; do have "$m" && { echo "$m"; return; }; done
  echo none
}
pkg_install() {
  local m; m="$(pkg_mgr)"
  case "$m" in
    apt-get) DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@" >/dev/null ;;
    dnf) dnf install -y -q "$@" >/dev/null ;;
    yum) yum install -y -q "$@" >/dev/null ;;
    zypper) zypper --non-interactive install -y "$@" >/dev/null ;;
    pacman) pacman -Sy --noconfirm --needed "$@" >/dev/null ;;
    apk) apk add --no-cache "$@" >/dev/null ;;
    *) die "no supported package manager: install $* manually" ;;
  esac
}
node_ok() {
  have node || return 1
  local v maj min
  v="$(node -v 2>/dev/null | sed 's/^v//')"
  maj="${v%%.*}"; min="$(echo "$v" | cut -d. -f2)"
  [ "$maj" -gt "$NODE_MIN_MAJOR" ] || { [ "$maj" -eq "$NODE_MIN_MAJOR" ] && [ "$min" -ge "$NODE_MIN_MINOR" ]; }
}
ips() {
  local x
  x="$(hostname -I 2>/dev/null || true)"
  [ -n "$x" ] || x="$(ip -4 -o addr show scope global 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | tr '\n' ' ')"
  echo "${x:-127.0.0.1}"
}
public_ip() { curl -fsS --max-time 3 https://api.ipify.org 2>/dev/null || true; }
port_pids() { (fuser -n tcp "$PORT" 2>/dev/null || lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true) | tr -s ' \n' ' '; }
health() { curl -fs -o /dev/null --max-time 5 "http://127.0.0.1:$PORT/v2"; }
project_rev() { git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo local; }
node_bin() { command -v node; }
re_escape() { printf '%s' "$1" | sed 's/[][\.*^$+?(){}|]/\\&/g'; }
# a process running this project's server, or the server of an earlier copy in /opt
is_ours() {
  local cmd
  cmd="$(tr '\0' ' ' 2>/dev/null <"/proc/$1/cmdline" || true)"
  case "$cmd" in *"$OUT_DIR/server/"* | *"$LEGACY_APP_DIR/current/"*) return 0 ;; esac
  return 1
}

save_conf() {
  mkdir -p "$(dirname "$REGISTRY")"
  touch "$REGISTRY"
  sed -i "/^$NAME /d" "$REGISTRY"
  echo "$NAME $DATA_DIR" >>"$REGISTRY"
  mkdir -p "$DATA_DIR"
  [ -L "$CONF_DIR" ] && die "$CONF_DIR is a symlink — refusing to use it"
  mkdir -p "$CONF_DIR"
  root_own "$CONF_DIR"
  chmod 755 "$CONF_DIR"
  local k
  for k in PORT HOST PROJECT_DIR DATA_DIR SOURCE; do
    case "${!k}" in *$'\n'* | *$'\r'*) die "$k must not contain a line break" ;; esac
  done
  {
    echo "# written by cts.sh — defaults for the next install / update / reinstall / remove of $NAME"
    echo "# KEY=VALUE, parsed (never executed); values verbatim"
    for k in PORT HOST PROJECT_DIR DATA_DIR SOURCE; do printf '%s=%s\n' "$k" "${!k}"; done
  } >"$CONF.new"
  root_own "$CONF.new"
  chmod 600 "$CONF.new"
  mv -f "$CONF.new" "$CONF"
  # the old user-writable copy goes only once its values were migrated (MIGRATE=1); an unmigrated one is kept, said so
  if [ -e "$DATA_DIR/install.conf" ] || [ -L "$DATA_DIR/install.conf" ]; then
    if [ "${MIGRATE:-0}" -eq 1 ]; then
      rm -f "$DATA_DIR/install.conf"
      ok "settings moved to $CONF"
    else
      warn "$DATA_DIR/install.conf kept: $CONF already exists and its values are not read"
    fi
  fi
}

# ── dependencies ─────────────────────────────────────────────────────────────────────────────────────────────────
deps() {
  step "Dependencies"
  local miss=()
  for c in git curl flock setpriv; do have "$c" && skip "$c already installed" || miss+=("$c"); done
  have fuser || have lsof || miss+=(psmisc)
  have tar || miss+=(tar)
  if [ ${#miss[@]} -gt 0 ]; then
    if [ "$TEST_ROOT" -eq 1 ]; then
      warn "not installed in a test root: ${miss[*]}"
    else
      local pk=()
      for c in "${miss[@]}"; do case "$c" in flock | setpriv) pk+=(util-linux) ;; *) pk+=("$c") ;; esac; done
      pk+=(ca-certificates)
      pkg_install "${pk[@]}"
      ok "installed ${miss[*]}"
    fi
  fi
  if node_ok; then
    skip "node $(node -v) already installed"
  elif [ "$TEST_ROOT" -eq 1 ]; then
    warn "Node.js $NODE_MIN_MAJOR is not installed in a test root (found $(node -v 2>/dev/null || echo none)): skipped"
  else
    local m; m="$(pkg_mgr)"
    step "Installing Node.js $NODE_MIN_MAJOR (current: $(node -v 2>/dev/null || echo none))"
    case "$m" in
      apt-get) curl -fsSL "https://deb.nodesource.com/setup_${NODE_MIN_MAJOR}.x" | bash - >/dev/null && pkg_install nodejs ;;
      dnf | yum) curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MIN_MAJOR}.x" | bash - >/dev/null && pkg_install nodejs ;;
      *) pkg_install nodejs npm ;;
    esac
    hash -r
    node_ok || die "Node.js >= $NODE_MIN_MAJOR.$NODE_MIN_MINOR is required (found $(node -v 2>/dev/null || echo none))"
    ok "node $(node -v)"
  fi
  have npm || die "npm is missing (it ships with Node.js)"
  skip "npm $(npm -v) available"
}

ensure_user() {
  if [ "$TEST_ROOT" -eq 1 ]; then
    skip "service user $NAME is not created in a test root"
    return
  fi
  if id -u "$NAME" >/dev/null 2>&1; then
    skip "service user $NAME exists"
  else
    useradd --system --home-dir "$DATA_DIR" --no-create-home --shell /usr/sbin/nologin "$NAME" 2>/dev/null ||
      useradd -r -d "$DATA_DIR" -M -s /sbin/nologin "$NAME"
    ok "service user $NAME created"
  fi
}

# run a command as the service user in a clean environment (root never writes into the user-owned data directory:
# the user could have planted a symlink / hard link there for root to write, chmod or chown through)
as_user() {
  if [ "$TEST_ROOT" -eq 1 ]; then
    env -i PATH="/usr/local/bin:/usr/bin:/bin" HOME="$DATA_DIR" LANG=C.UTF-8 "$@"
    return
  fi
  env -i PATH="/usr/local/bin:/usr/bin:/bin" HOME="$DATA_DIR" LANG=C.UTF-8 \
    setpriv --reuid="$NAME" --regid="$NAME" --init-groups "$@"
}

# the environment file lives in the data directory: created once, existing values are never overwritten. Root only
# composes the new content; reading it and the atomic replace (temp file + mv, mode 600) run as the service user.
ensure_env() {
  mkdir -p "$DATA_DIR"
  # a still root-owned data directory (fresh install, before own()) cannot have been tampered with: hand over a
  # root-created env file of an earlier run before the directory becomes the user's
  if [ "$(stat -c %u "$DATA_DIR")" = 0 ] && [ -f "$ENV_FILE" ] && [ ! -L "$ENV_FILE" ]; then
    svc_own "$NAME:$NAME" "$ENV_FILE"
  fi
  svc_own -h "$NAME:$NAME" "$DATA_DIR" # -h: never follows a symlink
  as_user mkdir -p "$LOG_DIR" "$RUN_DIR" || die "cannot create $LOG_DIR / $RUN_DIR as $NAME"
  local cur="" out added=0
  if [ -e "$ENV_FILE" ] || [ -L "$ENV_FILE" ]; then
    cur="$(as_user cat "$ENV_FILE")" || die "$ENV_FILE is not a file $NAME can read — fix or remove it"
    cur="${cur//$'\r'/}" # CRLF (edited on Windows) → LF
  fi
  out="$cur"
  setdef() {
    printf '%s\n' "$cur" | grep -q "^$1=" && return 0
    out="$out"$'\n'"$1=$2"
    added=$((added + 1))
  }
  setdef NODE_ENV production
  setdef CTS_CORE_STATE "$DATA_DIR/state.json"
  setdef CTS_CORE_SNAPSHOT "$DATA_DIR/core.sqlite"
  # resources are measured at every start (launch.sh): heap = ¾ of the memory available to the service (its cgroup
  # limit or RAM) minus headroom for native memory and worker threads, one worker per CPU (cgroup quota or cores).
  # 0 = use NODE_OPTIONS / CTS_CORE_WORKERS as set here
  setdef CTS_AUTO_RESOURCES 1
  # share of the memory budget for the JavaScript heap (50–95)
  setdef CTS_HEAP_PCT 85
  # worker threads: without a cap glibc keeps an arena per thread and RSS grows far beyond the heap
  setdef MALLOC_ARENA_MAX 2
  # keys and the live switch stay commented until you set them (never printed by this script)
  if ! printf '%s\n' "$cur" | grep -q "BINGX_X02_API_KEY"; then
    out="$out"$'\n''# Exchange keys (optional). Uncomment and fill in, then: cts.sh restart'
    out="$out"$'\n''#BINGX_X02_API_KEY='$'\n''#BINGX_X02_SECRET='
    out="$out"$'\n''#BINGX_X01_API_KEY='$'\n''#BINGX_X01_SECRET='
    out="$out"$'\n''# Live orders additionally need Settings → Live and:'$'\n''#CTS_CORE_LIVE=1'
  fi
  if ! printf '%s\n' "$cur" | grep -q "CTS_CORE_LIVE_AUTO"; then
    out="$out"$'\n''# Unattended setup, applied once per set of values (a later change in the UI is kept):'
    out="$out"$'\n''#CTS_CORE_SYMBOLS=30'$'\n''#CTS_CORE_LIVE_CONN=bingx-x01'$'\n''#CTS_CORE_LIVE_AUTO=1'
  fi
  # PORT / HOST / worker path follow the install (updated on every run); leading blank lines dropped
  out="$(printf '%s\n' "$out" | grep -v -E '^(PORT|HOST|NITRO_PORT|NITRO_HOST|CTS_CORE_WORKER)=' | sed '/./,$!d')"
  out="$out"$'\n'"PORT=$PORT"$'\n'"HOST=$HOST"$'\n'"CTS_CORE_WORKER=$PROJECT_DIR/src/core/server/tapes.worker.ts"
  # as the user: mktemp creates the temp file 0600 with O_EXCL, mv renames it over the old entry (a planted symlink
  # is replaced, never followed)
  # shellcheck disable=SC2016
  printf '%s\n' "$out" | as_user /bin/sh -c 'umask 077; t=$(mktemp "$1/.env.XXXXXX") || exit 1
    cat >"$t" && chmod 600 "$t" && mv -f "$t" "$2" || { rm -f "$t"; exit 1; }' sh "$DATA_DIR" "$ENV_FILE" ||
    die "cannot write $ENV_FILE as $NAME"
  # the state and the snapshot must be written by the service: they cannot point into the project
  local k v
  for k in CTS_CORE_STATE CTS_CORE_SNAPSHOT; do
    v="$(printf '%s\n' "$out" | sed -n "s/^$k=//p" | tail -n 1)"
    case "$v" in "$PROJECT_DIR" | "$PROJECT_DIR"/* | .* | [!/]*)
      [ "$v" = off ] || warn "$k=$v in $ENV_FILE is not writable by $NAME (outside $DATA_DIR) — set it under $DATA_DIR" ;;
    esac
  done
  own
  [ $added -gt 0 ] && ok "environment $ENV_FILE ($added new default(s))" || skip "environment $ENV_FILE kept"
}

# the service user owns the data directory (env, state, snapshot, logs) and nothing else. Only entries not yet its
# own are handed over, never across mounts, never a symlink (-h) and never a file with several hard links (a planted
# hard link to a root file would otherwise be chowned to the user).
own() {
  [ "$TEST_ROOT" -eq 1 ] && return 0
  find "$DATA_DIR" -xdev ! -user "$NAME" ! -type l \( -type d -o -links 1 \) -exec chown -h "$NAME:$NAME" {} + 2>/dev/null || true
}

# build logs are written by root: a root-owned directory, never the user-owned $LOG_DIR (a planted symlink there
# would have root truncate / write any file)
ensure_build_log_dir() {
  [ -L "$BUILD_LOG_DIR" ] && die "$BUILD_LOG_DIR is a symlink — refusing to use it"
  mkdir -p "$BUILD_LOG_DIR"
  root_own "$BUILD_LOG_DIR"
  chmod 750 "$BUILD_LOG_DIR"
}

# ── source and build ─────────────────────────────────────────────────────────────────────────────────────────────
# --source DIR: copies the checkout's sources into the project (sandbox, offline). Files of the same name are
# overwritten; nothing is deleted.
sync_source() {
  [ -d "$SOURCE" ] && [ -f "$SOURCE/package.json" ] || die "--source $SOURCE is not a CTS-A-O checkout"
  mkdir -p "$PROJECT_DIR"
  if [ "$(cd "$SOURCE" && pwd)" = "$PROJECT_DIR" ]; then
    skip "--source is the project itself"
    return 0
  fi
  step "Sources from $SOURCE into $PROJECT_DIR"
  tar -C "$SOURCE" --exclude=./node_modules --exclude=./.output --exclude=./.vercel --exclude=./.git \
    --exclude=./screenshots --exclude=./.cts-core -cf - . | tar -C "$PROJECT_DIR" -xf -
  ok "sources copied"
}

# the build, in place: npm ci only when package-lock.json changed (or node_modules is missing), then vite with the
# node-server preset. Writes <project>/.output and, through npm ci, <project>/node_modules — nothing else.
build_project() {
  ensure_build_log_dir
  [ -f "$PROJECT_DIR/package.json" ] || die "$PROJECT_DIR is not the CTS-A-O project (no package.json) — pass --dir DIR"
  [ -f "$PROJECT_DIR/package-lock.json" ] || die "$PROJECT_DIR/package-lock.json is missing (npm ci needs it)"
  step "Dependencies of the project ($PROJECT_DIR)"
  local lock_sha stamp="$LIB_DIR/npm-ci.sha"
  lock_sha="$(sha1sum "$PROJECT_DIR/package-lock.json" | cut -d' ' -f1)"
  ensure_lib_dir
  if [ -d "$PROJECT_DIR/node_modules" ] && [ "$(cat "$stamp" 2>/dev/null || true)" = "$lock_sha" ]; then
    skip "package-lock.json unchanged: node_modules kept"
  else
    (cd "$PROJECT_DIR" && npm ci --no-audit --no-fund --loglevel=error >"$BUILD_LOG_DIR/npm-ci.log" 2>&1) ||
      die "npm ci failed — see $BUILD_LOG_DIR/npm-ci.log"
    printf '%s\n' "$lock_sha" >"$stamp.new"
    mv -f "$stamp.new" "$stamp"
    ok "npm ci"
  fi
  step "Build (node server) in $PROJECT_DIR"
  [ ! -L "$OUT_DIR" ] || die "$OUT_DIR is a symlink — refusing to use it"
  local vite=(vite build)
  if [ -f "$PROJECT_DIR/scripts/with-app-env.mjs" ]; then vite=(node scripts/with-app-env.mjs vite build); fi
  (cd "$PROJECT_DIR" && NITRO_PRESET=node-server PATH="$PROJECT_DIR/node_modules/.bin:$PATH" "${vite[@]}" >"$BUILD_LOG_DIR/build.log" 2>&1) ||
    die "build failed — see $BUILD_LOG_DIR/build.log"
  [ -f "$SERVER_JS" ] || die "build produced no server (see $BUILD_LOG_DIR/build.log)"
  # the service user only reads the build: read access to the generated output (the sources are not touched)
  chmod -R a+rX "$OUT_DIR"
  as_user test -r "$SERVER_JS" || warn "$NAME cannot read $SERVER_JS: give read access to $PROJECT_DIR and its parent directories"
  ok "built $(du -sh "$OUT_DIR" | cut -f1)"
}

# ── service ──────────────────────────────────────────────────────────────────────────────────────────────────────
ensure_lib_dir() {
  [ -L "$LIB_DIR" ] && die "$LIB_DIR is a symlink — refusing to use it"
  mkdir -p "$LIB_DIR"
  root_own "$LIB_DIR"
  chmod 755 "$LIB_DIR"
}

# move "$2.new" (written in the root-owned LIB_DIR) over $2 with mode $1 atomically: a running bash reads its
# script lazily, so a supervisor must never see its file truncated in place. Sets FILES_CHANGED=1 on a change.
FILES_CHANGED=0
commit_file() {
  local mode="$1" dst="$2" tmp="$2.new"
  root_own "$tmp"
  chmod "$mode" "$tmp"
  if cmp -s "$tmp" "$dst"; then rm -f "$tmp"; else mv -f "$tmp" "$dst"; FILES_CHANGED=1; fi
}

# supervisors of installs made before LIB_DIR existed ran $RUN_DIR/supervise.sh (only root-owned processes count)
legacy_sup_pids() {
  local p
  for p in $(pgrep -f "$RUN_DIR/supervise.sh" 2>/dev/null || true); do
    [ "$(stat -c %u "/proc/$p" 2>/dev/null)" = 0 ] && echo "$p"
  done
  return 0
}
stop_legacy() {
  local pids; pids="$(legacy_sup_pids | tr '\n' ' ')"
  [ -n "${pids// /}" ] || return 0
  # shellcheck disable=SC2086
  kill -TERM $pids 2>/dev/null || true
  local i p alive
  for i in $(seq 1 60); do
    alive=0
    for p in $pids; do kill -0 "$p" 2>/dev/null && alive=1; done
    [ $alive -eq 0 ] && break
    sleep 1
  done
  # shellcheck disable=SC2086
  kill -KILL $pids 2>/dev/null || true
  kill_leftovers
  ok "stopped the old supervisor ($RUN_DIR/supervise.sh)"
}

# launcher: sizes memory and workers from the machine at every start, then execs node on the server of the project
# build (the unit passes it as the argument). Root-owned in LIB_DIR; runs as the service user.
write_launcher() {
  local node; node="$(node_bin)"
  ensure_lib_dir
  {
    echo '#!/usr/bin/env bash'
    echo "# launcher for $NAME (written by cts.sh): resources from the machine at every start, then the server"
    printf 'ENV_FILE=%q\nNODE_BIN=%q\nSERVER=%q\nLOG_FILE=%q\n' "$ENV_FILE" "$node" "$SERVER_JS" "$LOG_DIR/server.log"
    echo 'SERVER="${1:-$SERVER}" # the unit passes the server of the project build'
    cat <<'LAUNCH'
# the launcher runs as the service user and opens the log itself (systemd's append: and a root supervisor would open
# it as root — through any symlink the user planted); if it cannot, output stays on stdout / stderr (journal)
exec >>"$LOG_FILE" 2>&1 || echo "launcher: cannot open $LOG_FILE, logging to stdout" >&2
# the env file read like systemd's EnvironmentFile: KEY=VALUE lines, values verbatim (spaces allowed, outer quotes
# removed), CRLF endings tolerated, comments / blank lines / lines without '=' skipped — never executed as shell
load_env() {
  local line k v
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    line="${line#"${line%%[![:space:]]*}"}"
    case "$line" in '' | '#'* | ';'*) continue ;; *=*) ;; *) continue ;; esac
    k="${line%%=*}"; v="${line#*=}"
    k="${k%"${k##*[![:space:]]}"}"
    case "$k" in *[!A-Za-z0-9_]* | '' | [0-9]*) continue ;; esac
    case "$v" in \"*\") v="${v:1:${#v}-2}" ;; \'*\') v="${v:1:${#v}-2}" ;; esac
    export "$k=$v"
  done <"$1"
}
[ -r "$ENV_FILE" ] && load_env "$ENV_FILE"

# ── resources ──
# The service's own cgroup, not the root: under systemd (cgroup v2) the limits live at
# /sys/fs/cgroup/system.slice/NAME.service/{memory.max,cpu.max}. The path comes from /proc/self/cgroup
# ("0::/path" on v2, "N:memory:/path" / "N:cpu,cpuacct:/path" on v1); every level from it up to the root is read
# and the lowest limit wins (a parent slice can be tighter). No limit anywhere → /proc/meminfo and nproc.
CG_ROOT=/sys/fs/cgroup
CG_SELF=/proc/self/cgroup
cg_path() { # $1 = v1 controller name, or "" for the v2 unified hierarchy
  if [ -z "$1" ]; then awk -F: '$1 == "0" && $2 == "" { print $3; exit }' "$CG_SELF" 2>/dev/null
  else awk -F: -v c="$1" '{ n = split($2, a, ","); for (i = 1; i <= n; i++) if (a[i] == c) { print $3; exit } }' "$CG_SELF" 2>/dev/null; fi
}
cg_levels() { # $1 = hierarchy dir, $2 = cgroup path: every existing dir from the cgroup up to the hierarchy root
  local d="$2"
  while :; do
    [ -d "$1$d" ] && printf '%s\n' "$1$d"
    { [ -z "$d" ] || [ "$d" = / ]; } && break
    d="${d%/*}"
  done
}
cg_mem_limit_kb() { # lowest memory limit in kB, or nothing
  local d v best=""
  while IFS= read -r d; do
    for v in "$(cat "$d/memory.max" 2>/dev/null)" "$(cat "$d/memory.limit_in_bytes" 2>/dev/null)"; do
      case "$v" in '' | *[!0-9]*) continue ;; esac # "max" / "-1" = unlimited
      [ "$v" -gt 0 ] || continue
      v=$((v / 1024))
      { [ -z "$best" ] || [ "$v" -lt "$best" ]; } && best=$v
    done
  done < <(cg_levels "$CG_ROOT" "$(cg_path "")"; cg_levels "$CG_ROOT/memory" "$(cg_path memory)")
  [ -n "$best" ] && echo "$best"
  return 0
}
cg_cpu_limit() { # lowest CPU quota rounded up to whole CPUs, or nothing
  local d q p c best=""
  while IFS= read -r d; do
    q=""; p=""
    if [ -r "$d/cpu.max" ]; then read -r q p <"$d/cpu.max"
    elif [ -r "$d/cpu.cfs_quota_us" ]; then q="$(cat "$d/cpu.cfs_quota_us")"; p="$(cat "$d/cpu.cfs_period_us" 2>/dev/null)"; fi
    case "$q" in '' | *[!0-9]*) continue ;; esac # "max" / "-1" = unlimited
    case "$p" in '' | *[!0-9]*) continue ;; esac
    [ "$p" -gt 0 ] && [ "$q" -gt 0 ] || continue
    c=$(((q + p - 1) / p))
    { [ -z "$best" ] || [ "$c" -lt "$best" ]; } && best=$c
  done < <(cg_levels "$CG_ROOT" "$(cg_path "")"; cg_levels "$CG_ROOT/cpu" "$(cg_path cpu)")
  [ -n "$best" ] && echo "$best"
  return 0
}
# heap (MB) for a memory budget (MB) and a worker count. CTS_HEAP_PCT % of the budget (default 85, 50–95), but
# the rest of the process needs room outside the V8 old space: ~256 MB for the main isolate's native memory /
# code / buffers and ~128 MB per worker thread (each worker is its own isolate). Hence
#     heap = max(256, min(pct·mem, mem − 256 − 128·workers))
# e.g. 1 GB / 2 workers → 512 MB, 4 GB / 4 workers → 3328 MB, 16 GB / 8 workers → 13926 MB.
heap_mb() {
  local mem="$1" w="$2" pct="${CTS_HEAP_PCT:-85}" a b h
  case "$pct" in '' | *[!0-9]*) pct=85 ;; esac
  [ "$pct" -lt 50 ] && pct=50
  [ "$pct" -gt 95 ] && pct=95
  a=$((mem * pct / 100)); b=$((mem - 256 - 128 * w))
  h=$a; [ "$b" -lt "$h" ] && h=$b
  [ "$h" -lt 256 ] && h=256
  echo "$h"
}
if [ "${CTS_AUTO_RESOURCES:-1}" = "1" ]; then
  mem_kb=$(awk '/MemTotal/{print $2}' /proc/meminfo)
  lim_kb=$(cg_mem_limit_kb)
  [ -n "$lim_kb" ] && [ "$lim_kb" -lt "$mem_kb" ] && mem_kb=$lim_kb
  cpus=$(nproc 2>/dev/null || echo 1)
  lim_cpu=$(cg_cpu_limit)
  [ -n "$lim_cpu" ] && [ "$lim_cpu" -lt "$cpus" ] && cpus=$lim_cpu
  [ "$cpus" -lt 1 ] && cpus=1
  heap=$(heap_mb $((mem_kb / 1024)) "$cpus")
  # young generation: larger semi-spaces cut minor GCs while tapes are built (64 MB from 4 GB of heap)
  semi=16; [ "$heap" -ge 4096 ] && semi=64; [ "$heap" -ge 2048 ] && [ "$heap" -lt 4096 ] && semi=32
  NODE_OPTIONS="$(printf '%s' "${NODE_OPTIONS:-}" | sed -E 's/--max-old-space-size=[0-9]+//g; s/--max-semi-space-size=[0-9]+//g') --max-old-space-size=$heap --max-semi-space-size=$semi"
  CTS_CORE_WORKERS=$cpus
  # libuv pool (file / DNS / crypto work) as wide as the CPUs, at least the default 4
  UV_THREADPOOL_SIZE=$((cpus > 4 ? cpus : 4))
  export NODE_OPTIONS CTS_CORE_WORKERS UV_THREADPOOL_SIZE
  echo "[$(date -Is)] resources: memory $((mem_kb / 1024)) MB → heap ${heap} MB (${CTS_HEAP_PCT:-85} %), semi-space ${semi} MB, ${cpus} workers" >&2
fi
exec "$NODE_BIN" "$SERVER"
LAUNCH
  } >"$LIB_DIR/launch.sh.new"
  commit_file 755 "$LIB_DIR/launch.sh"
}

# the unit, rendered from the template kept in the project: @NAME@ @USER@ @PROJECT_DIR@ @DATA_DIR@ @ENV_FILE@ @LAUNCHER@
render_unit() {
  local t
  [ -f "$TEMPLATE" ] || die "the unit template $TEMPLATE is missing"
  t="$(cat "$TEMPLATE"; printf x)"; t="${t%x}"
  t="${t//@NAME@/"$NAME"}"
  t="${t//@USER@/"$NAME"}"
  t="${t//@PROJECT_DIR@/"$PROJECT_DIR"}"
  t="${t//@DATA_DIR@/"$DATA_DIR"}"
  t="${t//@ENV_FILE@/"$ENV_FILE"}"
  t="${t//@LAUNCHER@/"$LIB_DIR/launch.sh"}"
  printf '%s' "$t"
}

write_unit() {
  local node; node="$(node_bin)"
  write_launcher
  if systemd_up; then
    mkdir -p "$(dirname "$UNIT")"
    render_unit >"$UNIT.new"
    commit_file 644 "$UNIT"
    sc daemon-reload
    sc enable -q "$NAME" 2>/dev/null || true
    ok "systemd service $NAME (runs $SERVER_JS)"
  else
    # no systemd (containers): a supervisor loop restarts the server on exit; @reboot via cron when available.
    # It runs as root, so it lives in the root-owned LIB_DIR (with its pid files), and everything it touches in the
    # user-owned data directory (the log) is opened as the service user — never root writing through a user symlink.
    stop_legacy
    {
      echo '#!/usr/bin/env bash'
      echo "# supervisor for $NAME (written by cts.sh) — restarts the server whenever it exits"
      printf 'LIB=%q\nLOG=%q\nSVC=%q\nHOME_DIR=%q\nNODE_DIR=%q\n' \
        "$LIB_DIR" "$LOG_DIR/server.log" "$NAME" "$DATA_DIR" "$(dirname "$node")"
      cat <<'SUP'
trap 'kill -TERM "$child" 2>/dev/null; wait "$child"; exit 0' TERM INT
echo $$ >"$LIB/supervisor.pid"
# as the service user, in a clean environment: only what the data directory's env file sets (plus PATH / HOME / LANG)
SVC_RUN=(env -i PATH="/usr/local/bin:/usr/bin:/bin:$NODE_DIR" HOME="$HOME_DIR" LANG=C.UTF-8
  setpriv --reuid="$SVC" --regid="$SVC" --init-groups)
as_svc() { "${SVC_RUN[@]}" "$@"; }
while true; do
  cd "$HOME_DIR" || exit 1 # the data directory: the only place the server writes
  # the launcher opens the log as the service user, then execs node: the pid below is node itself and receives the
  # stop signal. A plain command, not the as_svc function: a backgrounded function runs in a subshell, whose pid
  # would be recorded instead of node's (a stop then left node running without a supervisor)
  "${SVC_RUN[@]}" "$LIB/launch.sh" </dev/null >/dev/null 2>&1 &
  child=$!
  echo "$child" >"$LIB/server.pid"
  wait "$child"
  rc=$?
  as_svc /bin/sh -c 'echo "$0" >>"$1"' "[$(date -Is)] server exited ($rc), restarting in 5 s" "$LOG"
  sleep 5
done
SUP
    } >"$LIB_DIR/supervise.sh.new"
    commit_file 755 "$LIB_DIR/supervise.sh"
    rm -f "$RUN_DIR/supervise.sh" "$RUN_DIR/launch.sh" "$RUN_DIR/supervisor.pid" "$RUN_DIR/server.pid"
    if have crontab; then
      (crontab -l 2>/dev/null | grep -v -e "$RUN_DIR/supervise.sh" -e "$LIB_DIR/supervise.sh"
        echo "@reboot $LIB_DIR/supervise.sh >/dev/null 2>&1 &") | crontab - 2>/dev/null || true
    fi
    ok "supervisor $LIB_DIR/supervise.sh (no systemd)"
  fi
}

svc_running() {
  if systemd_up && [ -f "$UNIT" ]; then sc is-active -q "$NAME"; else
    # the pid must still be OUR supervisor (a stale pid file can point at a recycled pid)
    local p; p="$(cat "$LIB_DIR/supervisor.pid" 2>/dev/null || true)"
    [ -n "$p" ] && tr '\0' ' ' 2>/dev/null <"/proc/$p/cmdline" | grep -q "$LIB_DIR/supervise.sh"
  fi
}

svc_start() {
  if systemd_up && [ -f "$UNIT" ]; then sc start "$NAME"; else
    svc_running && return 0
    [ -x "$LIB_DIR/supervise.sh" ] || write_unit
    # 9>&- : the supervisor must not inherit (and hold forever) this script's lock
    setsid nohup "$LIB_DIR/supervise.sh" >/dev/null 2>&1 </dev/null 9>&- &
    sleep 1
  fi
}

# graceful: SIGTERM lets the engine save settings, stats and the database snapshot; SIGKILL only after 60 s
svc_stop() {
  if systemd_up && [ -f "$UNIT" ]; then
    sc stop "$NAME" 2>/dev/null || true
  fi
  stop_legacy
  local sup srv
  sup="$(cat "$LIB_DIR/supervisor.pid" 2>/dev/null || true)"
  srv="$(cat "$LIB_DIR/server.pid" 2>/dev/null || true)"
  [ -n "$sup" ] && kill -TERM "$sup" 2>/dev/null || true
  [ -n "$srv" ] && kill -TERM "$srv" 2>/dev/null || true
  local i
  for i in $(seq 1 60); do
    { [ -n "$sup" ] && kill -0 "$sup" 2>/dev/null; } || { [ -n "$srv" ] && kill -0 "$srv" 2>/dev/null; } || break
    sleep 1
  done
  [ -n "$sup" ] && kill -KILL "$sup" 2>/dev/null || true
  [ -n "$srv" ] && kill -KILL "$srv" 2>/dev/null || true
  rm -f "$LIB_DIR/supervisor.pid" "$LIB_DIR/server.pid"
  # a server left over from an older supervisor (or a manual start) must not outlive the stop
  kill_leftovers
}

# every server of this project (or of the earlier /opt copy) still running, and whatever holds our port
kill_leftovers() {
  local pids="" p pat
  for pat in "$OUT_DIR/server/" "$LEGACY_APP_DIR/current/"; do
    for p in $(pgrep -f "$(re_escape "$pat")" 2>/dev/null || true); do
      [ "$p" = "$$" ] && continue
      is_ours "$p" || continue
      pids="$pids $p"
    done
  done
  for p in $(port_pids); do
    is_ours "$p" && pids="$pids $p"
  done
  pids="$(echo "$pids" | tr ' ' '\n' | sort -u | tr '\n' ' ')"
  [ -n "${pids// /}" ] || return 0
  # shellcheck disable=SC2086
  kill -TERM $pids 2>/dev/null || true
  for _ in $(seq 1 30); do
    local alive=0
    for p in $pids; do kill -0 "$p" 2>/dev/null && alive=1; done
    [ $alive -eq 0 ] && break
    sleep 1
  done
  # shellcheck disable=SC2086
  kill -KILL $pids 2>/dev/null || true
  ok "stopped leftover process(es):$pids"
}

port_free_or_ours() {
  local p
  for p in $(port_pids); do
    is_ours "$p" && continue
    die "port $PORT is used by another program (pid $p: $(tr '\0' ' ' 2>/dev/null <"/proc/$p/cmdline" | cut -c1-80)) — choose --port"
  done
}

wait_healthy() {
  local i
  for i in $(seq 1 "$HEALTH_TIMEOUT"); do
    health && return 0
    sleep 1
  done
  return 1
}

installed() { [ -f "$UNIT" ] || [ -f "$LIB_DIR/launch.sh" ]; }

# start the service on this build. A running service is restarted when the build or its files changed (arg 1 = 1).
bring_up() {
  if [ "$1" -eq 1 ] && svc_running; then
    step "Restarting $NAME (new build or service files)"
    svc_stop
  fi
  if ! svc_running; then
    port_free_or_ours
    svc_start
  fi
  wait_healthy && ok "healthy on port $PORT" || die "not healthy — see $LOG_DIR/server.log"
}

# the program copy of an earlier install (/opt/NAME: releases and a current symlink) is replaced by the project build.
# It is deleted only when it has that installer's shape and is root-owned; never the project, never a directory that
# holds the project.
retire_legacy_copy() {
  local old="$LEGACY_APP_DIR"
  if [ ! -e "$old" ] && [ ! -L "$old" ]; then return 0; fi
  if [ -L "$old" ] || [ ! -d "$old/releases" ] || [ ! -L "$old/current" ] ||
    [ "$(stat -c %u "$old")" != 0 ] || [ "$(stat -c %u "$old/current")" != 0 ]; then
    warn "$old is not an earlier program copy of $NAME — left alone"
    return 0
  fi
  case "$PROJECT_DIR/" in "$old/"*) die "the project is inside $old — refusing to delete it" ;; esac
  case "$old/" in "$PROJECT_DIR/"*) die "$old is inside the project — refusing to delete it" ;; esac
  step "Removing the earlier program copy $old (the service runs from $PROJECT_DIR)"
  rm -rf -- "$old"
  ok "removed $old"
}

# ── commands ─────────────────────────────────────────────────────────────────────────────────────────────────────
# install --clean: stop the service, then delete the persistent data, the saved options and the build logs. Each path
# is printed before it is deleted.
remove_kept() { # $1 = path, $2 = what it is
  if [ -e "$1" ] || [ -L "$1" ]; then
    printf '  deleting %s: %s\n' "$2" "$1"
    rm -rf -- "$1"
  else
    skip "$2 not present: $1"
  fi
}
clean_data() {
  step "--clean: deleting the persistent data of $NAME"
  svc_stop
  remove_kept "$DATA_DIR" "data directory"
  remove_kept "$CONF" "saved options"
  remove_kept "$BUILD_LOG_DIR" "build logs"
}

cmd_install() {
  port_free_or_ours # before any download / build: a busy port is reported at once
  deps
  if [ "$CLEAN" -eq 1 ]; then clean_data; fi
  ensure_user
  save_conf
  ensure_env
  local built=0
  if [ "$CLEAN" -eq 1 ] || [ "$FORCE" -eq 1 ] || [ ! -f "$SERVER_JS" ]; then
    if [ -n "$SOURCE" ]; then sync_source; fi
    build_project
    built=1
  else
    skip "built already: $SERVER_JS (update rebuilds it; --force rebuilds now)"
  fi
  FILES_CHANGED=0
  write_unit
  if [ "$built" -eq 1 ] || [ "$FILES_CHANGED" -eq 1 ]; then bring_up 1; else bring_up 0; fi
  retire_legacy_copy
}

cmd_update() {
  installed || die "$NAME is not installed (install it with: $0 install --name $NAME)"
  port_free_or_ours
  deps
  ensure_env
  save_conf
  if [ -n "$SOURCE" ]; then sync_source; fi
  build_project
  FILES_CHANGED=0
  write_unit
  bring_up 1
  retire_legacy_copy
}

cmd_remove_program() {
  step "Stopping $NAME and deleting its generated files (data, saved options, build logs and the project are kept)"
  svc_stop
  kill_leftovers
  if systemd_up && [ -f "$UNIT" ]; then sc disable -q "$NAME" 2>/dev/null || true; fi
  rm -f "$UNIT" "$UNIT.new"
  if systemd_up; then sc daemon-reload; fi
  if [ "$TEST_ROOT" -eq 0 ] && have crontab; then
    (crontab -l 2>/dev/null | grep -v -e "$RUN_DIR/supervise.sh" -e "$LIB_DIR/supervise.sh" | crontab - 2>/dev/null || true)
  fi
  rm -f "$LIB_DIR/launch.sh" "$LIB_DIR/launch.sh.new" "$LIB_DIR/supervise.sh" "$LIB_DIR/supervise.sh.new" \
    "$LIB_DIR/supervisor.pid" "$LIB_DIR/server.pid"
  rm -rf -- "$OUT_DIR"
  retire_legacy_copy
  [ -f "$REGISTRY" ] && sed -i "/^$NAME /d" "$REGISTRY"
  ok "service and generated files removed"
}

cmd_reinstall() {
  cmd_remove_program
  cmd_install
}

cmd_remove() {
  cmd_remove_program
  skip "kept: data $DATA_DIR, saved options $CONF, build logs $BUILD_LOG_DIR, service user $NAME, project $PROJECT_DIR"
  skip "data is kept; use install --clean to remove it"
}

info() {
  local rev state; rev="$(project_rev)"
  if svc_running; then state="${G}running${N}"; else state="${R}stopped${N}"; fi
  health && state="$state, ${G}healthy${N}" || state="$state, ${Y}not answering${N}"
  echo
  printf '%s%s%s %s\n' "$B" "CTS-A-O" "$N" "($NAME)"
  printf '  %-10s %b\n' "state" "$state"
  printf '  %-10s %s\n' "version" "${rev:-–}"
  printf '  %-10s %s\n' "project" "$PROJECT_DIR  (build: $OUT_DIR)"
  printf '  %-10s %s\n' "data" "$DATA_DIR  (env, state.json, core.sqlite, logs/)"
  printf '  %-10s %s\n' "settings" "$CONF"
  printf '  %-10s %s\n' "service" "$(systemd_up && [ -f "$UNIT" ] && echo "systemd: systemctl status $NAME" || echo "supervisor: $LIB_DIR/supervise.sh")"
  printf '  %-10s %s\n' "launcher" "$LIB_DIR/launch.sh"
  printf '  %-10s %s\n' "logs" "$LOG_DIR/server.log"
  echo "  open:"
  local ip
  for ip in $(ips); do printf '    http://%s:%s/v2\n' "$ip" "$PORT"; done
  local pub; pub="$(public_ip)"
  [ -n "$pub" ] && printf '    http://%s:%s/v2   (public, if the firewall allows port %s)\n' "$pub" "$PORT" "$PORT"
  printf '  %-10s %s\n' "manage" "$0 update | restart | status | logs | remove"
  echo
}

# the installing commands need the project (--source copies it in first)
case "$CMD" in
  install | update | reinstall) [ -n "$SOURCE" ] || [ -f "$PROJECT_DIR/package.json" ] || die "$PROJECT_DIR is not the CTS-A-O project (no package.json) — pass --dir DIR" ;;
esac

# a settings file still in the data directory: move it to $CONF now (parsed and filtered above, never sourced)
if [ "$MIGRATE" -eq 1 ]; then save_conf; fi

case "$CMD" in
  install) cmd_install; info ;;
  update) cmd_update; info ;;
  reinstall) cmd_reinstall; info ;;
  remove) cmd_remove ;;
  start) port_free_or_ours; svc_start; wait_healthy && ok "healthy" || warn "not healthy yet — see $LOG_DIR/server.log"; info ;;
  stop) svc_stop; ok "stopped (state and snapshot saved)" ;;
  restart) svc_stop; svc_start; wait_healthy && ok "healthy" || warn "not healthy yet — see $LOG_DIR/server.log"; info ;;
  status | info) info ;;
  logs) tail -n 200 -f "$LOG_DIR/server.log" ;;
esac
