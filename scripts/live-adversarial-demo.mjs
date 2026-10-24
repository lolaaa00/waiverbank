/** Isolated faucet-funded StudioNet attack cases. No persistent credentials. */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createAccount, createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { CalldataAddress } from 'genlayer-js/types';
import { executionLeader } from './receipt-utils.mjs';
const RPC = 'https://studio.genlayer.com/api';
const BANK = '0x65265EF0b9687c55d5dEBc97b2aF02BD58D7A0A6';
const GATE = '0xd46816C640cc8389326Da03Da6b592f7717DAF69';
const policyOnly = process.argv.includes('--policy-only');
const LOG = policyOnly ? 'evidence/live-policy-substitution.jsonl' : 'evidence/live-adversarial-demo.jsonl';
const encode = value => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v);
const record = value => { appendFileSync(LOG, encode({at:new Date().toISOString(), ...value})+'\n'); console.log(encode(value)); };
process.on('unhandledRejection', () => { console.error('Stopped: preserve log and reconcile submitted hashes.'); process.exit(1); });
async function rpc(method, params) {
  const r = await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  const j = await r.json(); if (!r.ok || j.error) throw new Error('RPC failed'); return j.result;
}
if (existsSync(LOG)) throw new Error('Already attempted: reconcile existing evidence before a fresh run');
if (Number.parseInt(await rpc('eth_chainId',[]),16)!==61999) throw new Error('Wrong chain');
if (JSON.parse(readFileSync('node_modules/genlayer/package.json')).version!=='0.39.1') throw new Error('Wrong CLI');
for (const [a,f] of [[BANK,'WaiverBank.py'],[GATE,'WaiverGate.py']]) {
  if (!Buffer.from(await rpc('gen_getContractCode',[a]),'base64').equals(readFileSync(`contracts/${f}`))) throw new Error('Source mismatch');
}
const account = createAccount();
await rpc('sim_fundAccount',[account.address,2_000_000_000_000_000_000]);
const client = createClient({chain:studionet,endpoint:RPC,account});
const suffix = account.address.slice(2,10);
const policy = `audit-${suffix}`;
const first = `first-${suffix}`, second = `second-${suffix}`;
record({phase:'identity',address:account.address,policy,chainId:61999});
async function write(label,address,functionName,args,errorText=null) {
  const hash=await client.writeContract({address,functionName,args,value:0n});
  record({phase:'submitted',label,address,functionName,args,hash});
  const tx=await client.waitForTransactionReceipt({hash,status:'FINALIZED',fullTransaction:true,retries:240,interval:5000});
  const leader=executionLeader(tx);
  record({phase:'finalized',label,hash,status:tx.statusName,execution:leader?.execution_result,result:leader?.result});
  if(tx.statusName!=='FINALIZED')throw new Error('Not finalized');
  if(errorText){if(leader?.execution_result!=='ERROR'||!String(leader?.result?.payload).includes(errorText))throw new Error('Unexpected rejection');}
  else if(leader?.execution_result!=='SUCCESS')throw new Error('Unexpected failure');
}
async function read(functionName,args){const result=await client.readContract({address:BANK,functionName,args});record({phase:'read',functionName,args,result});return result;}
const rule='All production hotfixes require two independent reviews before execution.';
const duration=policyOnly ? 3600 : 60;
const charter=`An exception is allowed for exactly one service hotfix for a specific incident, with a maximum duration of ${duration} seconds. No data export or continuing bypass is allowed.`;
await write('policy-substitution-rejected',BANK,'create_policy',['security-v1','Replacement policy',rule,charter,1,1,60],'policy id invalid or taken');
await write('isolated-policy-created',BANK,'create_policy',[policy,'Isolated budget audit',rule,charter,1,1,duration]);
const scope='One service hotfix for incident AUDIT42, with one review omitted for only this repair.';
const evidence='AUDIT42 is a synthetic test incident. The requested exception is limited to this single service repair for sixty seconds.';
for(const id of policyOnly ? [first] : [first,second]){
  await write(`request-${id}`,BANK,'request_waiver',[id,policy,'HOTFIX_INC42',scope,evidence,duration]);
  await write(`assess-${id}`,BANK,'assess_waiver',[id]);
  const w=await read('get_waiver',[id]);
  if(w.impact!=='NARROW'||w.status!=='ASSESSED')throw new Error('Actual model classification differs; do not force the expected label');
}
await write('first-approved',BANK,'approve_waiver',[first]);
if(policyOnly){
  const args=[first,policy,new CalldataAddress(Buffer.from(account.address.slice(2),'hex')),'HOTFIX_INC42'];
  const active=await client.readContract({address:BANK,functionName:'is_active_for',args});
  record({phase:'active-before-gate',waiver:first,policy,active});
  if(active!==true)throw new Error('Attacker waiver is not active');
  await write('active-attacker-policy-gate-bypass-rejected',GATE,'execute_with_waiver',[first],'no effective waiver for caller/action');
  await read('get_waiver',[first]);
  console.log('LIVE_POLICY_SUBSTITUTION_COMPLETE');
  process.exit(0);
}
await write('active-budget-exceeded',BANK,'approve_waiver',[second],'active envelope exhausted');
await write('attacker-policy-gate-bypass-rejected',GATE,'execute_with_waiver',[first],'no effective waiver for caller/action');
const before=await read('get_policy',[policy]);
if(before.active_used!=='1'||before.lifetime_used!=='1')throw new Error('Counter mismatch');
await write('settle-expired-first',BANK,'settle_expired',[first]);
const after=await read('get_policy',[policy]);
if(after.active_used!=='0'||after.lifetime_used!=='1')throw new Error('Lifetime refund invariant violated');
await write('lifetime-budget-exceeded',BANK,'approve_waiver',[second],'lifetime envelope exhausted');
await read('get_policy',[policy]);
console.log('LIVE_ADVERSARIAL_DEMO_COMPLETE');
