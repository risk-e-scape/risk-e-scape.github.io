#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = __dirname;
const ROSTER = path.join(ROOT, 'participants', 'participants.csv');
const SECRET_LIMIT = 48 * 1024;
const SAFE_LIMIT = 45 * 1024;

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: options?.stdio || 'pipe',
    input: options?.input
  });
  if (result.error) return { ok: false, output: result.error.message };
  return {
    ok: result.status === 0,
    output: ((result.stdout || '') + (result.stderr || '')).trim()
  };
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(ROSTER)) {
  fail('Private roster not found at participants/participants.csv. Run npm run prepare-certificates first.');
}

const roster = fs.readFileSync(ROSTER);
if (roster.length > SAFE_LIMIT) {
  fail(`The roster is ${roster.length} bytes. GitHub secrets are limited to ${SECRET_LIMIT} bytes. ` +
    'Move the roster to a private data repository before deploying more records.');
}
if (roster.length > 35 * 1024) {
  console.warn(`\nWarning: the roster is ${roster.length} bytes and is approaching the 48 KB secret limit.`);
}

const ghVersion = run('gh', ['--version']);
if (!ghVersion.ok) {
  fail('GitHub CLI is not installed. Install it from https://cli.github.com/, then run "gh auth login".');
}
const auth = run('gh', ['auth', 'status']);
if (!auth.ok) {
  fail('GitHub CLI is not authenticated. Run "gh auth login" and choose GitHub.com → HTTPS → Login with a web browser.');
}

const remote = run('git', ['remote', 'get-url', 'origin']);
if (!remote.ok) fail('Could not read the Git origin remote.');
const match = /github\.com[/:]([^/]+\/[^/.]+)(?:\.git)?$/.exec(remote.output);
if (!match) fail(`Could not derive the GitHub repository from origin: ${remote.output}`);
const repository = match[1];

const changes = run('git', ['status', '--porcelain', '--untracked-files=no']);
if (!changes.ok) fail('Could not check the Git working tree.');
if (changes.output) {
  fail('Public source changes are not committed and pushed. Commit and push them before deploying the private roster.');
}

console.log('\nValidating the private roster and generated site...');
execFileSync(process.execPath, [path.join(ROOT, 'test.js'), '--build'], { stdio: 'inherit' });

console.log(`Uploading ${roster.length} bytes to the PARTICIPANTS_CSV secret in ${repository}...`);
const secret = run('gh', ['secret', 'set', 'PARTICIPANTS_CSV', '--repo', repository], {
  input: roster,
  stdio: ['pipe', 'inherit', 'inherit']
});
if (!secret.ok) fail('GitHub rejected the secret update. Confirm that your account has administrator access to the repository.');

console.log('Triggering the Build, Test and Deploy workflow on main...');
const workflow = run('gh', ['workflow', 'run', 'build.yml', '--repo', repository, '--ref', 'main'], {
  stdio: 'inherit'
});
if (!workflow.ok) fail('The secret was updated, but the deployment workflow could not be triggered.');

console.log('\nRoster uploaded and deployment requested.');
console.log(`Monitor progress at https://github.com/${repository}/actions\n`);
