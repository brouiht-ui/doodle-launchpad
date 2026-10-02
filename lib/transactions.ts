import {buildPumpLaunch,PUMP_SDK,PUMP_PROGRAM_ID,GLOBAL_PDA,bondingCurvePda,LAUNCH_VERSION} from './pump-launch';
import {publishLaunchMetadata,verifyLaunchMetadata} from './launch-metadata';
import {rewardLamports,decodeApprovedTransaction} from './transaction-security';
import {env} from 'cloudflare:workers';
import {Connection,PublicKey,Transaction,SystemProgram,TransactionInstruction,Keypair,clusterApiUrl,VersionedTransaction} from '@solana/web3.js';
import bs58 from 'bs58';
import {z} from 'zod';
import {db,fail,id,response,settings} from './server';
import type {Coin,Job,Submission} from './types';
type Intent={id:string;kind:string;owner:string;entityId:string;target:string;message:string;transaction:string;expires:number;signature:string|null;state:string;meta:string};
const input=z.object({intentId:z.string().uuid()});
export const lamports=rewardLamports;
export async function connection(){const config=settings();const url=env.SOLANA_RPC_URL||clusterApiUrl(config.network as 'devnet'|'mainnet-beta');if(!url.startsWith('https://'))fail(503,'A secure Solana RPC endpoint is required.');const c=new Connection(url,'confirmed');const genesis=await c.getGenesisHash();const expected=config.network==='devnet'?'EtWTRABZaYq6iMfeYKouRu166VU2xqa1':'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';if(genesis!==expected)fail(503,'The RPC endpoint is on the wrong Solana network.');return c}
async function existing(kind:string,entityId:string,owner:string){const row=await db().prepare("SELECT * FROM intents WHERE kind=? AND entityId=? AND state IN ('prepared','submitted') ORDER BY expires DESC LIMIT 1").bind(kind,entityId).first<Intent>();if(!row)return null;if(row.owner!==owner)fail(403,'This transaction belongs to another wallet.');return row}
function prepared(i:Intent){return response({intentId:i.id,transaction:i.transaction,version:'legacy',signature:i.signature,network:settings().network,launch:JSON.parse(i.meta).review})}
async function saveIntent(kind:string,owner:string,entityId:string,target:string,tx:Transaction,meta:Record<string,unknown>){const intent:Intent={id:id(),kind,owner,entityId,target,message:tx.serializeMessage().toString('base64'),transaction:tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64'),expires:Date.now()+120000,signature:null,state:'prepared',meta:JSON.stringify({...meta,network:settings().network,launchVersion:kind==='launch'?LAUNCH_VERSION:undefined})};await db().prepare('INSERT INTO intents (id,kind,owner,entityId,target,message,transaction,expires,state,meta) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(intent.id,kind,owner,entityId,target,intent.message,intent.transaction,intent.expires,'prepared',intent.meta).run();return intent}
async function reuseOrExpire(i:Intent,c:Connection){if(i.signature){const s=await c.getSignatureStatuses([i.signature],{searchTransactionHistory:true});if(s.value[0]&&!s.value[0].err)return true;if(s.value[0]?.err){await db().prepare("UPDATE intents SET state='failed' WHERE id=?").bind(i.id).run();return false}}
 const meta=JSON.parse(i.meta);if(await c.getBlockHeight('confirmed')<=meta.lastValidBlockHeight)return true;await db().prepare("UPDATE intents SET state='expired' WHERE id=?").bind(i.id).run();return false}
export async function transactionRoute(kind:string,action:string,data:unknown,owner:string){
 if(action==='prepare'){
  if(kind==='launch'&&!settings().launchEnabled)fail(503,settings().launchReason);
  const c=await connection();
  if(kind==='payout'){
   const {jobId,submissionId}=z.object({jobId:z.string().uuid(),submissionId:z.string().uuid()}).parse(data);const job=await db().prepare('SELECT * FROM jobs WHERE id=? AND owner=?').bind(jobId,owner).first<Job>();if(!job)fail(403,'Only the job creator can fund this reward.');if(job!.status==='paid')fail(409,'This job has already been paid.');const prior=await existing(kind,jobId,owner);if(prior&&await reuseOrExpire(prior,c)){if(prior.target!==submissionId)fail(409,'Finish or wait for the existing payout before choosing another submission.');return prepared(prior)}
   const submission=await db().prepare("SELECT * FROM submissions WHERE id=? AND jobId=? AND status='submitted'").bind(submissionId,jobId).first<Submission>();if(!submission)fail(404,'Submission not found.');if(submission!.wallet===owner)fail(403,'Self-awards are not supported.');const claim=await db().prepare("UPDATE jobs SET status='paying' WHERE id=? AND status IN ('open','paying') AND NOT EXISTS (SELECT 1 FROM intents WHERE entityId=? AND kind='payout' AND state IN ('prepared','submitted')) RETURNING id").bind(jobId,jobId).first();if(!claim)fail(409,'A payout is already being prepared.');const block=await c.getLatestBlockhash();const tx=new Transaction({feePayer:new PublicKey(owner),...block}).add(SystemProgram.transfer({fromPubkey:new PublicKey(owner),toPubkey:new PublicKey(submission!.wallet),lamports:lamports(job!.reward)}),new TransactionInstruction({programId:new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),keys:[],data:Buffer.from(`doodle:reward:${jobId}:${submissionId}`)}));const intent=await saveIntent(kind,owner,jobId,submissionId,tx,{...block,recipient:submission!.wallet,lamports:lamports(job!.reward).toString()});return prepared(intent);
  }
  if(!settings().launchEnabled)fail(503,settings().launchReason);
  const {coinId}=z.object({coinId:z.string().uuid()}).parse(data);const coin=await db().prepare('SELECT * FROM coins WHERE id=? AND owner=?').bind(coinId,owner).first<Coin>();if(!coin)fail(403,'Only this character’s creator can launch it.');if(coin!.status==='live')fail(409,'This character already has a token.');const provenance=await db().prepare("SELECT id FROM assets WHERE '/api/art/' || id || '.png'=? AND owner=? AND source='canvas-v1'").bind(coin!.image,owner).first();if(!provenance)fail(400,'This coin must use artwork drawn in the Doodle canvas. Imported legacy images cannot launch.');if(coin!.pair!=='SOL')fail(400,'This quote asset is not supported.');const prior=await existing(kind,coinId,owner);if(prior&&await reuseOrExpire(prior,c))return prepared(prior);
  if(settings().network!=='mainnet-beta')fail(503,'Pump launches are configured for Solana mainnet only.');
  const ownerKey=new PublicKey(owner);
  const [program,globalAccount,balance]=await Promise.all([c.getAccountInfo(PUMP_PROGRAM_ID),c.getAccountInfo(GLOBAL_PDA),c.getBalance(ownerKey)]);
  if(!program?.executable||!globalAccount?.owner.equals(PUMP_PROGRAM_ID))fail(503,'The Pump mainnet program could not be verified.');
  if(!PUMP_SDK.decodeGlobal(globalAccount!).createV2Enabled)fail(503,'Pump has paused coin creation.');
  if(balance<10000000)fail(400,'Your wallet needs SOL for token-account rent and network fees. Fund it with at least 0.01 SOL, then retry; the final cost is checked before signing.');
  const published=await publishLaunchMetadata(coin!);await verifyLaunchMetadata(coin!,published);
  const mint=Keypair.generate(),block=await c.getLatestBlockhash();
  const tx=await buildPumpLaunch({mint:mint.publicKey,owner:ownerKey,name:coin!.name,symbol:coin!.symbol,uri:published.uri,...block});
  tx.partialSign(mint);
  const simulation=await c.simulateTransaction(new VersionedTransaction(tx.compileMessage()),{sigVerify:false,commitment:'confirmed',accounts:{encoding:'base64',addresses:[owner,bondingCurvePda(mint.publicKey).toBase58()]}});
  if(simulation.value.err)fail(400,'Pump launch simulation failed: '+JSON.stringify(simulation.value.err)+'. No transaction was sent. Check your SOL balance and retry.');
  const curveAccount=simulation.value.accounts?.[1];
  if(!curveAccount||curveAccount.owner!==PUMP_PROGRAM_ID.toBase58())fail(503,'Simulation did not create the expected Pump bonding curve.');
  const curve=PUMP_SDK.decodeBondingCurve({...curveAccount!,data:Buffer.from(curveAccount!.data[0],'base64'),owner:PUMP_PROGRAM_ID});
  if(!curve.creator.equals(ownerKey)||!curve.quoteMint.equals(PublicKey.default)||curve.isHolderReward||curve.isCashbackCoin||curve.isMayhemMode)fail(503,'Simulation did not preserve SOL pairing and creator-owned fees.');
  const fee=(await c.getFeeForMessage(tx.compileMessage(),'confirmed')).value;
  const after=simulation.value.accounts?.[0]?.lamports;if(fee===null||after===undefined)fail(503,'Could not calculate the launch cost. Retry before signing.');
  const estimatedCostLamports=Math.max(fee!,balance-after!);
  if(balance<estimatedCostLamports)fail(400,'Insufficient SOL for the simulated launch cost.');
  const review={name:coin!.name,symbol:coin!.symbol,mint:mint.publicKey.toBase58(),creator:owner,pair:'SOL',metadataUri:published.uri,estimatedCostLamports,creatorFees:'100% to creator',initialBuySol:0};
  const intent=await saveIntent(kind,owner,coinId,mint.publicKey.toBase58(),tx,{...block,program:PUMP_PROGRAM_ID.toBase58(),review});return prepared(intent);
 }
 const {intentId}=input.parse(data);const intent=await db().prepare('SELECT * FROM intents WHERE id=? AND owner=? AND kind=?').bind(intentId,owner,kind).first<Intent>();if(!intent)fail(404,'Transaction intent not found.');const i=intent!,intentMeta=JSON.parse(i.meta);if(intentMeta.network!==settings().network||(kind==='launch'&&intentMeta.launchVersion!==LAUNCH_VERSION))fail(409,'This transaction belongs to an older launch setup. Prepare a fresh launch.');const c=await connection();
 if(action==='submit'){
  const {transaction}=z.object({transaction:z.array(z.number().int().min(0).max(255)).min(64).max(2000)}).parse(data);let tx!:Transaction;try{tx=decodeApprovedTransaction(transaction,i.message)}catch{fail(400,'The signed transaction does not match the approved operation.');}const signature=bs58.encode(tx.signature!);if(i.signature&&i.signature!==signature)fail(409,'A different transaction is already attached to this operation.');if(i.state==='confirmed')return response({signature:i.signature});if(i.state==='expired'||i.state==='failed')fail(409,'This operation has expired. Prepare a new transaction.');await db().prepare("UPDATE intents SET signature=?,state='submitted' WHERE id=? AND state IN ('prepared','submitted')").bind(signature,i.id).run();try{await c.sendRawTransaction(tx.serialize(),{skipPreflight:false,maxRetries:3})}catch{fail(503,`Transaction submission is unconfirmed. Retry confirmation for intent ${i.id}; do not make a second payment.`)}return response({signature,intentId:i.id});
 }
 if(action==='confirm'){
  if(i.state==='confirmed'){if(kind==='payout')return response({ok:true,signature:i.signature});return response({coin:await db().prepare('SELECT * FROM coins WHERE id=?').bind(i.entityId).first()});}
  if(!i.signature)fail(409,'Sign and submit the transaction first.');const meta=JSON.parse(i.meta);const result=await c.confirmTransaction({signature:i.signature!,blockhash:meta.blockhash,lastValidBlockHeight:meta.lastValidBlockHeight},'confirmed');if(result.value.err){await db().prepare("UPDATE intents SET state='failed' WHERE id=?").bind(i.id).run();fail(400,'The transaction failed on-chain. No reward or launch has been recorded.');}const receipt=await c.getTransaction(i.signature!,{commitment:'confirmed',maxSupportedTransactionVersion:0});if(!receipt||receipt.meta?.err||Buffer.from(receipt.transaction.message.serialize()).toString('base64')!==i.message)fail(409,'Waiting for a matching on-chain receipt. Please retry confirmation.');
  if(kind==='payout'){await db().batch([db().prepare("UPDATE submissions SET status='paid',signature=? WHERE id=? AND jobId=?").bind(i.signature,i.target,i.entityId),db().prepare("UPDATE jobs SET status='paid' WHERE id=? AND owner=?").bind(i.entityId,owner),db().prepare("UPDATE intents SET state='confirmed' WHERE id=?").bind(i.id)]);return response({ok:true,signature:i.signature});}
  const curveAccount=await c.getAccountInfo(bondingCurvePda(new PublicKey(i.target)));if(!curveAccount?.owner.equals(PUMP_PROGRAM_ID))fail(409,'Waiting for the Pump bonding curve. Retry confirmation.');const launchedCurve=PUMP_SDK.decodeBondingCurve(curveAccount!);if(!launchedCurve.creator.equals(new PublicKey(owner))||!launchedCurve.quoteMint.equals(PublicKey.default)||launchedCurve.isHolderReward||launchedCurve.isCashbackCoin)fail(409,'The on-chain coin does not match the approved creator-fee launch.');
  await db().batch([db().prepare("UPDATE coins SET status='live',mint=?,signature=? WHERE id=? AND owner=?").bind(i.target,i.signature,i.entityId,owner),db().prepare("UPDATE intents SET state='confirmed' WHERE id=?").bind(i.id)]);return response({coin:await db().prepare('SELECT * FROM coins WHERE id=?').bind(i.entityId).first()});
 }
 fail(404,'Transaction action not found.');
}




