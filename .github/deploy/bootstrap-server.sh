#!/usr/bin/env bash
set -euo pipefail

readonly source_root="${1:-}"
readonly deploy_user=deploy
readonly deploy_path=/srv/obsidian-vault-site
readonly deploy_home=/home/deploy
readonly public_key_file="$source_root/.github/deploy/deploy-key.pub"

if [[ "$EUID" -ne 0 ]]; then
  printf 'Run this installer as root\n' >&2
  exit 77
fi

for required_file in \
  "$public_key_file" \
  "$source_root/.github/deploy/env-site-ci" \
  "$source_root/.github/deploy/env-site-configure-openai" \
  "$source_root/.github/deploy/env-site-deploy" \
  "$source_root/Caddyfile" \
  "$source_root/docker-compose.yml"; do
  if [[ ! -f "$required_file" ]]; then
    printf 'Missing required file: %s\n' "$required_file" >&2
    exit 66
  fi
done

command -v docker >/dev/null
command -v ssh-keygen >/dev/null
command -v visudo >/dev/null

ssh-keygen -l -f "$public_key_file" >/dev/null
read -r key_type key_body _ < "$public_key_file"
if [[ "$key_type" != "ssh-ed25519" || ! "$key_body" =~ ^[A-Za-z0-9+/=]+$ ]]; then
  printf 'DEPLOY_SSH_KEY must be an Ed25519 private key\n' >&2
  exit 65
fi

if ! id -u "$deploy_user" >/dev/null 2>&1; then
  useradd --create-home --home-dir "$deploy_home" --shell /bin/bash "$deploy_user"
fi
passwd --lock "$deploy_user" >/dev/null

install -d -o "$deploy_user" -g "$deploy_user" -m 700 "$deploy_home/.ssh"
authorized_keys_tmp=$(mktemp)
sudoers_tmp=$(mktemp)
trap 'rm -f "$authorized_keys_tmp" "$sudoers_tmp"' EXIT

printf 'restrict,command="/usr/local/bin/env-site-ci" %s %s github-actions:live4dev/env_site:production\n' \
  "$key_type" "$key_body" > "$authorized_keys_tmp"
install -o "$deploy_user" -g "$deploy_user" -m 600 \
  "$authorized_keys_tmp" "$deploy_home/.ssh/authorized_keys"

install -o root -g root -m 755 \
  "$source_root/.github/deploy/env-site-ci" /usr/local/bin/env-site-ci
install -o root -g root -m 755 \
  "$source_root/.github/deploy/env-site-configure-openai" \
  /usr/local/sbin/env-site-configure-openai
install -o root -g root -m 755 \
  "$source_root/.github/deploy/env-site-deploy" /usr/local/sbin/env-site-deploy

printf '%s ALL=(root) NOPASSWD: /usr/local/sbin/env-site-configure-openai, /usr/local/sbin/env-site-deploy\n' \
  "$deploy_user" > "$sudoers_tmp"
visudo -cf "$sudoers_tmp" >/dev/null
install -o root -g root -m 440 "$sudoers_tmp" /etc/sudoers.d/env-site-deploy

install -d -o root -g root -m 755 "$deploy_path"
install -o root -g root -m 644 "$source_root/Caddyfile" "$deploy_path/Caddyfile"
install -o root -g root -m 644 \
  "$source_root/docker-compose.yml" "$deploy_path/docker-compose.yml"

if [[ ! -f "$deploy_path/.env" ]]; then
  printf 'Missing %s/.env; create production secrets before deploying\n' "$deploy_path" >&2
  exit 66
fi

chown root:root "$deploy_path/.env"
chmod 600 "$deploy_path/.env"

cd "$deploy_path"
APP_IMAGE=ghcr.io/live4dev/env_site:latest /usr/bin/docker compose config --quiet
printf 'Restricted deploy access installed for %s\n' "$deploy_user"
