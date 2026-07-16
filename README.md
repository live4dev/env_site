# Private Obsidian Vault Website

Next.js private Russian-language website for a read-only Obsidian vault with authentication, Markdown rendering, search, graph navigation, RAG chat, and Docker deployment.

## Local setup

1. Copy `.env.example` to `.env` and set `AUTH_SECRET`.
2. Start Postgres: `docker compose up db`.
3. Generate and apply migrations: `npm run db:generate && npm run db:migrate`.
4. Create an admin: `npm run user:create -- --email you@example.com --password 'secret' --role admin`.
5. Index the vault: `npm run index:vault`.
6. Start the app: `npm run dev`.

## Production

Deploy with `docker-compose.yml`, mount the synced vault read-only at `/vault`, and run:

```bash
docker compose up -d --build
docker compose exec app npm run user:create -- --email you@example.com --password 'secret' --role admin
docker compose exec app npm run index:vault
```

Chat uses the OpenAI-compatible `vsellm` endpoint configured by `VSELLM_BASE_URL`, `VSELLM_API_KEY`, and `CHAT_MODEL`.

## Protected GitHub Actions deployment

Every push to `master` builds the production image, pushes it to GHCR, and
deploys the immutable image digest through a restricted SSH account. The CI
key cannot open a shell, forward ports, upload files, or run arbitrary Docker
commands.

The image is published as:

```text
ghcr.io/live4dev/env_site:latest
```

Create a GitHub environment named `production`, restrict it to the `master`
branch, and add a required reviewer. Add these environment secrets:

```text
DEPLOY_SSH_KEY=<dedicated Ed25519 private key for the deploy user>
DEPLOY_KNOWN_HOSTS=<verified ssh-keyscan output for the VPS>
BOOTSTRAP_SSH_KEY=<temporary administrator SSH key; delete after bootstrap>
```

Add these environment variables:

```text
DEPLOY_HOST=23.88.51.68
DEPLOY_PORT=22
BOOTSTRAP_USER=root
```

Generate the dedicated deploy key locally:

```shell
ssh-keygen -t ed25519 -N '' \
  -C 'github-actions:live4dev/env_site:production' \
  -f ./env-site-production
```

Put the private key in `DEPLOY_SSH_KEY`. Keep the public key locally; the
bootstrap workflow derives the same public key from the private key.

Verify and pin the server host key before adding `DEPLOY_KNOWN_HOSTS`:

```shell
# Run on the VPS through a trusted administrator session.
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub

# Run locally and compare the displayed fingerprint with the VPS value.
ssh-keyscan -H -p 22 -t ed25519 23.88.51.68 > env-site-known-hosts
ssh-keygen -lf env-site-known-hosts
```

Run the `Bootstrap production deploy access` workflow once on `master`. It
creates the password-disabled `deploy` user, installs a forced-command SSH
entrypoint, installs a narrowly scoped sudo rule, and makes the Compose and
Caddy configuration root-owned. It preserves the existing production `.env`
and Docker volumes. After the bootstrap succeeds, delete `BOOTSTRAP_SSH_KEY`
from GitHub.

The regular `Build and deploy production` workflow then deploys automatically
after each push to `master`. If the GHCR package is private, log in to GHCR once
as root on the VPS with a token limited to `read:packages`.

## Upload vault data

Upload the local Environment vault to the production vault mount and reindex the site:

```bash
npm run upload:vault -- --host 23.88.51.68 --user root
```

Use `--dry-run` before the first upload to preview the transfer. Add `--delete` when you want the remote `/srv/obsidian-vault` mirror to remove files that no longer exist locally. The script uses `VAULT_EXCLUDE_GLOBS` by default, including private folders such as `10_Я/**` and `40_Люди/**`.

For local image builds, use:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```
