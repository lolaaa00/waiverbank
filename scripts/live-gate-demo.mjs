/** Real StudioNet consumer calls; credentials remain in process memory. */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import inquirer from 'inquirer';
import { Wallet } from 'ethers';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { CalldataAddress } from 'genlayer-js/types';
import { executionLeader } from './receipt-utils.mjs';

const RPC = 'https://studio.genlayer.com/api';
const BANK = '0x65265EF0b9687c55d5dEBc97b2aF02BD58D7A0A6';
const GATE = '0xd46816C640cc8389326Da03Da6b592f7717DAF69';
const OWNER = '0x577065eDBEEba97D811F0135838Aa641F24D13bF';
const ownerArgument = new CalldataAddress(Buffer.from(OWNER.slice(2), 'hex'));
const LOG = resolve('evidence/live-gate-demo.jsonl');
const encode = value => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item);
const history = existsSync(LOG) ? readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const record = value => { appendFileSync(LOG, encode({ at: new Date().toISOString(), ...value }) + '\n'); console.log(encode(value)); };
process.on('uncaughtException', () => { console.error('Stopped. Preserve the public evidence log; inspect its last transaction before resuming.'); process.exit(1); });
process.on('unhandledRejection', () => { console.error('Stopped. Preserve the public evidence log; inspect its last transaction before resuming.'); process.exit(1); });

async function rpc(method, params) {
  const response = await fetch(RPC, { method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({jsonrpc:'2.0', id:1, method, params}) });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error('RPC failure');
  return body.result;
}
if (Number.parseInt(await rpc('eth_chainId', []), 16) !== 61999) throw new Error('Wrong chain');
for (const [address, filename] of [[BANK, 'WaiverBank.py'], [GATE, 'WaiverGate.py']]) {
  const local = readFileSync(`contracts/${filename}`);
  const remote = Buffer.from(await rpc('gen_getContractCode', [address]), 'base64');
  if (!local.equals(remote)) throw new Error('Source mismatch');
  record({phase:'source_verified', address, sha256:createHash('sha256').update(remote).digest('hex')});
}
if (JSON.parse(readFileSync('node_modules/genlayer/package.json')).version !== '0.39.1') throw new Error('Wrong CLI');
const { password } = await inquirer.prompt([{type:'password', name:'password', mask:'*', message:'WaiverBank deployer keystore password:'}]);
const wallet = await Wallet.fromEncryptedJson(readFileSync(resolve(homedir(), '.genlayer/keystores/waiverbank-deployer.json'), 'utf8'), password);
if (wallet.address.toLowerCase() !== OWNER.toLowerCase()) throw new Error('Wrong deployer');
const owner = createClient({chain:studionet, endpoint:RPC, account:createAccount(wallet.privateKey)});
const otherAccount = createAccount();
await rpc('sim_fundAccount', [otherAccount.address, 1_000_000_000_000_000_000]);
const other = createClient({chain:studionet, endpoint:RPC, account:otherAccount});

async function execute(label, client, waiver, expectedError) {
  const prior = history.find(row => row.phase === 'submitted' && row.label === label);
  const hash = prior?.hash ?? await client.writeContract({address:GATE, functionName:'execute_with_waiver', args:[waiver], value:0n});
  if (!prior) record({phase:'submitted', label, waiver, hash});
  const tx = await client.waitForTransactionReceipt({hash, status:'FINALIZED', fullTransaction:true, retries:240, interval:5000});
  const leader = executionLeader(tx);
  record({phase:'finalized', label, hash, status:tx.statusName, execution:leader?.execution_result, result:leader?.result});
  if (tx.statusName !== 'FINALIZED') throw new Error('Not finalized');
  if (expectedError) {
    if (leader?.execution_result !== 'ERROR' || leader?.result?.payload !== 'no effective waiver for caller/action') throw new Error('Unexpected rejection cause');
  } else if (leader?.execution_result !== 'SUCCESS') throw new Error('Authorized call failed');
}
const before = await owner.readContract({address:GATE, functionName:'uses', args:[ownerArgument]});
await execute('authorized-beneficiary', owner, 'waiver-gate', false);
await execute('wrong-beneficiary', other, 'waiver-gate', true);
await execute('expired-waiver', owner, 'waiver-incident42', true);
await execute('denied-waiver', owner, 'waiver-forbidden', true);
await execute('unknown-waiver', owner, 'waiver-does-not-exist', true);
const after = await owner.readContract({address:GATE, functionName:'uses', args:[ownerArgument]});
record({phase:'usage_read', beneficiary:OWNER, before, after});
if (!history.some(row => row.label === 'authorized-beneficiary') && BigInt(after) !== BigInt(before)+1n) throw new Error('Usage counter mismatch');
console.log('LIVE_GATE_DEMO_COMPLETE');
