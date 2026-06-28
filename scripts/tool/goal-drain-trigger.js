'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');

const { shouldFireWebhook } = require('../lib/goal-drain/session-state.js');

const WEBHOOK_FILE = 'drain-webhook.url.local';
const GOALS_REL = '.cursor/goals';

function resolveWorkspaceRoot(argv) {
  const argRoot = argv.find((a) => a.startsWith('--root='));
  if (argRoot) return argRoot.slice('--root='.length);
  return process.env.CURSOR_ZH_WORKSPACE_ROOT || process.cwd();
}

function readWebhookUrl(goalsDir) {
  const fromEnv = process.env.GOAL_DRAIN_WEBHOOK_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  const localFile = path.join(goalsDir, WEBHOOK_FILE);
  if (!fs.existsSync(localFile)) return null;
  const line = fs.readFileSync(localFile, 'utf8').split(/\r?\n/).find((l) => l.trim());
  return line ? line.trim() : null;
}

function postWebhook(url, payload) {
  const body = JSON.stringify(payload);
  const target = new URL(url);
  const transport = target.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main(argv) {
  const root = resolveWorkspaceRoot(argv);
  const goalsDir = path.join(root, GOALS_REL);
  const sessionPath = path.join(goalsDir, 'session.json');
  const queuePath = path.join(goalsDir, 'queue.json');

  if (!fs.existsSync(sessionPath)) {
    console.log('goal-drain-trigger: no session.json — skip');
    return 0;
  }

  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  if (!shouldFireWebhook(session)) {
    console.log('goal-drain-trigger: continuation not pending — skip');
    return 0;
  }

  const webhookUrl = readWebhookUrl(goalsDir);
  if (!webhookUrl) {
    console.error(
      'goal-drain-trigger: set GOAL_DRAIN_WEBHOOK_URL or .cursor/goals/drain-webhook.url.local'
    );
    return 2;
  }

  let queue = null;
  if (fs.existsSync(queuePath)) {
    queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  }

  const payload = {
    event: 'goal_drain_checkpoint',
    active_goal_id: queue?.active_goal_id ?? null,
    plan_ref: session.plan_ref ?? queue?.plan_ref ?? null,
    turn_count: session.turn_count ?? 0,
    at: new Date().toISOString(),
  };

  const result = await postWebhook(webhookUrl, payload);
  if (result.statusCode < 200 || result.statusCode >= 300) {
    console.error(`goal-drain-trigger: webhook HTTP ${result.statusCode}: ${result.body}`);
    return 1;
  }

  console.log(`goal-drain-trigger: webhook OK (${result.statusCode})`);
  return 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(err);
      process.exit(1);
    }
  );
}

module.exports = {
  readWebhookUrl,
  resolveWorkspaceRoot,
  postWebhook,
  WEBHOOK_FILE,
};
