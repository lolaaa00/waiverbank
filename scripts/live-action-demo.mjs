/** Final action-binding case. Prompts once locally; persists public evidence only. */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import inquirer from 'inquirer';
import { Wallet } from 'ethers';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { CalldataAddress } from 'genlayer-js/types';
import { executionLeader } from './receipt-utils.mjs';
const RPC='https://studio.genlayer.com/api';
const BANK='0x65265EF0b9687c55d5dEBc97b2aF02BD58D7A0A6';
const GATE='0xd46816C640cc8389326Da03Da6b592f7717DAF69';
const OWNER='0x577065eDBEEba97D811F0135838Aa641F24D13bF';
const ID='waiver-wrong-action-final', ACTION='HOTFIX_INC43';
const LOG='evidence/live-action-demo.jsonl';
const encode=value=>JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v);
const history=existsSync(LOG)?readFileSync(LOG,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
function record(value){appendFileSync(LOG,encode({at:new Date().toISOString(),...value})+'\n');console.log(encode(value));}
function stop(){console.error('Stopped. Preserve evidence/live-action-demo.jsonl. Recorded transactions must be reconciled before any retry.');process.exit(1);}
process.on('uncaughtException',stop);process.on('unhandledRejection',stop);
async function rpc(method,params){const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});const j=await r.json();if(!r.ok||j.error)throw new Error('RPC failed');return j.result;}
if(Number.parseInt(await rpc('eth_chainId',[]),16)!==61999)throw new Error('Wrong chain');
if(JSON.parse(readFileSync('node_modules/genlayer/package.json')).version!=='0.39.1')throw new Error('Wrong CLI');
for(const [address,file]of [[BANK,'WaiverBank.py'],[GATE,'WaiverGate.py']]){
  if(!Buffer.from(await rpc('gen_getContractCode',[address]),'base64').equals(readFileSync(`contracts/${file}`)))throw new Error('Source mismatch');
}
const {password}=await inquirer.prompt([{type:'password',name:'password',mask:'*',message:'WaiverBank deployer keystore password:'}]);
const wallet=await Wallet.fromEncryptedJson(readFileSync(resolve(homedir(),'.genlayer/keystores/waiverbank-deployer.json'),'utf8'),password);
if(wallet.address.toLowerCase()!==OWNER.toLowerCase())throw new Error('Wrong owner');
const client=createClient({chain:studionet,endpoint:RPC,account:createAccount(wallet.privateKey)});
async function write(label,address,functionName,args,expectedError=null){
  const prior=history.find(row=>row.phase==='submitted'&&row.label===label);
  const hash=prior?.hash??await client.writeContract({address,functionName,args,value:0n});
  if(!prior)record({phase:'submitted',label,address,functionName,args,hash});
  const tx=await client.waitForTransactionReceipt({hash,status:'FINALIZED',fullTransaction:true,retries:240,interval:5000});
  const leader=executionLeader(tx);
  record({phase:'finalized',label,hash,status:tx.statusName,execution:leader?.execution_result,result:leader?.result});
  if(tx.statusName!=='FINALIZED')throw new Error('Not finalized');
  if(expectedError){if(leader?.execution_result!=='ERROR'||leader?.result?.payload!==expectedError)throw new Error('Unexpected rejection');}
  else if(leader?.execution_result!=='SUCCESS')throw new Error('Execution failed');
}
const read=(address,functionName,args)=>client.readContract({address,functionName,args});
await write('request-different-action',BANK,'request_waiver',[ID,'security-v1',ACTION,
  'One emergency hotfix for service incident INC43, restricted to the affected service and the INC43 action only.',
  'Synthetic demo incident INC43 identifies a single-service outage and bounded repair. No PII export or continuing bypass is requested.',3600]);
await write('assess-different-action',BANK,'assess_waiver',[ID]);
const assessed=await read(BANK,'get_waiver',[ID]);record({phase:'assessment-read',waiver:assessed});
if(!['NARROW','MODERATE','BROAD'].includes(assessed.impact))throw new Error('Not eligible; preserve actual classification');
await write('approve-different-action',BANK,'approve_waiver',[ID]);
const beneficiary=new CalldataAddress(Buffer.from(OWNER.slice(2),'hex'));
const ownAction=await read(BANK,'is_active_for',[ID,'security-v1',beneficiary,ACTION]);
const gateAction=await read(BANK,'is_active_for',[ID,'security-v1',beneficiary,'HOTFIX_INC42']);
record({phase:'binding-read',ownAction,gateAction,waiver:await read(BANK,'get_waiver',[ID])});
if(ownAction!==true||gateAction!==false)throw new Error('Action binding precondition failed');
const before=await read(GATE,'uses',[beneficiary]);
await write('approved-wrong-action-rejected',GATE,'execute_with_waiver',[ID],'no effective waiver for caller/action');
const after=await read(GATE,'uses',[beneficiary]);
record({phase:'usage-read',before,after});
if(BigInt(before)!==BigInt(after))throw new Error('Rejected call changed counter');
console.log('LIVE_ACTION_DEMO_COMPLETE');
