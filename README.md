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
