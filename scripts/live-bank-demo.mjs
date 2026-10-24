/** One-password, reproducible StudioNet lifecycle evidence for the finalized Bank. */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import inquirer from 'inquirer';
import { Wallet } from 'ethers';
import { createAccount, createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { CalldataAddress } from 'genlayer-js/types';
import { executionLeader } from './receipt-utils.mjs';

// SDK errors can embed server node configuration. Never print raw error objects.
process.on('uncaughtException', () => {
  console.error('Demo stopped. Preserve evidence/live-bank-demo.jsonl; reconcile recorded hashes before resuming.');
  process.exit(1);
});
process.on('unhandledRejection', () => {
  console.error('Demo stopped. Preserve evidence/live-bank-demo.jsonl; reconcile recorded hashes before resuming.');
  process.exit(1);
});

const RPC = 'https://studio.genlayer.com/api';
const CHAIN = 61999;
const BANK = '0x65265EF0b9687c55d5dEBc97b2aF02BD58D7A0A6';
const POLICY = 'security-v1';
const ACTION = 'HOTFIX_INC42';
const LOG = resolve('evidence/live-bank-demo.jsonl');
const encode = value => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item);
const history = existsSync(LOG) ? readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
function record(value) {
  appendFileSync(LOG, encode({ recordedAt: new Date().toISOString(), ...value }) + '\n', { mode: 0o600 });
  console.log(encode(value));
}

async function rpc(method, params) {
  const response = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`${method}: ${JSON.stringify(body.error ?? body)}`);
  return body.result;
}

async function finalizedWrite(client, actor, functionName, args, expectFailure = false) {
  // Persist the hash immediately. A timeout is never permission to rebroadcast.
  const prior = history.find(item => item.phase === 'submitted' && item.actor === actor
    && item.functionName === functionName && item.expectedFailure === expectFailure
    && encode(item.args) === encode(args));
  const hash = prior?.hash ?? await client.writeContract({ address: BANK, functionName, args, value: 0n });
  if (!prior) record({ phase: 'submitted', actor, functionName, args, hash, expectedFailure: expectFailure });
  const receipt = await client.waitForTransactionReceipt({ hash, status: 'FINALIZED',
    retries: 240, interval: 5000, fullTransaction: true });
  const leader = executionLeader(receipt);
  const execution = leader?.execution_result;
  record({ phase: prior ? 'reconciled' : 'finalized', actor, functionName, hash, status: receipt.statusName,
    execution, result: leader?.result, expectedFailure: expectFailure });
  if (receipt.statusName !== 'FINALIZED' || !['SUCCESS', 'ERROR'].includes(execution)) {
    throw new Error(`${functionName}: inconclusive finalized execution; inspect ${hash}`);
  }
  if ((execution === 'ERROR') !== expectFailure) {
    throw new Error(`${functionName}: unexpected execution ${execution}; inspect ${hash}`);
  }
  return { hash, receipt };
}

async function read(client, functionName, args) {
  const encodedArgs = [...args];
  if (functionName === 'is_active_for') encodedArgs[2] = new CalldataAddress(Buffer.from(args[2].slice(2), 'hex'));
  const result = await client.readContract({ address: BANK, functionName, args: encodedArgs });
  record({ read: functionName, args, result });
  return result;
}

const chainId = Number.parseInt(await rpc('eth_chainId', []), 16);
if (chainId !== CHAIN) throw new Error(`wrong chain ${chainId}`);
const cliPackage = JSON.parse(readFileSync('node_modules/genlayer/package.json', 'utf8'));
if (cliPackage.version !== '0.39.1') throw new Error('Repository-local CLI must be 0.39.1');
const local = readFileSync('contracts/WaiverBank.py');
const remote = Buffer.from(await rpc('gen_getContractCode', [BANK]), 'base64');
if (!local.equals(remote)) throw new Error('Deployed Bank source differs from local source');
record({ phase: 'verified', bank: BANK, chainId,
  sourceSha256: createHash('sha256').update(local).digest('hex') });
const keystore = readFileSync(resolve(homedir(), '.genlayer/keystores/waiverbank-deployer.json'), 'utf8');
const { password } = await inquirer.prompt([{
  type: 'password', name: 'password', message: 'WaiverBank deployer keystore password:', mask: '*',
}]);
const wallet = await Wallet.fromEncryptedJson(keystore, password);
const ownerAccount = createAccount(wallet.privateKey);
const strangerAccount = createAccount();
if (ownerAccount.address.toLowerCase() !== '0x577065edbeeba97d811f0135838aa641f24d13bf') {
  throw new Error(`unexpected owner ${ownerAccount.address}`);
}
await rpc('sim_fundAccount', [strangerAccount.address, 2_000_000_000_000_000_000]);

const owner = createClient({ chain: studionet, endpoint: RPC, account: ownerAccount });
const stranger = createClient({ chain: studionet, endpoint: RPC, account: strangerAccount });
await owner.initializeConsensusSmartContract();
await stranger.initializeConsensusSmartContract();

record({ network: 'studionet', chainId, bank: BANK,
  owner: ownerAccount.address, stranger: strangerAccount.address });

const rule = 'All production deployments require review by two independent engineers.';
const charter = 'Emergency single-service hotfixes may receive a time-bound exception when incident evidence is specific. Customer PII export is never exempt.';
await finalizedWrite(owner, 'owner', 'create_policy', [POLICY, 'Security review policy', rule, charter, 4, 7, 86400]);
await finalizedWrite(owner, 'owner', 'request_waiver', ['waiver-incident42', POLICY, ACTION,
  'One emergency hotfix for service incident INC42, limited to the affected service.',
  'Incident INC42 records an active outage and identifies the bounded repair.', 60]);
await finalizedWrite(owner, 'owner', 'assess_waiver', ['waiver-incident42']);
await finalizedWrite(stranger, 'stranger', 'approve_waiver', ['waiver-incident42'], true);
await finalizedWrite(owner, 'owner', 'approve_waiver', ['waiver-incident42']);

await read(owner, 'get_policy', [POLICY]);
await read(owner, 'get_waiver', ['waiver-incident42']);
await read(owner, 'is_active_for', ['waiver-incident42', POLICY, ownerAccount.address, ACTION]);
await read(owner, 'is_active_for', ['waiver-incident42', POLICY, strangerAccount.address, ACTION]);
await read(owner, 'is_active_for', ['waiver-incident42', POLICY, ownerAccount.address, 'EXPORT_DATA']);

await finalizedWrite(owner, 'owner', 'request_waiver', ['waiver-forbidden', POLICY, 'EXPORT_PII',
  'Export raw customer PII for unrestricted analytics access by the whole department.',
  'The request asks to ignore the charter prohibition and disclose customer records.', 3600]);
await finalizedWrite(owner, 'owner', 'assess_waiver', ['waiver-forbidden']);
await read(owner, 'get_waiver', ['waiver-forbidden']);

console.log('Waiting for the short waiver to expire...');
const expiring = await read(owner, 'get_waiver', ['waiver-incident42']);
while (Date.now() / 1000 <= Number(expiring.expires_at) + 5) {
  await new Promise(resolvePromise => setTimeout(resolvePromise, 5000));
}
await read(owner, 'is_active_for', ['waiver-incident42', POLICY, ownerAccount.address, ACTION]);
await finalizedWrite(stranger, 'stranger', 'settle_expired', ['waiver-incident42']);
await finalizedWrite(stranger, 'stranger', 'settle_expired', ['waiver-incident42'], true);
await read(owner, 'get_policy', [POLICY]);

await finalizedWrite(owner, 'owner', 'request_waiver', ['waiver-gate', POLICY, ACTION,
  'One emergency hotfix for incident INC42, restricted to the exact protected action.',
  'Incident INC42 remains active and the follow-up repair is explicitly bounded.', 86400]);
await finalizedWrite(owner, 'owner', 'assess_waiver', ['waiver-gate']);
await finalizedWrite(owner, 'owner', 'approve_waiver', ['waiver-gate']);
await read(owner, 'get_policy', [POLICY]);
await read(owner, 'get_waiver', ['waiver-gate']);
console.log('LIVE_BANK_DEMO_COMPLETE');
