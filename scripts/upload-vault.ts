import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";

type Options = {
  source: string;
  host: string;
  user: string;
  port: string;
  remotePath: string;
  composeDir: string;
  service: string;
  excludes: string[];
  dryRun: boolean;
  deleteExtra: boolean;
  reindex: boolean;
};

const defaultVaultRoot = "/Users/legonaut/Documents/Obsidian/Environment";
const defaultExcludes = [
  "raw/**",
  "Clippings/**",
  ".git/**",
  ".obsidian/**",
  ".trash/**",
  "node_modules/**",
  "10_Я/**",
  "40_Люди/**",
];

function env(name: string, fallback = "") {
  return process.env[name] || fallback;
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function usage() {
  console.log(`Usage: npm run upload:vault -- [options]

Uploads the local Environment vault to the production vault mount and reindexes it.

Options:
  --source <path>          Local vault path. Defaults to VAULT_UPLOAD_SOURCE, VAULT_ROOT, or ${defaultVaultRoot}
  --host <host>            SSH host. Defaults to VAULT_UPLOAD_HOST, DEPLOY_HOST, or APP_HOST
  --user <user>            SSH user. Defaults to VAULT_UPLOAD_USER, DEPLOY_USER, or root
  --port <port>            SSH port. Defaults to VAULT_UPLOAD_PORT, DEPLOY_PORT, or 22
  --remote-path <path>     Remote vault path. Defaults to /srv/obsidian-vault
  --compose-dir <path>     Remote compose project path. Defaults to /srv/obsidian-vault-site
  --service <name>         Docker Compose app service. Defaults to app
  --exclude <glob>         Extra rsync exclude. Can be repeated
  --delete                 Delete remote files that no longer exist locally
  --dry-run                Show what would upload without changing remote files
  --no-index               Upload only; skip remote npm run index:vault
  --help                   Show this help
`);
}

function parseArgs(argv: string[]): Options {
  const excludes = splitCsv(env("VAULT_EXCLUDE_GLOBS", defaultExcludes.join(",")));
  const options: Options = {
    source: env("VAULT_UPLOAD_SOURCE", env("VAULT_ROOT", defaultVaultRoot)),
    host: env("VAULT_UPLOAD_HOST", env("DEPLOY_HOST", env("APP_HOST"))),
    user: env("VAULT_UPLOAD_USER", env("DEPLOY_USER", "root")),
    port: env("VAULT_UPLOAD_PORT", env("DEPLOY_PORT", "22")),
    remotePath: env("VAULT_UPLOAD_REMOTE_PATH", "/srv/obsidian-vault"),
    composeDir: env("VAULT_UPLOAD_COMPOSE_DIR", "/srv/obsidian-vault-site"),
    service: env("VAULT_UPLOAD_SERVICE", "app"),
    excludes,
    dryRun: false,
    deleteExtra: false,
    reindex: true,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = () => {
      const value = argv[++index];
      if (!value) throw new Error(`${arg} requires a value`);
      return value;
    };

    switch (arg) {
      case "--source":
        options.source = next();
        break;
      case "--host":
        options.host = next();
        break;
      case "--user":
        options.user = next();
        break;
      case "--port":
        options.port = next();
        break;
      case "--remote-path":
        options.remotePath = next();
        break;
      case "--compose-dir":
        options.composeDir = next();
        break;
      case "--service":
        options.service = next();
        break;
      case "--exclude":
        options.excludes.push(next());
        break;
      case "--delete":
        options.deleteExtra = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--no-index":
        options.reindex = false;
        break;
      case "--help":
      case "-h":
        usage();
        process.exit(0);
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!options.host) {
    throw new Error("Missing SSH host. Set VAULT_UPLOAD_HOST/DEPLOY_HOST or pass --host.");
  }

  return options;
}

function quoteShell(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function run(command: string, args: string[]) {
  console.log(`$ ${[command, ...args].join(" ")}`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function assertDirectory(source: string) {
  const sourceStat = await stat(source);
  if (!sourceStat.isDirectory()) {
    throw new Error(`Source is not a directory: ${source}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const source = path.resolve(options.source);
  const sourceWithSlash = source.endsWith(path.sep) ? source : `${source}${path.sep}`;
  const remote = `${options.user}@${options.host}`;

  await assertDirectory(source);

  await run("ssh", [
    "-p",
    options.port,
    remote,
    `mkdir -p ${quoteShell(options.remotePath)}`,
  ]);

  const rsyncArgs = [
    "-az",
    "--human-readable",
    "--info=stats2,progress2",
    "-e",
    `ssh -p ${options.port}`,
  ];

  if (options.dryRun) rsyncArgs.push("--dry-run");
  if (options.deleteExtra) rsyncArgs.push("--delete");

  for (const exclude of options.excludes) {
    rsyncArgs.push("--exclude", exclude);
  }

  rsyncArgs.push(sourceWithSlash, `${remote}:${options.remotePath}/`);
  await run("rsync", rsyncArgs);

  if (!options.reindex) return;
  if (options.dryRun) {
    console.log("Dry run complete; skipping remote reindex.");
    return;
  }

  await run("ssh", [
    "-p",
    options.port,
    remote,
    `cd ${quoteShell(options.composeDir)} && docker compose exec -T ${quoteShell(options.service)} npm run index:vault`,
  ]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
