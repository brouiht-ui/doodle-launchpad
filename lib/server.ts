import {env} from 'cloudflare:workers';
import {createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export const fail=(status:number,message:string):never=>{throw new HttpError(status,message)};
export function db(){if(!env.DB)fail(503,'The clubhouse database is unavailable. Please try again shortly.');return env.DB!}
export function bucket(){if(!env.BUCKET)fail(503,'Artwork storage is unavailable. Your drawing is still on this page.');return env.BUCKET!}
export const id=()=>crypto.randomUUID();
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export const addressSchema=z.string().refine(s=>{try{return bs58.decode(s).length===32}catch{return false}},'Invalid Solana wallet address');
export const signatureSchema=z.array(z.number().int().min(0).max(255)).length(64);
export function verifySignature(address:string,message:string,signature:number[]){return nacl.sign.detached.verify(new TextEncoder().encode(message),Uint8Array.from(signature),bs58.decode(address))}
export async function body(req:Request,max=15000){const declared=Number(req.headers.get('content-length')||0);if(declared>max)fail(413,'This upload is too large.');const reader=req.body?.getReader();if(!reader)fail(400,'Request body is required.');const chunks:Uint8Array[]=[];let length=0;while(true){const {value,done}=await reader!.read();if(done)break;length+=value.length;if(length>max){await reader!.cancel();fail(413,'This upload is too large.')}chunks.push(value)}const raw=new Uint8Array(length);let offset=0;for(const c of chunks){raw.set(c,offset);offset+=c.length}try{return JSON.parse(new TextDecoder().decode(raw))}catch{fail(400,'Invalid JSON request.')}}
export function originCheck(req:Request){const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)fail(403,'Please make this request from the Doodle site.');if(!req.headers.get('content-type')?.startsWith('application/json'))fail(415,'JSON is required.')}
export async function rate(key:string,limit:number,period=60000){const now=Date.now(),slot=Math.floor(now/period),k=hash(`${key}:${slot}`);const row=await db().prepare('INSERT INTO rates (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(k,now+period).first<{count:number}>();if((row?.count||0)>limit)fail(429,'A little too fast. Please wait a minute and try again.');if(Math.random()<.03)await db().batch([db().prepare('DELETE FROM rates WHERE expires < ?').bind(now),db().prepare('DELETE FROM challenges WHERE expires < ?').bind(now),db().prepare('DELETE FROM sessions WHERE expires < ?').bind(now)])}
export function cookieToken(req:Request){return req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('doodle_session='))?.split('=')[1]}
export async function user(req:Request){const token=cookieToken(req);if(!token)fail(401,'Connect your wallet and sign in first.');const row=await db().prepare('SELECT address FROM sessions WHERE hash=? AND expires>?').bind(hash(token!),Date.now()).first<{address:string}>();if(!row)fail(401,'Your sign-in expired. Reconnect your wallet.');return row!.address}
export function newSession(){return randomBytes(32).toString('hex')}
export function sessionCookie(req:Request,token:string,maxAge=86400){return `doodle_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${new URL(req.url).protocol==='https:'?'; Secure':''}`}
export function settings(){const network=env.SOLANA_NETWORK==='devnet'?'devnet':'mainnet-beta';const missing:string[]=[];const launchEnabled=env.LAUNCH_ENABLED==='true'&&network==='mainnet-beta'&&!missing.length;return {network,launchEnabled,launchReason:launchEnabled?'Ready for a mainnet launch review. You approve the transaction in your wallet.':missing.length?'Launch setup needs '+missing.join(', ')+'.':'Mainnet launches are paused.',launchProvider:'pump',pairs:[{symbol:'SOL',name:'Solana',enabled:true}]}}

export function response(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}})}
export function handleError(e:unknown){if(e instanceof HttpError)return response({error:e.message},e.status);if(e instanceof z.ZodError)return response({error:e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},400);console.error('Doodle request failed',e);return response({error:'The clubhouse hit a snag. Your input is still here; please try again.'},503)}
