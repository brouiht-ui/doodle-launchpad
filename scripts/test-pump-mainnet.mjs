import assert from 'node:assert/strict';
import {Connection,PublicKey,Keypair,VersionedTransaction} from '@solana/web3.js';
import {buildPumpLaunch,PUMP_SDK,PUMP_PROGRAM_ID,GLOBAL_PDA,bondingCurvePda} from '../lib/pump-launch.ts';
// Read-only RPC simulation. No wallet secrets, signing, or broadcast methods.
const c=new Connection('https://solana-rpc.publicnode.com','confirmed');
assert.equal(await c.getGenesisHash(),'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d');
const global=PUMP_SDK.decodeGlobal(await c.getAccountInfo(GLOBAL_PDA));
assert.ok(global.createV2Enabled);
// Use the protocol's public funded account only inside unsigned simulation.
const owner=global.feeRecipient,mint=Keypair.generate().publicKey,block=await c.getLatestBlockhash();
const tx=await buildPumpLaunch({owner,mint,name:'Doodle simulation',symbol:'SIM',uri:'https://example.com/doodle-simulation.json',...block});
assert.equal(tx.instructions.length,3);
assert.ok(tx.instructions[2].programId.equals(PUMP_PROGRAM_ID));
const result=await c.simulateTransaction(new VersionedTransaction(tx.compileMessage()),{sigVerify:false,commitment:'confirmed',accounts:{encoding:'base64',addresses:[bondingCurvePda(mint).toBase58()]}});
assert.equal(result.value.err,null,JSON.stringify({error:result.value.err,logs:result.value.logs}));
const account=result.value.accounts[0];assert.equal(account.owner,PUMP_PROGRAM_ID.toBase58());
const curve=PUMP_SDK.decodeBondingCurve({...account,owner:PUMP_PROGRAM_ID,data:Buffer.from(account.data[0],'base64')});
assert.ok(curve.creator.equals(owner));assert.ok(curve.quoteMint.equals(PublicKey.default));
assert.equal(curve.isHolderReward,false);assert.equal(curve.isCashbackCoin,false);assert.equal(curve.isMayhemMode,false);
assert.equal(await c.getAccountInfo(mint),null);
console.log('PASS: mainnet simulation creates a Pump SOL coin with the original creator, no holder rewards, no cashback, no mayhem. No transaction sent; no token created. Units:',result.value.unitsConsumed);
