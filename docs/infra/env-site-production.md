# Env Site production operations

This runbook documents deployment and vault synchronization for the private
Obsidian vault site.

## Production inventory

| Resource | Value |
| --- | --- |
| Public hostname | `env.live4.dev` |
| VPS address | `23.88.51.68` |
| GitHub repository | `live4dev/env_site` |
| Deployment branch | `main` |
| GitHub environment | `production` |
| Container image | `ghcr.io/live4dev/env_site` |
| Compose directory | `/srv/obsidian-vault-site` |
| Vault directory | `/srv/obsidian-vault` |

The Compose project contains the `app`, `db`, and `proxy` services. The vault is
mounted read-only into the application container at `/vault`.

## Access model

Production uses separate SSH identities for separate responsibilities.

### `deploy`

The password-locked `deploy` account is used only by GitHub Actions. Its
authorized key has a forced command pointing to `/usr/local/bin/env-site-ci`.
The entrypoint accepts only:

- `probe`
- `deploy sha256:<64 lowercase hexadecimal characters>`

The account cannot open a shell, upload files, allocate a PTY, or forward
connections. Its only sudo permission is:

```text
/usr/local/sbin/env-site-deploy
```

### `vaultsync`

The password-locked `vaultsync` account is used for vault synchronization. Its
SSH key uses the `restrict` authorized-key option. The account:

- owns `/srv/obsidian-vault`;
- does not belong to the `docker` group;
- cannot modify `/srv/obsidian-vault-site` or its `.env` file;
- can run only `/usr/local/sbin/env-site-reindex` through passwordless sudo.

### Administrator access

An administrator or root key is required only for initial provisioning,
recovery, and key rotation. Do not use it for routine deployments or vault
uploads.

## Local SSH keys

Generate separate Ed25519 keys on a trusted workstation:

```bash
ssh-keygen -t ed25519 -N '' \
  -C 'github-actions:live4dev/env_site:production' \
  -f "$HOME/.ssh/env_site_deploy"

ssh-keygen -t ed25519 \
  -C 'vaultsync@env.live4.dev' \
  -f "$HOME/.ssh/env_site_vaultsync"
```

The deploy key must be usable non-interactively by GitHub Actions. The
workstation-operated vault key should use a passphrase when practical and be
loaded into `ssh-agent`.

Private keys must remain mode `0600` and must never be committed:

```bash
chmod 600 "$HOME/.ssh/env_site_deploy" "$HOME/.ssh/env_site_vaultsync"
ssh-keygen -lf "$HOME/.ssh/env_site_deploy.pub"
ssh-keygen -lf "$HOME/.ssh/env_site_vaultsync.pub"
```

## GitHub production environment

Create a GitHub environment named `production`, restrict deployments to
`main`, and optionally require a reviewer. Configure these environment
secrets:

| Secret | Purpose |
| --- | --- |
| `DEPLOY_SSH_KEY` | Complete private key for the restricted `deploy` account |
| `DEPLOY_KNOWN_HOSTS` | Verified SSH host-key entry for the VPS |
| `BOOTSTRAP_SSH_KEY` | Temporary administrator private key used only for bootstrap |

The secrets can be set from the repository directory without printing them:

```bash
gh secret set DEPLOY_SSH_KEY \
  --env production \
  < "$HOME/.ssh/env_site_deploy"

gh secret set DEPLOY_KNOWN_HOSTS \
  --env production \
  < "$HOME/.ssh/env_site_known_hosts"

gh secret set BOOTSTRAP_SSH_KEY \
  --env production \
  < "$HOME/.ssh/env_site_bootstrap"
```

Verify the server host key through an existing trusted administrator session
before storing it:

```bash
# On the VPS
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub

# On the workstation; compare this fingerprint with the VPS output
ssh-keyscan -H -p 22 -t ed25519 23.88.51.68 \
  > "$HOME/.ssh/env_site_known_hosts"
ssh-keygen -lf "$HOME/.ssh/env_site_known_hosts"
```

Do not accept a changed host key until its fingerprint has been verified
through an independent trusted connection.

## Provision the deployment account

Before bootstrap, `/srv/obsidian-vault-site/.env` must exist on the VPS and be
owned by root with mode `0600`.

Run **Bootstrap production deploy access** from the GitHub Actions page on the
`main` branch. The workflow:

1. validates the administrator and deployment keys;
2. creates or updates the password-locked `deploy` account;
3. installs the forced-command SSH entrypoint;
4. installs the deployment wrapper and narrow sudo rule;
5. installs root-owned Compose and Caddy configuration;
6. verifies that `deploy@23.88.51.68 probe` returns `ready`.

Delete `BOOTSTRAP_SSH_KEY` from the GitHub environment after a successful
bootstrap. Add it again only when provisioning or rotating server access.

## Provision the vault synchronization account

Copy only the vault synchronization public key to the VPS using an existing
administrator connection:

```bash
scp "$HOME/.ssh/env_site_vaultsync.pub" \
  root@23.88.51.68:/tmp/env_site_vaultsync.pub
```

On the VPS, create the account and install the restricted key:

```bash
sudo useradd --create-home \
  --home-dir /home/vaultsync \
  --shell /bin/bash \
  vaultsync
sudo passwd --lock vaultsync

sudo install -d -o vaultsync -g vaultsync -m 0700 \
  /home/vaultsync/.ssh

{
  printf 'restrict '
  cat /tmp/env_site_vaultsync.pub
} | sudo tee /home/vaultsync/.ssh/authorized_keys >/dev/null

sudo chown vaultsync:vaultsync \
  /home/vaultsync/.ssh/authorized_keys
sudo chmod 0600 /home/vaultsync/.ssh/authorized_keys
```

If the account already exists during rotation, skip `useradd` and replace only
`authorized_keys`.

Give the account ownership of the vault tree:

```bash
sudo install -d -o vaultsync -g vaultsync -m 0750 \
  /srv/obsidian-vault
sudo chown -R vaultsync:vaultsync /srv/obsidian-vault
```

Install the root-owned reindex wrapper:

```bash
sudo tee /usr/local/sbin/env-site-reindex >/dev/null <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
cd /srv/obsidian-vault-site
exec /usr/bin/docker compose exec -T app npm run index:vault
SCRIPT

sudo chown root:root /usr/local/sbin/env-site-reindex
sudo chmod 0755 /usr/local/sbin/env-site-reindex
```

Install and validate the sudo rule:

```bash
printf '%s\n' \
  'vaultsync ALL=(root) NOPASSWD: /usr/local/sbin/env-site-reindex' \
  | sudo tee /etc/sudoers.d/env-site-vaultsync >/dev/null

sudo chmod 0440 /etc/sudoers.d/env-site-vaultsync
sudo visudo -cf /etc/sudoers.d/env-site-vaultsync
```

Remove the temporary public-key copy after verification.

## Deploy the application

A push to `main` starts **Build and deploy production**:

1. build the Linux AMD64 image;
2. push `latest` and `sha-<commit>` tags to GHCR;
3. pass the immutable image digest to the deployment job;
4. connect with the restricted deployment key;
5. pull and restart only the `app` service using that digest.

Verify the deployment SSH path from a trusted workstation:

```bash
ssh -i "$HOME/.ssh/env_site_deploy" \
  -o IdentitiesOnly=yes \
  deploy@23.88.51.68 \
  probe
```

The expected output is `ready`. Any command other than `probe` or a valid
digest deployment must return `Command denied`.

To roll back, obtain a previously deployed manifest digest from GHCR or a
successful Actions run and deploy it through the same restricted path:

```bash
ssh -i "$HOME/.ssh/env_site_deploy" \
  -o IdentitiesOnly=yes \
  deploy@23.88.51.68 \
  'deploy sha256:<previous-manifest-digest>'
```

If the GHCR package is private, authenticate Docker on the VPS once with a
token limited to `read:packages`.

## Upload and index the vault

Always preview an upload first:

```bash
npm run upload:vault -- \
  --host 23.88.51.68 \
  --user vaultsync \
  --identity "$HOME/.ssh/env_site_vaultsync" \
  --dry-run
```

Run the upload after reviewing the file list:

```bash
npm run upload:vault -- \
  --host 23.88.51.68 \
  --user vaultsync \
  --identity "$HOME/.ssh/env_site_vaultsync"
```

The command synchronizes allowed files and then runs the restricted reindex
wrapper. Use `--delete` only when the remote vault must exactly mirror the
local source. The default exclusions include editor metadata, repositories,
dependencies, raw inputs, clippings, and designated private folders.

## Verification

Check the server accounts and sudo boundaries:

```bash
sudo passwd -S deploy
sudo passwd -S vaultsync
id deploy
id vaultsync
sudo -l -U deploy
sudo -l -U vaultsync
sudo visudo -cf /etc/sudoers.d/env-site-deploy
sudo visudo -cf /etc/sudoers.d/env-site-vaultsync
```

Expected permissions:

```text
deploy    -> /usr/local/sbin/env-site-deploy
vaultsync -> /usr/local/sbin/env-site-reindex
```

Check the application:

```bash
cd /srv/obsidian-vault-site
sudo docker compose ps
curl -I http://127.0.0.1:8080/
```

A redirect from the HTTP endpoint is normal when the application sends the
request to authentication or the canonical HTTPS endpoint.

## Key rotation

### Deployment key

1. Generate a new dedicated Ed25519 pair.
2. Replace `DEPLOY_SSH_KEY` in the GitHub `production` environment.
3. Temporarily restore `BOOTSTRAP_SSH_KEY`.
4. Run **Bootstrap production deploy access** on `main`.
5. Verify `probe` with the new private key.
6. Delete `BOOTSTRAP_SSH_KEY` again.
7. Securely remove the retired private key.

### Vault synchronization key

1. Generate a new Ed25519 pair.
2. Replace `/home/vaultsync/.ssh/authorized_keys` with the new public key,
   retaining the `restrict` prefix.
3. Verify a dry-run upload with the new private key.
4. Securely remove the retired private key.

### VPS host key

If the VPS host key legitimately changes, verify the new fingerprint through
administrator access, regenerate `DEPLOY_KNOWN_HOSTS`, and replace the GitHub
environment secret. Never bypass strict host-key checking.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Deployment fails during SSH configuration | Confirm `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS` exist in the `production` environment |
| Deployment job is skipped | Confirm the workflow and GitHub environment both allow `main` |
| `Permission denied (publickey)` for `deploy` | Compare the local deploy public-key fingerprint with `/home/deploy/.ssh/authorized_keys` and rerun bootstrap if needed |
| `Command denied` for a valid deployment | Confirm the command contains exactly one lowercase `sha256:<digest>` argument |
| Vault upload cannot write | Check ownership and mode of `/srv/obsidian-vault` and verify the connection uses `vaultsync` |
| Reindex returns a sudo error | Validate `/etc/sudoers.d/env-site-vaultsync` and the root-owned wrapper path |
| Image pull fails | Confirm the digest exists and authenticate the VPS to private GHCR with `read:packages` only |
| Application is unhealthy | Inspect `docker compose ps` and `docker compose logs --tail=200 app` from an administrator session |

## Security invariants

- Never put `deploy` or `vaultsync` in the `docker` group.
- Never reuse the administrator, deployment, and vault synchronization keys.
- Never store private keys, production `.env` contents, or access tokens in the
  repository.
- Keep `/srv/obsidian-vault-site/.env` owned by root with mode `0600`.
- Keep installed wrappers root-owned and non-writable by deployment accounts.
- Keep strict SSH host-key checking enabled in GitHub Actions.
- Review a vault dry run before using `--delete`.
