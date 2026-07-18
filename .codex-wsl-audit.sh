#!/usr/bin/env bash
set -u

printf 'USER=%s\n' "$(id -un)"
. /etc/os-release
printf 'OS=%s %s\n' "$NAME" "$VERSION_ID"
printf 'PID1='
ps -p 1 -o comm=
printf 'SYSTEMD='
systemctl is-system-running 2>/dev/null || true
printf '%s\n' 'PACKAGES'
for package in \
  htop picocom net-tools usbutils inetutils-telnet curl apt-transport-https \
  ca-certificates software-properties-common docker-ce docker-ce-cli \
  containerd.io docker-buildx-plugin docker-compose-plugin
do
  if dpkg-query -W -f='${Status} ${Version}' "$package" 2>/dev/null; then
    printf ' %s\n' "$package"
  else
    printf 'MISSING %s\n' "$package"
  fi
done
printf '%s\n' 'DOCKER'
command -v docker || true
docker --version 2>&1 || true
systemctl is-active docker 2>&1 || true
printf 'GROUPS=%s\n' "$(id -nG)"
if [[ -d "$HOME/treinamento-b2open" ]]; then
  printf '%s\n' 'TRAINING_DIR=PRESENT'
else
  printf '%s\n' 'TRAINING_DIR=MISSING'
fi
