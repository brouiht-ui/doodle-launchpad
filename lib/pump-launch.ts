import {ComputeBudgetProgram,PublicKey,Transaction} from '@solana/web3.js';
import {PUMP_SDK,PUMP_PROGRAM_ID,GLOBAL_PDA,bondingCurvePda} from '@pump-fun/pump-sdk';
export {PUMP_SDK,PUMP_PROGRAM_ID,GLOBAL_PDA,bondingCurvePda};
export const LAUNCH_VERSION='pump-sol-creator-v1';
export async function buildPumpLaunch({mint,owner,name,symbol,uri,blockhash,lastValidBlockHeight}:{mint:PublicKey;owner:PublicKey;name:string;symbol:string;uri:string;blockhash:string;lastValidBlockHeight:number}){
 if(!uri.startsWith('https://')||Buffer.byteLength(uri)>200)throw new Error('A public HTTPS metadata URI of at most 200 bytes is required.');
 const create=await PUMP_SDK.createV2Instruction({mint,user:owner,creator:owner,name,symbol,uri,mayhemMode:false,cashback:false,holderReward:false});
 return new Transaction({feePayer:owner,blockhash,lastValidBlockHeight}).add(ComputeBudgetProgram.setComputeUnitLimit({units:300000}),ComputeBudgetProgram.setComputeUnitPrice({microLamports:10000}),create);
}
