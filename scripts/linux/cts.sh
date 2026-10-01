#!/usr/bin/env bash
# CTS-A-O — Linux installer / updater / service manager.
#
#   sudo ./scripts/linux/cts.sh install   [--name cts-a-o] [--port 8080] [options]
#   sudo ./scripts/linux/cts.sh update    [--force]
#   sudo ./scripts/linux/cts.sh reinstall
#   sudo ./scripts/linux/cts.sh remove    [--purge]
#   sudo ./scripts/linux/cts.sh start | stop | restart | status | logs | info
#
# Options (each defaults to the value saved by the last install of that name, then to the standard):
#   --name NAME       instance name: service, user and default paths           (cts-a-o)
#   --port PORT       HTTP port                                                 (8080)
#   --host HOST       bind address                                              (0.0.0.0)
#   --dir DIR         program files (releases + current symlink)                (/opt/NAME)
#   --data DIR        persistent data: env, settings, stats, SQLite, logs       (/var/lib/NAME)
#   --repo URL        git source                                                (this checkout's origin)
#   --branch BRANCH   git branch                                                (main)
#   --source DIR      install from a local checkout instead of git
#   --force           update / build even when the source commit is unchanged
#   --purge           remove: also delete the data directory (env, settings, stats, database)
#
# The data directory is independent of the program files: install, update, reinstall and remove never touch
# it (only `remove --purge` does), so settings, presets, statistics, the database snapshot and the environment
# (API keys, CTS_CORE_LIVE, …) survive every step. Every step is idempotent: installed dependencies are kept,
# an installed instance is only brought up, an unchanged source is not rebuilt.
set -Eeuo pipefail

# ── defaults ─────────────────────────────────────────────────────────────────────────────────────────────────
DEF_NAME="cts-a-o"
DEF_PORT="8080"
DEF_HOST="0.0.0.0"
DEF_BRANCH="main"
DEF_REPO="https://github.com/mxssnx-creator/CTS-A-O.git"
NODE_MIN_MAJOR=22
NODE_MIN_MINOR=13 # node:sqlite without a flag
KEEP_RELEASES=3
HEALTH_TIMEOUT=180

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

# ── output ───────────────────────────────────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; D=$'\e[2m'; N=$'\e[0m'; else B= G= Y= R= D= N=; fi
step() { printf '%s==>%s %s\n' "$B" "$N" "$*"; }
ok() { printf '  %s✓%s %s\n' "$G" "$N" "$*"; }
skip() { printf '  %s•%s %s\n' "$D" "$N" "$*"; }
warn() { printf '  %s!%s %s\n' "$Y" "$N" "$*" >&2; }
die() { printf '%serror:%s %s\n' "$R" "$N" "$*" >&2; exit 1; }
trap 'die "failed at line $LINENO: $BASH_COMMAND"' ERR

# ── arguments ────────────────────────────────────────────────────────────────────────────────────────────────
CMD="${1:-}"
[ -n "$CMD" ] && shift || true
case "$CMD" in -h | --help) CMD=help ;; esac
A_NAME= A_PORT= A_HOST= A_DIR= A_DATA= A_REPO= A_BRANCH= A_SOURCE= FORCE=0 PURGE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --name) A_NAME="${2:?--name needs a value}"; shift 2 ;;
    --port) A_PORT="${2:?--port needs a value}"; shift 2 ;;
    --host) A_HOST="${2:?--host needs a value}"; shift 2 ;;
    --dir) A_DIR="${2:?--dir needs a value}"; shift 2 ;;
    --data) A_DATA="${2:?--data needs a value}"; shift 2 ;;
    --repo) A_REPO="${2:?--repo needs a value}"; shift 2 ;;
    --branch) A_BRANCH="${2:?--branch needs a value}"; shift 2 ;;
    --source) A_SOURCE="${2:?--source needs a value}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --purge) PURGE=1; shift ;;
    -y | --yes) shift ;;
    -h | --help) CMD=help; shift ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
done

usage() { sed -n '2,24p' "${BASH_SOURCE[0]:-$0}" | sed 's/^# \{0,1\}//'; }
case "$CMD" in
  install | update | reinstall | remove | start | stop | restart | status | logs | info) ;;
  help | "") usage; exit 0 ;;
  *) die "unknown command: $CMD (install | update | reinstall | remove | start | stop | restart | status | logs | info)" ;;
esac

[ "$(id -u)" -eq 0 ] || die "run as root (sudo $0 $CMD …)"

# instances installed by this script: "name data-dir" per line (lets later commands run without --name)
REGISTRY="/etc/cts-instances"
if [ -z "$A_NAME" ] && [ -f "$REGISTRY" ] && ! grep -q "^$DEF_NAME " "$REGISTRY"; then
  if [ "$(grep -c . "$REGISTRY")" -eq 1 ]; then
    A_NAME="$(awk 'NF{print $1; exit}' "$REGISTRY")"
    [ -z "$A_DATA" ] && A_DATA="$(awk 'NF{print $2; exit}' "$REGISTRY")"
  elif [ "$CMD" != install ] && [ "$CMD" != help ]; then
    printf 'several instances are installed — choose one with --name:\n' >&2
    awk 'NF{print "  " $1 "  (data " $2 ")"}' "$REGISTRY" >&2
    exit 1
  fi
fi
[ -z "$A_DATA" ] && [ -n "$A_NAME" ] && [ -f "$REGISTRY" ] && A_DATA="$(awk -v n="$A_NAME" '$1==n{print $2; exit}' "$REGISTRY")"
NAME="${A_NAME:-$DEF_NAME}"
[[ "$NAME" =~ ^[a-z][a-z0-9-]{1,31}$ ]] || die "--name: lowercase letters, digits and '-' (2–32 chars)"
# the saved install of this name provides the defaults for every later command. It lives root-owned in /etc/cts
# (root builds from REPO / SOURCE and deletes APP_DIR on remove, so the service user must not be able to edit it) and
# is PARSED — KEY=VALUE lines of known keys, values verbatim — never executed as shell.
CONF_DIR="/etc/cts"
CONF="$CONF_DIR/$NAME.conf"
# before: $DATA_DIR/install.conf, sourced as root although own() gives it to the service user. Migrated once (parsed,
# filtered, see legacy_filter), then deleted by save_conf.
LEGACY_CONF="${A_DATA:-/var/lib/$NAME}/install.conf"
CONF_KEYS=" PORT HOST APP_DIR DATA_DIR REPO BRANCH SOURCE "
C_PORT='' C_HOST='' C_APP_DIR='' C_DATA_DIR='' C_REPO='' C_BRANCH='' C_SOURCE=''
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
  [[ "$C_BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]] || C_BRANCH=
  # a program directory only when it really is an install: root-owned, with the root-created `current` symlink
  if [ -n "$C_APP_DIR" ] && ! { [ -d "$C_APP_DIR" ] && [ ! -L "$C_APP_DIR" ] && [ "$(stat -c %u "$C_APP_DIR")" = 0 ] &&
    [ -L "$C_APP_DIR/current" ] && [ "$(stat -c %u "$C_APP_DIR/current")" = 0 ]; }; then
    warn "ignoring APP_DIR=$C_APP_DIR from $LEGACY_CONF (not an install) — pass --dir"
    C_APP_DIR=
  fi
  local origin; origin="$(git -C "$SCRIPT_DIR" remote get-url origin 2>/dev/null || true)"
  if [ -n "$C_REPO" ] && [ "$C_REPO" != "$DEF_REPO" ] && [ "$C_REPO" != "$origin" ]; then
    warn "ignoring REPO from $LEGACY_CONF (user-writable) — pass --repo to keep it"
    C_REPO=
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
APP_DIR="${A_DIR:-${C_APP_DIR:-/opt/$NAME}}"
DATA_DIR="${A_DATA:-${C_DATA_DIR:-/var/lib/$NAME}}"
BRANCH="${A_BRANCH:-${C_BRANCH:-$DEF_BRANCH}}"
SOURCE="${A_SOURCE:-${C_SOURCE:-}}"
REPO="${A_REPO:-$C_REPO}"
if [ -z "$REPO" ]; then
  REPO="$(git -C "$SCRIPT_DIR" remote get-url origin 2>/dev/null || true)"
  REPO="${REPO:-$DEF_REPO}"
fi
[[ "$PORT" =~ ^[0-9]+$ ]] && [ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ] || die "--port: 1–65535"
case "$APP_DIR" in /|/usr|/usr/*|/etc|/etc/*|/var|/home|/root|"$DATA_DIR") die "--dir $APP_DIR is not a safe program directory" ;; esac
case "$DATA_DIR" in /|/usr|/etc|/var|/home|/root|"$APP_DIR"|"$APP_DIR"/*) die "--data $DATA_DIR must be its own directory, outside --dir" ;; esac

ENV_FILE="$DATA_DIR/env"
LOG_DIR="$DATA_DIR/logs"
RUN_DIR="$DATA_DIR/run"
# root-owned home of everything root executes or trusts (launcher, supervisor, pid files). It must NOT live in the
# data directory: own() hands that to the service user, who could then rewrite a script root runs (supervise.sh via
# svc_start / @reboot) or plant symlinks for root to write through.
LIB_DIR="/usr/local/lib/$NAME"
BUILD_LOG_DIR="/var/log/$NAME-build" # root-owned: npm-ci.log, build.log
UNIT="/etc/systemd/system/$NAME.service"
LOCK="/run/lock/$NAME-installer.lock"

mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"
flock -n 9 || die "another $0 run for $NAME is in progress"

# ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────
have() { command -v "$1" >/dev/null 2>&1; }
systemd_up() { [ -d /run/systemd/system ] && have systemctl; }
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
current_rev() { cat "$APP_DIR/current/.release" 2>/dev/null | head -1 || true; }
node_bin() { command -v node; }
save_conf() {
  touch "$REGISTRY"
  sed -i "/^$NAME /d" "$REGISTRY"
  echo "$NAME $DATA_DIR" >>"$REGISTRY"
  mkdir -p "$DATA_DIR"
  [ -L "$CONF_DIR" ] && die "$CONF_DIR is a symlink — refusing to use it"
  mkdir -p "$CONF_DIR"
  chown root:root "$CONF_DIR"
  chmod 755 "$CONF_DIR"
  local k
  for k in PORT HOST APP_DIR DATA_DIR REPO BRANCH SOURCE; do
    case "${!k}" in *$'\n'* | *$'\r'*) die "$k must not contain a line break" ;; esac
  done
  {
    echo "# written by cts.sh — defaults for the next install / update / reinstall / remove of $NAME"
    echo "# KEY=VALUE, parsed (never executed); values verbatim"
    for k in PORT HOST APP_DIR DATA_DIR REPO BRANCH SOURCE; do printf '%s=%s\n' "$k" "${!k}"; done
  } >"$CONF.new"
  chown root:root "$CONF.new"
  chmod 600 "$CONF.new" # REPO may carry credentials
  mv -f "$CONF.new" "$CONF"
  # the old user-writable copy: rm unlinks the entry itself (never follows a symlink)
  if [ -e "$DATA_DIR/install.conf" ] || [ -L "$DATA_DIR/install.conf" ]; then
    rm -f "$DATA_DIR/install.conf"
    ok "settings moved to $CONF"
  fi
}

# ── dependencies ─────────────────────────────────────────────────────────────────────────────────────────────
deps() {
  step "Dependencies"
  local miss=()
  for c in git curl flock setpriv; do have "$c" && skip "$c already installed" || miss+=("$c"); done
  have fuser || have lsof || miss+=(psmisc)
  have tar || miss+=(tar)
  if [ ${#miss[@]} -gt 0 ]; then
    local pk=()
    for c in "${miss[@]}"; do case "$c" in flock | setpriv) pk+=(util-linux) ;; *) pk+=("$c") ;; esac; done
    pk+=(ca-certificates)
    pkg_install "${pk[@]}"
    ok "installed ${miss[*]}"
  fi
  if node_ok; then
    skip "node $(node -v) already installed"
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
    chown "$NAME:$NAME" "$ENV_FILE"
  fi
  chown -h "$NAME:$NAME" "$DATA_DIR" # -h: never follows a symlink
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
  out="$out"$'\n'"PORT=$PORT"$'\n'"HOST=$HOST"$'\n'"CTS_CORE_WORKER=$APP_DIR/current/src/core/server/tapes.worker.ts"
  # as the user: mktemp creates the temp file 0600 with O_EXCL, mv renames it over the old entry (a planted symlink
  # is replaced, never followed)
  # shellcheck disable=SC2016
  printf '%s\n' "$out" | as_user /bin/sh -c 'umask 077; t=$(mktemp "$1/.env.XXXXXX") || exit 1
    cat >"$t" && chmod 600 "$t" && mv -f "$t" "$2" || { rm -f "$t"; exit 1; }' sh "$DATA_DIR" "$ENV_FILE" ||
    die "cannot write $ENV_FILE as $NAME"
  # the program directory is read-only for the service: state and snapshot must point elsewhere
  local k v
  for k in CTS_CORE_STATE CTS_CORE_SNAPSHOT; do
    v="$(printf '%s\n' "$out" | sed -n "s/^$k=//p" | tail -n 1)"
    case "$v" in "$APP_DIR" | "$APP_DIR"/* | .* | [!/]*)
      [ "$v" = off ] || warn "$k=$v in $ENV_FILE is not writable by $NAME (outside $DATA_DIR) — set it under $DATA_DIR" ;;
    esac
  done
  [ $added -gt 0 ] && ok "environment $ENV_FILE ($added new default(s))" || skip "environment $ENV_FILE kept"
}

# build logs are written by root: a root-owned directory, never the user-owned $LOG_DIR (a planted symlink there
# would have root truncate / write any file)
ensure_build_log_dir() {
  [ -L "$BUILD_LOG_DIR" ] && die "$BUILD_LOG_DIR is a symlink — refusing to use it"
  mkdir -p "$BUILD_LOG_DIR"
  chown root:root "$BUILD_LOG_DIR"
  chmod 750 "$BUILD_LOG_DIR"
}

# ── source and build ─────────────────────────────────────────────────────────────────────────────────────────
# fetch the source into $1; prints the revision
fetch_source() {
  local dst="$1"
  mkdir -p "$dst"
  if [ -n "$SOURCE" ]; then
    [ -f "$SOURCE/package.json" ] || die "--source $SOURCE is not a CTS-A-O checkout"
    tar -C "$SOURCE" --exclude=./node_modules --exclude=./.output --exclude=./.vercel --exclude=./.git \
      --exclude=./screenshots --exclude=./.cts-core -cf - . | tar -C "$dst" -xf -
    local rev
    rev="$(git -C "$SOURCE" rev-parse --short HEAD 2>/dev/null || echo local)"
    if [ -n "$(git -C "$SOURCE" status --porcelain 2>/dev/null)" ]; then
      rev="$rev-$(tar -C "$SOURCE" --exclude=./node_modules --exclude=./.output --exclude=./.vercel --exclude=./.git --exclude=./screenshots --exclude=./.cts-core -cf - . | sha1sum | cut -c1-8)"
    fi
    echo "$rev"
  else
    local cache="$APP_DIR/repo"
    if [ -d "$cache/.git" ]; then
      git -C "$cache" remote set-url origin "$REPO"
      git -C "$cache" fetch -q --depth 1 origin "$BRANCH"
      git -C "$cache" reset -q --hard FETCH_HEAD
    else
      rm -rf "$cache"
      git clone -q --depth 1 --branch "$BRANCH" "$REPO" "$cache" ||
        die "cannot clone $REPO ($BRANCH) — a private repository needs credentials, or use --source DIR"
    fi
    tar -C "$cache" --exclude=./.git -cf - . | tar -C "$dst" -xf -
    git -C "$cache" rev-parse --short HEAD
  fi
}

source_rev() {
  if [ -n "$SOURCE" ]; then
    local rev
    rev="$(git -C "$SOURCE" rev-parse --short HEAD 2>/dev/null || echo local)"
    if [ -n "$(git -C "$SOURCE" status --porcelain 2>/dev/null)" ]; then
      rev="$rev-$(tar -C "$SOURCE" --exclude=./node_modules --exclude=./.output --exclude=./.vercel --exclude=./.git --exclude=./screenshots --exclude=./.cts-core -cf - . | sha1sum | cut -c1-8)"
    fi
    echo "$rev"
  else
    git ls-remote "$REPO" "refs/heads/$BRANCH" 2>/dev/null | cut -c1-7
  fi
}

build_release() {
  local rel="$1" prev="$2"
  ensure_build_log_dir
  step "Dependencies of the release"
  local lock_new lock_old=""
  lock_new="$(sha1sum "$rel/package-lock.json" | cut -d' ' -f1)"
  [ -n "$prev" ] && [ -f "$prev/package-lock.json" ] && lock_old="$(sha1sum "$prev/package-lock.json" | cut -d' ' -f1)"
  if [ -n "$prev" ] && [ -e "$prev/.untrusted" ]; then
    lock_old="" # was writable by the service user: install fresh
  fi
  if [ -n "$prev" ] && [ "$lock_new" = "$lock_old" ] && [ -d "$prev/node_modules" ]; then
    cp -a "$prev/node_modules" "$rel/node_modules"
    skip "package-lock unchanged: node_modules reused"
  else
    (cd "$rel" && npm ci --no-audit --no-fund --loglevel=error >"$BUILD_LOG_DIR/npm-ci.log" 2>&1) ||
      die "npm ci failed — see $BUILD_LOG_DIR/npm-ci.log"
    ok "npm ci"
  fi
  step "Build (node server)"
  (cd "$rel" && PATH="$rel/node_modules/.bin:$PATH" NITRO_PRESET=node-server node scripts/with-app-env.mjs vite build >"$BUILD_LOG_DIR/build.log" 2>&1) ||
    die "build failed — see $BUILD_LOG_DIR/build.log"
  [ -f "$rel/.output/server/index.mjs" ] || die "build produced no server (see $BUILD_LOG_DIR/build.log)"
  ok "built $(du -sh "$rel/.output" | cut -f1)"
}

# ── service ──────────────────────────────────────────────────────────────────────────────────────────────────
ensure_lib_dir() {
  [ -L "$LIB_DIR" ] && die "$LIB_DIR is a symlink — refusing to use it"
  mkdir -p "$LIB_DIR"
  chown root:root "$LIB_DIR"
  chmod 755 "$LIB_DIR"
}

# move "$2.new" (written in the root-owned LIB_DIR) over $2 with mode $1 atomically: a running bash reads its
# script lazily, so a supervisor must never see its file truncated in place. Sets FILES_CHANGED=1 on a change.
FILES_CHANGED=0
commit_file() {
  local mode="$1" dst="$2" tmp="$2.new"
  chown root:root "$tmp"
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

# launcher: sizes memory and workers from the machine at every start (a resized VM or container is picked up by a
# plain restart), then execs node. Root-owned in LIB_DIR; runs as the service user.
write_launcher() {
  local node; node="$(node_bin)"
  ensure_lib_dir
  {
    echo '#!/usr/bin/env bash'
    echo "# launcher for $NAME (written by cts.sh): resources from the machine at every start, then the server"
    printf 'ENV_FILE=%q\nNODE_BIN=%q\nSERVER=%q\nLOG_FILE=%q\n' "$ENV_FILE" "$node" "$APP_DIR/current/.output/server/index.mjs" \
      "$LOG_DIR/server.log"
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

write_unit() {
  local node; node="$(node_bin)"
  write_launcher
  if systemd_up; then
    cat >"$UNIT.new" <<EOF
[Unit]
Description=CTS-A-O ($NAME)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$NAME
Group=$NAME
# the data directory: the only place the server writes (state / snapshot are set there in the env file; even the
# ./.cts-core fallback for an empty CTS_CORE_STATE lands there). The program directory is read-only for $NAME.
WorkingDirectory=$DATA_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$LIB_DIR/launch.sh
Restart=always
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=60
LimitNOFILE=65536
# the engine is the machine's main job: a larger CPU / IO share than other services, and the last to be OOM-killed
CPUWeight=1000
IOWeight=500
Nice=-5
OOMScoreAdjust=-500
# launch.sh appends to $LOG_DIR/server.log itself, as $NAME; only output before that reaches the journal
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    commit_file 644 "$UNIT"
    systemctl daemon-reload
    systemctl enable -q "$NAME" 2>/dev/null || true
    ok "systemd service $NAME"
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
  if systemd_up && [ -f "$UNIT" ]; then systemctl is-active -q "$NAME"; else
    # the pid must still be OUR supervisor (a stale pid file can point at a recycled pid)
    local p; p="$(cat "$LIB_DIR/supervisor.pid" 2>/dev/null || true)"
    [ -n "$p" ] && tr '\0' ' ' 2>/dev/null <"/proc/$p/cmdline" | grep -q "$LIB_DIR/supervise.sh"
  fi
}

svc_start() {
  if systemd_up && [ -f "$UNIT" ]; then systemctl start "$NAME"; else
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
    systemctl stop "$NAME" 2>/dev/null || true
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

# every process still running from the program directory or holding our port (a manual start, an old install)
kill_leftovers() {
  local pids="" p
  for p in $(pgrep -f "$APP_DIR/" 2>/dev/null || true); do
    [ "$p" = "$$" ] || [ "$p" = "$PPID" ] && continue
    # never this installer (or a subshell of it), whose command line may contain the path
    tr '\0' ' ' 2>/dev/null <"/proc/$p/cmdline" | grep -q "cts\.sh" && continue
    pids="$pids $p"
  done
  for p in $(port_pids); do
    if readlink "/proc/$p/cwd" 2>/dev/null | grep -q "^$APP_DIR" ||
      tr '\0' ' ' 2>/dev/null <"/proc/$p/cmdline" | grep -q "$APP_DIR"; then pids="$pids $p"; fi
  done
  pids="$(echo "$pids" | tr ' ' '\n' | sort -u | tr '\n' ' ')"
  [ -n "${pids// /}" ] || return 0
  kill -TERM $pids 2>/dev/null || true
  for _ in $(seq 1 30); do
    local alive=0
    for p in $pids; do kill -0 "$p" 2>/dev/null && alive=1; done
    [ $alive -eq 0 ] && break
    sleep 1
  done
  kill -KILL $pids 2>/dev/null || true
  ok "stopped leftover process(es):$pids"
}

port_free_or_ours() {
  local p
  for p in $(port_pids); do
    readlink "/proc/$p/cwd" 2>/dev/null | grep -q "^$APP_DIR" && continue
    tr '\0' ' ' 2>/dev/null <"/proc/$p/cmdline" | grep -q "$APP_DIR" && continue
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

activate() {
  local rel="$1"
  ln -sfn "$rel" "$APP_DIR/current.new"
  mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"
}

prune_releases() {
  local cur; cur="$(readlink -f "$APP_DIR/current" 2>/dev/null || true)"
  ls -1dt "$APP_DIR"/releases/* 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | while read -r r; do
    [ "$(readlink -f "$r")" = "$cur" ] || rm -rf "$r"
  done
}

# the service user owns the data directory (env, state, snapshot, logs) and nothing else. Only entries not yet its
# own are handed over, never across mounts, never a symlink (-h) and never a file with several hard links (a planted
# hard link to a root file would otherwise be chowned to the user).
own() {
  find "$DATA_DIR" -xdev ! -user "$NAME" ! -type l \( -type d -o -links 1 \) -exec chown -h "$NAME:$NAME" {} + 2>/dev/null || true
}

# the program directory belongs to root: the service user only reads and executes it. (User-owned releases let it
# plant code in node_modules that root then ran at the next build.) Releases of older installs that were user-owned
# are marked .untrusted after the chown, so their node_modules are never reused for a build.
secure_app() {
  [ -d "$APP_DIR" ] || return 0
  [ -L "$APP_DIR" ] && die "$APP_DIR is a symlink — refusing to use it"
  local r bad=()
  for r in "$APP_DIR"/releases/*; do
    [ -d "$r" ] && [ ! -L "$r" ] || continue
    [ -n "$(find "$r" -xdev ! -user 0 -print -quit 2>/dev/null)" ] && bad+=("$r")
  done
  chown -R root:root "$APP_DIR"
  chmod -R go-w "$APP_DIR"
  for r in "${bad[@]}"; do
    rm -f "$r/.untrusted"
    : >"$r/.untrusted"
  done
  [ ${#bad[@]} -eq 0 ] || ok "program files made root-owned (${#bad[@]} release(s) were the service user's; their node_modules will not be reused)"
}

# ── commands ─────────────────────────────────────────────────────────────────────────────────────────────────
deploy() { # $1 = install | update
  local mode="$1" prev_rel="" rev rel
  prev_rel="$(readlink -f "$APP_DIR/current" 2>/dev/null || true)"
  [ -d "$prev_rel" ] || prev_rel=""
  port_free_or_ours # before any download / build: a busy port is reported at once
  step "Source ($([ -n "$SOURCE" ] && echo "$SOURCE" || echo "$REPO $BRANCH"))"
  local want; want="$(source_rev || true)"
  if [ -n "$prev_rel" ] && [ "$FORCE" -eq 0 ] && [ -n "$want" ] && [ "$want" = "$(current_rev)" ]; then
    skip "already at $want — nothing to build (use --force to rebuild)"
    # the unit / launcher / supervisor still follow this cts.sh and $CONF (port, paths, resource sizing):
    # rewrite them, and restart only when one of them actually changed
    FILES_CHANGED=0
    write_unit
    if [ "$FILES_CHANGED" -eq 1 ] && svc_running; then
      step "Service files changed — restarting $NAME"
      svc_stop
      svc_start
    else
      svc_running || { port_free_or_ours; svc_start; }
    fi
    wait_healthy && ok "healthy on port $PORT" || die "not healthy — see $LOG_DIR/server.log"
    return 0
  fi
  mkdir -p "$APP_DIR/releases"
  rel="$APP_DIR/releases/$(date +%Y%m%d-%H%M%S)"
  rev="$(fetch_source "$rel")"
  echo "$rev" >"$rel/.release"
  ok "source $rev"
  build_release "$rel" "$prev_rel"
  own
  secure_app
  step "Switching to $rev"
  svc_stop
  kill_leftovers
  port_free_or_ours
  activate "$rel"
  write_unit
  svc_start
  if wait_healthy; then
    ok "healthy on port $PORT"
    prune_releases
  else
    warn "not healthy after ${HEALTH_TIMEOUT}s — last log lines:"
    tail -n 30 "$LOG_DIR/server.log" >&2 || true
    if [ -n "$prev_rel" ]; then
      warn "rolling back to $(cat "$prev_rel/.release" 2>/dev/null || basename "$prev_rel")"
      svc_stop
      activate "$prev_rel"
      svc_start
      wait_healthy && warn "rolled back; the failed release stays in $rel" || true
    fi
    die "$mode failed"
  fi
}

cmd_install() {
  if [ -e "$APP_DIR/current/.output/server/index.mjs" ]; then
    step "$NAME is already installed ($(current_rev)) — bringing it up"
    deps
    ensure_user
    ensure_env
    save_conf
    write_unit
    own
    secure_app
    svc_running || { port_free_or_ours; svc_start; }
    wait_healthy && ok "healthy on port $PORT" || die "not healthy — see $LOG_DIR/server.log"
    skip "use 'update' for a new version or 'reinstall' for a clean program install"
    return
  fi
  deps
  ensure_user
  save_conf
  ensure_env
  deploy install
}

cmd_update() {
  [ -e "$APP_DIR/current" ] || die "$NAME is not installed (install it with: $0 install --name $NAME)"
  deps
  ensure_env
  save_conf
  secure_app # migrates older installs (user-owned releases) before anything is built
  deploy update
}

cmd_remove_program() {
  step "Stopping and removing the program of $NAME (data in $DATA_DIR is kept)"
  svc_stop
  kill_leftovers
  if systemd_up && [ -f "$UNIT" ]; then
    systemctl disable -q "$NAME" 2>/dev/null || true
    rm -f "$UNIT"
    systemctl daemon-reload
  fi
  rm -f "$UNIT" "$UNIT.new" "$RUN_DIR/supervise.sh" "$RUN_DIR/launch.sh"
  have crontab && (crontab -l 2>/dev/null | grep -v -e "$RUN_DIR/supervise.sh" -e "$LIB_DIR/supervise.sh" | crontab - 2>/dev/null || true)
  [ -L "$LIB_DIR" ] || rm -rf "$LIB_DIR"
  rm -rf "$APP_DIR"
  [ -f "$REGISTRY" ] && sed -i "/^$NAME /d" "$REGISTRY"
  ok "program removed"
}

cmd_reinstall() {
  cmd_remove_program
  deps
  ensure_user
  save_conf
  ensure_env
  deploy install
}

cmd_remove() {
  cmd_remove_program
  if [ "$PURGE" -eq 1 ]; then
    rm -rf "$DATA_DIR"
    rm -f "$CONF"
    [ -L "$BUILD_LOG_DIR" ] || rm -rf "$BUILD_LOG_DIR"
    userdel "$NAME" 2>/dev/null || true
    ok "data $DATA_DIR and user $NAME deleted (--purge)"
  else
    skip "data kept in $DATA_DIR (settings, stats, database, env) and install settings in $CONF — 'remove --purge' deletes them"
  fi
}

info() {
  local rev state; rev="$(current_rev)"
  if svc_running; then state="${G}running${N}"; else state="${R}stopped${N}"; fi
  health && state="$state, ${G}healthy${N}" || state="$state, ${Y}not answering${N}"
  echo
  printf '%s%s%s %s\n' "$B" "CTS-A-O" "$N" "($NAME)"
  printf '  %-10s %b\n' "state" "$state"
  printf '  %-10s %s\n' "version" "${rev:-–}"
  printf '  %-10s %s\n' "program" "$APP_DIR/current"
  printf '  %-10s %s\n' "data" "$DATA_DIR  (env, state.json, core.sqlite, logs/)"
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

# a settings file still in the data directory: move it to $CONF now (parsed and filtered above, never sourced)
[ "$MIGRATE" -eq 1 ] && save_conf

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
