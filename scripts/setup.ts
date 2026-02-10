import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import readline from 'readline/promises';

const repoRoot = path.resolve(__dirname, '..');
const envExamplePath = path.join(repoRoot, '.env.example');
const envPath = path.join(repoRoot, '.env');

const question = async (rl: readline.Interface, prompt: string, defaultValue?: string) => {
  const suffix = defaultValue ? ` (${defaultValue})` : '';
  const answer = await rl.question(`${prompt}${suffix}: `);
  return answer.trim() || defaultValue || '';
};

const confirm = async (rl: readline.Interface, prompt: string, defaultValue = false) => {
  const hint = defaultValue ? 'Y/n' : 'y/N';
  const answer = await rl.question(`${prompt} [${hint}]: `);
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return defaultValue;
  return ['y', 'yes'].includes(normalized);
};

const loadEnvExample = () => {
  if (!fs.existsSync(envExamplePath)) {
    throw new Error('Missing .env.example');
  }
  return fs.readFileSync(envExamplePath, 'utf8');
};

const writeEnv = (values: Record<string, string>) => {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  fs.writeFileSync(envPath, `${lines.join('\n')}\n`, { encoding: 'utf8' });
};

const buildEnvValues = async (rl: readline.Interface) => {
  const defaults: Record<string, string> = {};
  loadEnvExample()
    .split('\n')
    .filter((line) => line.includes('='))
    .forEach((line) => {
      const [key, value] = line.split('=');
      defaults[key.trim()] = value?.trim() ?? '';
    });

  const values: Record<string, string> = {};
  values.PORT = await question(rl, 'Port', defaults.PORT || '3000');
  values.NODE_ENV = await question(rl, 'NODE_ENV', defaults.NODE_ENV || 'development');
  values.DATABASE_URL = await question(rl, 'Postgres DATABASE_URL', defaults.DATABASE_URL || '');
  values.LOG_LEVEL = await question(rl, 'Log level', defaults.LOG_LEVEL || 'info');
  values.PANDADOC_API_KEY = await question(rl, 'PandaDoc API key', defaults.PANDADOC_API_KEY || '');
  values.PANDADOC_BASE_URL = await question(rl, 'PandaDoc base URL', defaults.PANDADOC_BASE_URL || 'https://api.pandadoc.com');
  values.PANDADOC_TEMPLATE_ID = await question(rl, 'PandaDoc template ID', defaults.PANDADOC_TEMPLATE_ID || '');
  values.TWILIO_ACCOUNT_SID = await question(rl, 'Twilio Account SID', defaults.TWILIO_ACCOUNT_SID || '');
  values.TWILIO_AUTH_TOKEN = await question(rl, 'Twilio Auth Token', defaults.TWILIO_AUTH_TOKEN || '');
  values.TWILIO_WHATSAPP_FROM = await question(rl, 'Twilio WhatsApp From (e.g. whatsapp:+14155238886)', defaults.TWILIO_WHATSAPP_FROM || '');
  values.TWILIO_WEBHOOK_AUTH_TOKEN = await question(rl, 'Twilio Webhook Auth Token', defaults.TWILIO_WEBHOOK_AUTH_TOKEN || '');
  values.LLM_API_KEY = await question(rl, 'LLM API key', defaults.LLM_API_KEY || '');
  values.LLM_BASE_URL = await question(rl, 'LLM base URL', defaults.LLM_BASE_URL || 'https://api.openai.com/v1');
  values.LLM_MODEL = await question(rl, 'LLM model', defaults.LLM_MODEL || 'gpt-4o-mini');
  values.ADMIN_API_KEY = await question(rl, 'Admin API key', defaults.ADMIN_API_KEY || '');

  return values;
};

const runCommand = (command: string, args: string[]) => {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: repoRoot });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
};

const writeOpenClawLoader = (skillsDir: string) => {
  const targetDir = path.join(skillsDir, 'otbay_pandadoc_proposals');
  fs.mkdirSync(targetDir, { recursive: true });
  const loaderPath = path.join(targetDir, 'index.js');
  const pkgPath = path.join(targetDir, 'package.json');
  const loader = `module.exports = require('${path.join(repoRoot, 'dist', 'openclaw', 'skill')}');\n`;
  fs.writeFileSync(loaderPath, loader, { encoding: 'utf8' });
  fs.writeFileSync(
    pkgPath,
    JSON.stringify({ name: 'otbay_pandadoc_proposals', version: '1.0.0', main: 'index.js' }, null, 2),
    { encoding: 'utf8' }
  );
};

const main = async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('OT Bay Builders PandaDoc Skill Setup');
    console.log('------------------------------------');
    const installDeps = await confirm(rl, 'Run npm install now?', true);
    if (installDeps) {
      runCommand('npm', ['install']);
    }

    const envValues = await buildEnvValues(rl);
    writeEnv(envValues);
    console.log('Wrote .env file.');

    const runMigrations = await confirm(rl, 'Run database migrations now?', true);
    if (runMigrations) {
      runCommand('npm', ['run', 'migrate']);
    }

    const build = await confirm(rl, 'Build the project now?', true);
    if (build) {
      runCommand('npm', ['run', 'build']);
    }

    const openClawDir = await question(rl, 'OpenClaw skills directory (leave blank to skip)');
    if (openClawDir) {
      writeOpenClawLoader(openClawDir);
      console.log(`OpenClaw loader written to ${path.join(openClawDir, 'otbay_pandadoc_proposals')}`);
    }

    console.log('Setup complete. You can start the service with: npm run dev');
  } finally {
    rl.close();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
