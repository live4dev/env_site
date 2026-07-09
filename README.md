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

## GitHub Actions image deploy

The production image is built by GitHub Actions and pushed to:

```text
ghcr.io/live4dev/env_site:latest
```

Required repository secrets:

```text
DEPLOY_HOST=23.88.51.68
DEPLOY_USER=root
DEPLOY_PORT=22
DEPLOY_SSH_KEY=<private key with SSH access to the VPS>
```

If the GHCR package is private, also add:

```text
GHCR_USERNAME=live4dev
GHCR_READ_TOKEN=<GitHub PAT with read:packages>
```

On push to `main`, the workflow builds and pushes the image, then runs on the VPS:

```bash
cd /srv/obsidian-vault-site
docker compose pull app
docker compose up -d app
```

For local image builds, use:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```
