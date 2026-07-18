#!/usr/bin/env bash
set -euo pipefail

printf 'USER=%s\n' "$(id -un)"
printf 'GROUPS=%s\n' "$(id -nG)"
printf 'DOCKER_SERVICE=%s\n' "$(systemctl is-active docker)"
docker --version
docker compose version
docker buildx version
[[ -d "$HOME/treinamento-b2open" ]]
printf '%s\n' 'TRAINING_DIR=OK'
docker run --rm hello-world
