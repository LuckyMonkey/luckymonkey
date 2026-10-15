#!/bin/sh
# Build the Bevy game on fridge and deploy Lucky Monkey (runs on fridge, go.fridge.run/luckymonkey).
#
#   tools/deploy.sh          build + deploy
#   tools/deploy.sh build    build only (fridge:~/build/luckymonkey/public/game)
#
# Freezer has too little disk for a Rust/Bevy build, so the build happens on
# fridge as user `fridge` (rustup + wasm-bindgen-cli in ~fridge/.cargo).
set -eu
cd "$(dirname "$0")/.."
HOST=fridge@fridge
B=build/luckymonkey

node tools/export-world.cjs
python3 tools/make-textures.py
rsync -a --delete --exclude node_modules --exclude .next --exclude .git --exclude game/target --exclude public/game \
  --exclude tsconfig.tsbuildinfo ./ "$HOST:$B/"
ssh "$HOST" "set -e; cd $B/game; export PATH=\$HOME/.cargo/bin:\$PATH
  cargo build --release --target wasm32-unknown-unknown
  rm -rf ../public/game
  wasm-bindgen --target web --no-typescript --out-dir ../public/game target/wasm32-unknown-unknown/release/luckymonkey.wasm
  ls -la ../public/game"
[ "${1:-}" = build ] && exit 0

ssh "$HOST" "set -e; export SUDO_ASKPASS=/home/fridge/.sudo-askpass
  sudo -A rsync -a --delete --exclude .next --exclude node_modules --exclude game --exclude public/game $B/ /srv/apps/luckymonkey/
  sudo -A rsync -a --delete $B/public/game/ /srv/apps/luckymonkey/public/game/
  sudo -A chown -R root:root /srv/apps/luckymonkey && sudo -A chmod -R a+rX /srv/apps/luckymonkey
  sudo -A fridge-next luckymonkey build >/tmp/lm-build.log 2>&1 || { tail -30 /tmp/lm-build.log; exit 1; }
  sudo -A fridge-next luckymonkey restart
  sleep 3; sudo -A docker ps --filter name=luckymonkey --format "{{.Names}} {{.Status}}""
