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
# the saved install of this name provides the defaults for every later command
CONF_HINT="/var/lib/$NAME/install.conf"
[ -n "$A_DATA" ] && CONF_HINT="$A_DATA/install.conf"
if [ -f "$CONF_HINT" ]; then
  # shellcheck disable=SC1090
  . "$CONF_HINT"
fi
PORT="${A_PORT:-${PORT:-$DEF_PORT}}"
HOST="${A_HOST:-${HOST:-$DEF_HOST}}"
APP_DIR="${A_DIR:-${APP_DIR:-/opt/$NAME}}"
DATA_DIR="${A_DATA:-${DATA_DIR:-/var/lib/$NAME}}"
BRANCH="${A_BRANCH:-${BRANCH:-$DEF_BRANCH}}"
SOURCE="${A_SOURCE:-${SOURCE:-}}"
if [ -z "${A_REPO}" ] && [ -z "${REPO:-}" ]; then
  REPO="$(git -C "$SCRIPT_DIR" remote get-url origin 2>/dev/null || true)"
  REPO="${REPO:-$DEF_REPO}"
fi
REPO="${A_REPO:-$REPO}"
[[ "$PORT" =~ ^[0-9]+$ ]] && [ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ] || die "--port: 1–65535"
case "$APP_DIR" in /|/usr|/usr/*|/etc|/etc/*|/var|/home|/root|"$DATA_DIR") die "--dir $APP_DIR is not a safe program directory" ;; esac
case "$DATA_DIR" in /|/usr|/etc|/var|/home|/root|"$APP_DIR"|"$APP_DIR"/*) die "--data $DATA_DIR must be its own directory, outside --dir" ;; esac

ENV_FILE="$DATA_DIR/env"
LOG_DIR="$DATA_DIR/logs"
RUN_DIR="$DATA_DIR/run"
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
  cat >"$DATA_DIR/install.conf" <<EOF
# written by cts.sh — defaults for the next install / update / reinstall / remove of $NAME
PORT=$PORT
HOST=$HOST
APP_DIR=$APP_DIR
DATA_DIR=$DATA_DIR
REPO=$REPO
BRANCH=$BRANCH
SOURCE=$SOURCE
EOF
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

# the environment file lives in the data directory: created once, existing values are never overwritten
ensure_env() {
  mkdir -p "$DATA_DIR" "$LOG_DIR" "$RUN_DIR"
  touch "$ENV_FILE"
  local added=0
  setdef() { grep -q "^$1=" "$ENV_FILE" || { echo "$1=$2" >>"$ENV_FILE"; added=$((added + 1)); }; }
  setdef NODE_ENV production
  setdef CTS_CORE_STATE "$DATA_DIR/state.json"
  setdef CTS_CORE_SNAPSHOT "$DATA_DIR/core.sqlite"
  # resources are measured at every start (launch.sh): heap = ¾ of the memory available to the service (cgroup
  # limit or RAM), one worker per CPU (cgroup quota or cores). 0 = use NODE_OPTIONS / CTS_CORE_WORKERS as set here
  setdef CTS_AUTO_RESOURCES 1
  # worker threads: without a cap glibc keeps an arena per thread and RSS grows far beyond the heap
  setdef MALLOC_ARENA_MAX 2
  # keys and the live switch stay commented until you set them (never printed by this script)
  grep -q "BINGX_X02_API_KEY" "$ENV_FILE" || cat >>"$ENV_FILE" <<'EOF'
# Exchange keys (optional). Uncomment and fill in, then: cts.sh restart
#BINGX_X02_API_KEY=
#BINGX_X02_SECRET=
#BINGX_X01_API_KEY=
#BINGX_X01_SECRET=
# Live orders additionally need Settings → Live and:
#CTS_CORE_LIVE=1
EOF
  # PORT / HOST / worker path follow the install (updated on every run)
  sed -i '/^PORT=/d;/^HOST=/d;/^NITRO_PORT=/d;/^NITRO_HOST=/d;/^CTS_CORE_WORKER=/d' "$ENV_FILE"
  {
    echo "PORT=$PORT"
    echo "HOST=$HOST"
    echo "CTS_CORE_WORKER=$APP_DIR/current/src/core/server/tapes.worker.ts"
  } >>"$ENV_FILE"
  chmod 600 "$ENV_FILE"
  [ $added -gt 0 ] && ok "environment $ENV_FILE ($added new default(s))" || skip "environment $ENV_FILE kept"
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
  step "Dependencies of the release"
  local lock_new lock_old=""
  lock_new="$(sha1sum "$rel/package-lock.json" | cut -d' ' -f1)"
  [ -n "$prev" ] && [ -f "$prev/package-lock.json" ] && lock_old="$(sha1sum "$prev/package-lock.json" | cut -d' ' -f1)"
  if [ -n "$prev" ] && [ "$lock_new" = "$lock_old" ] && [ -d "$prev/node_modules" ]; then
    cp -a "$prev/node_modules" "$rel/node_modules"
    skip "package-lock unchanged: node_modules reused"
  else
    (cd "$rel" && npm ci --no-audit --no-fund --loglevel=error >"$LOG_DIR/npm-ci.log" 2>&1) ||
      die "npm ci failed — see $LOG_DIR/npm-ci.log"
    ok "npm ci"
  fi
  step "Build (node server)"
  (cd "$rel" && PATH="$rel/node_modules/.bin:$PATH" NITRO_PRESET=node-server node scripts/with-app-env.mjs vite build >"$LOG_DIR/build.log" 2>&1) ||
    die "build failed — see $LOG_DIR/build.log"
  [ -f "$rel/.output/server/index.mjs" ] || die "build produced no server (see $LOG_DIR/build.log)"
  ok "built $(du -sh "$rel/.output" | cut -f1)"
}

# ── service ──────────────────────────────────────────────────────────────────────────────────────────────────
# launcher: sizes memory and workers from the machine at every start (a resized VM or container is picked up by a
# plain restart), then execs node
write_launcher() {
  local node; node="$(node_bin)"
  mkdir -p "$RUN_DIR"
  {
    echo '#!/usr/bin/env bash'
    echo "# launcher for $NAME (written by cts.sh): resources from the machine at every start, then the server"
    printf 'ENV_FILE=%q\nNODE_BIN=%q\nSERVER=%q\n' "$ENV_FILE" "$node" "$APP_DIR/current/.output/server/index.mjs"
    cat <<'LAUNCH'
# the env file read like systemd's EnvironmentFile: KEY=VALUE lines, values verbatim (spaces allowed, outer quotes
# removed), comments and blank lines skipped — never executed as shell
if [ -r "$ENV_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue ;; esac
    k="${line%%=*}"; v="${line#*=}"
    case "$k" in *[!A-Za-z0-9_]*|'') continue ;; esac
    case "$v" in \"*\") v="${v:1:${#v}-2}" ;; \'*\') v="${v:1:${#v}-2}" ;; esac
    export "$k=$v"
  done <"$ENV_FILE"
fi
if [ "${CTS_AUTO_RESOURCES:-1}" = "1" ]; then
  # memory: the cgroup limit when lower than RAM; heap = three quarters of it (at least 1 GB)
  mem_kb=$(awk '/MemTotal/{print $2}' /proc/meminfo)
  lim=$(cat /sys/fs/cgroup/memory.max 2>/dev/null || cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || echo max)
  if [ "$lim" != "max" ] && [ "$lim" -gt 0 ] 2>/dev/null && [ $((lim / 1024)) -lt "$mem_kb" ]; then mem_kb=$((lim / 1024)); fi
  heap=$((mem_kb * 3 / 4 / 1024)); [ "$heap" -lt 1024 ] && heap=1024
  # CPUs: the cgroup quota when lower than the cores; one worker per CPU
  cpus=$(nproc 2>/dev/null || echo 1)
  q=max; p=0
  [ -r /sys/fs/cgroup/cpu.max ] && read -r q p < /sys/fs/cgroup/cpu.max
  if [ "$q" != "max" ] && [ "${p:-0}" -gt 0 ] 2>/dev/null; then c=$(( (q + p - 1) / p )); [ "$c" -lt "$cpus" ] && cpus=$c; fi
  [ "$cpus" -lt 1 ] && cpus=1
  NODE_OPTIONS="$(printf '%s' "${NODE_OPTIONS:-}" | sed -E 's/--max-old-space-size=[0-9]+//g') --max-old-space-size=$heap"
  CTS_CORE_WORKERS=$cpus
  export NODE_OPTIONS CTS_CORE_WORKERS
  echo "[$(date -Is)] resources: heap ${heap} MB, ${cpus} workers" >&2
fi
exec "$NODE_BIN" "$SERVER"
LAUNCH
  } >"$RUN_DIR/launch.sh"
  chmod 755 "$RUN_DIR/launch.sh"
}

write_unit() {
  local node; node="$(node_bin)"
  write_launcher
  if systemd_up; then
    cat >"$UNIT" <<EOF
[Unit]
Description=CTS-A-O ($NAME)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$NAME
Group=$NAME
WorkingDirectory=$APP_DIR/current
EnvironmentFile=$ENV_FILE
ExecStart=$RUN_DIR/launch.sh
Restart=always
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=60
LimitNOFILE=65536
StandardOutput=append:$LOG_DIR/server.log
StandardError=append:$LOG_DIR/server.log

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable -q "$NAME" 2>/dev/null || true
    ok "systemd service $NAME"
  else
    # no systemd (containers): a supervisor loop restarts the server on exit; @reboot via cron when available
    cat >"$RUN_DIR/supervise.sh" <<EOF
#!/usr/bin/env bash
# supervisor for $NAME (written by cts.sh) — restarts the server whenever it exits
trap 'kill -TERM "\$child" 2>/dev/null; wait "\$child"; exit 0' TERM INT
echo \$\$ >"$RUN_DIR/supervisor.pid"
while true; do
  cd "$APP_DIR/current" || exit 1
  # a clean environment: only what the data directory's env file sets (plus PATH / HOME / LANG)
  # setpriv execs node as the service user, so the pid below is node itself and receives the stop signal
  env -i PATH="/usr/local/bin:/usr/bin:/bin:$(dirname "$node")" HOME="$DATA_DIR" LANG=C.UTF-8 \\
    setpriv --reuid="$NAME" --regid="$NAME" --init-groups "$RUN_DIR/launch.sh" \\
    >>"$LOG_DIR/server.log" 2>&1 &
  child=\$!
  echo \$child >"$RUN_DIR/server.pid"
  wait "\$child"
  echo "[\$(date -Is)] server exited (\$?), restarting in 5 s" >>"$LOG_DIR/server.log"
  sleep 5
done
EOF
    chmod 755 "$RUN_DIR/supervise.sh"
    if have crontab; then
      (crontab -l 2>/dev/null | grep -v "$RUN_DIR/supervise.sh"; echo "@reboot $RUN_DIR/supervise.sh >/dev/null 2>&1 &") | crontab - 2>/dev/null || true
    fi
    ok "supervisor $RUN_DIR/supervise.sh (no systemd)"
  fi
}

svc_running() {
  if systemd_up && [ -f "$UNIT" ]; then systemctl is-active -q "$NAME"; else
    # the pid must still be OUR supervisor (a stale pid file can point at a recycled pid)
    local p; p="$(cat "$RUN_DIR/supervisor.pid" 2>/dev/null || true)"
    [ -n "$p" ] && tr '\0' ' ' 2>/dev/null <"/proc/$p/cmdline" | grep -q "$RUN_DIR/supervise.sh"
  fi
}

svc_start() {
  if systemd_up && [ -f "$UNIT" ]; then systemctl start "$NAME"; else
    svc_running && return 0
    # 9>&- : the supervisor must not inherit (and hold forever) this script's lock
    setsid nohup "$RUN_DIR/supervise.sh" >/dev/null 2>&1 </dev/null 9>&- &
    sleep 1
  fi
}

# graceful: SIGTERM lets the engine save settings, stats and the database snapshot; SIGKILL only after 60 s
svc_stop() {
  if systemd_up && [ -f "$UNIT" ]; then
    systemctl stop "$NAME" 2>/dev/null || true
  fi
  local sup srv
  sup="$(cat "$RUN_DIR/supervisor.pid" 2>/dev/null || true)"
  srv="$(cat "$RUN_DIR/server.pid" 2>/dev/null || true)"
  [ -n "$sup" ] && kill -TERM "$sup" 2>/dev/null || true
  [ -n "$srv" ] && kill -TERM "$srv" 2>/dev/null || true
  local i
  for i in $(seq 1 60); do
    { [ -n "$sup" ] && kill -0 "$sup" 2>/dev/null; } || { [ -n "$srv" ] && kill -0 "$srv" 2>/dev/null; } || break
    sleep 1
  done
  [ -n "$sup" ] && kill -KILL "$sup" 2>/dev/null || true
  [ -n "$srv" ] && kill -KILL "$srv" 2>/dev/null || true
  rm -f "$RUN_DIR/supervisor.pid" "$RUN_DIR/server.pid"
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

own() {
  chown -R "$NAME:$NAME" "$DATA_DIR"
  chown -R "$NAME:$NAME" "$APP_DIR/releases" 2>/dev/null || true
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
    return 0
  fi
  mkdir -p "$APP_DIR/releases"
  rel="$APP_DIR/releases/$(date +%Y%m%d-%H%M%S)"
  rev="$(fetch_source "$rel")"
  echo "$rev" >"$rel/.release"
  ok "source $rev"
  build_release "$rel" "$prev_rel"
  own
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
  rm -f "$UNIT" "$RUN_DIR/supervise.sh"
  have crontab && (crontab -l 2>/dev/null | grep -v "$RUN_DIR/supervise.sh" | crontab - 2>/dev/null || true)
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
    userdel "$NAME" 2>/dev/null || true
    ok "data $DATA_DIR and user $NAME deleted (--purge)"
  else
    skip "data kept in $DATA_DIR (settings, stats, database, env) — 'remove --purge' deletes it"
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
  printf '  %-10s %s\n' "service" "$(systemd_up && [ -f "$UNIT" ] && echo "systemd: systemctl status $NAME" || echo "supervisor: $RUN_DIR/supervise.sh")"
  printf '  %-10s %s\n' "logs" "$LOG_DIR/server.log"
  echo "  open:"
  local ip
  for ip in $(ips); do printf '    http://%s:%s/v2\n' "$ip" "$PORT"; done
  local pub; pub="$(public_ip)"
  [ -n "$pub" ] && printf '    http://%s:%s/v2   (public, if the firewall allows port %s)\n' "$pub" "$PORT" "$PORT"
  printf '  %-10s %s\n' "manage" "$0 update | restart | status | logs | remove"
  echo
}

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
