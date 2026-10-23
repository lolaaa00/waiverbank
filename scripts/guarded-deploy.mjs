/** Fail-closed deployment: only local genlayer@0.39.1 + stable studionet 61999. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const expectedRpc = 'https://studio.genlayer.com/api';
const expectedChain = 61999;
const expectedCli = '0.39.1';
const contractArg = process.argv[2];
const additionalArgs = process.argv.slice(3);
const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const cli = resolve(projectRoot, 'node_modules', '.bin', 'genlayer');

function fail(message) { throw new Error(`DEPLOY BLOCKED: ${message}`); }
function run(args) {
  const result = spawnSync(cli, args, { cwd: projectRoot, encoding: 'utf8' });
  if (result.error || result.status !== 0) fail(`${args.join(' ')} failed: ${result.stderr ?? result.error}`);
  return `${result.stdout}\n${result.stderr}`;
}

if (!['contracts/WaiverBank.py', 'contracts/WaiverGate.py'].includes(contractArg)) {
  fail('contract path must be one of the two audited contracts');
}
if (contractArg === 'contracts/WaiverBank.py' && additionalArgs.length !== 0) {
  fail('WaiverBank has a zero-argument constructor');
}
if (contractArg === 'contracts/WaiverGate.py' &&
    (additionalArgs.length !== 3 || !/^0x[0-9a-fA-F]{40}$/.test(additionalArgs[0]) ||
     !/^[a-zA-Z0-9_-]{3,64}$/.test(additionalArgs[1]) ||
     !/^[a-zA-Z0-9_-]{3,64}$/.test(additionalArgs[2]))) {
  fail('WaiverGate requires bank address, protected policy ID, exact action key');
}
if (process.env.GENLAYER_RPC_URL && process.env.GENLAYER_RPC_URL !== expectedRpc) {
  fail('conflicting GENLAYER_RPC_URL');
}
if (!existsSync(cli)) fail('install repository-local CLI with npm ci');
const pkg = JSON.parse(readFileSync(resolve(projectRoot, 'node_modules', 'genlayer', 'package.json'), 'utf8'));
if (pkg.version !== expectedCli) fail(`installed GenLayer CLI is ${pkg.version}, expected ${expectedCli}`);

const info = run(['network', 'info']);
if (!/studionet/i.test(info) || !info.includes(expectedRpc) ||
    !new RegExp(`\\b${expectedChain}\\b`).test(info)) {
  fail(`network info does not explicitly verify studionet / ${expectedChain} / ${expectedRpc}.\n${info}`);
}
// Require an independent live chain-ID check before signing any deployment.
const rpcResponse = await fetch(expectedRpc, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
  signal: AbortSignal.timeout(12000),
});
if (!rpcResponse.ok) fail(`RPC health status ${rpcResponse.status}`);
const chainResponse = await rpcResponse.json();
const remoteChain = Number.parseInt(chainResponse.result, 16);
if (remoteChain !== expectedChain) fail(`RPC returned chain ID ${remoteChain}`);

console.log(`Guard passed: local GenLayer ${expectedCli} | studionet ${expectedChain} | ${expectedRpc}`);
console.log(`Deploying ${contractArg}; verify transaction FINALIZED before relying on address.`);
const deploymentArgs = ['deploy', '--contract', contractArg];
if (additionalArgs.length) deploymentArgs.push('--args', ...additionalArgs);
const deployment = spawnSync(cli, deploymentArgs, {
  cwd: projectRoot, stdio: 'inherit', env: { ...process.env, GENLAYER_RPC_URL: expectedRpc },
});
if (deployment.error) fail(deployment.error.message);
if (deployment.status !== 0) fail(`deployment exited ${deployment.status}`);
