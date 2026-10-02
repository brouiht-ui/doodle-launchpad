import {env} from 'cloudflare:workers';
import {bucket,fail} from './server';
import type {Coin} from './types';
import {uploadPumpMetadata} from './pump-metadata';
const cidPattern=/^[a-zA-Z0-9]{32,120}$/;
async function pin(file:File){
 if(!env.PINATA_JWT)fail(503,'Public artwork hosting needs PINATA_JWT on the server.');
 const form=new FormData();form.set('file',file);form.set('network','public');
 const r=await fetch('https://uploads.pinata.cloud/v3/files',{method:'POST',headers:{Authorization:`Bearer ${env.PINATA_JWT}`},body:form,signal:AbortSignal.timeout(30000)});
 if(!r.ok)fail(503,`Artwork hosting rejected the upload (${r.status}). Check the Pinata upload permission and quota.`);
 const result=await r.json() as {data?:{cid?:string}};const cid=result.data?.cid;
 if(!cid||!cidPattern.test(cid))fail(503,'Artwork hosting returned an invalid content address.');
 return `https://ipfs.io/ipfs/${cid}`;
}
export async function publishLaunchMetadata(coin:Coin){
 const cacheKey=`launch-metadata/${coin.id}.json`;const cached=await bucket().get(cacheKey);
 if(cached)return await cached.json<{uri:string;image:string}>();
 const imageKey=coin.image.replace('/api/','');const art=await bucket().get(imageKey);
 if(!art)fail(404,'Your saved drawing was not found.');
 const file=new File([await art!.arrayBuffer()],`${coin.id}.png`,{type:'image/png'});
 if(!env.PINATA_JWT){let published;try{published=await uploadPumpMetadata(file,coin)}catch(e){fail(503,(e as Error).message)}await bucket().put(cacheKey,JSON.stringify(published),{httpMetadata:{contentType:'application/json'}});return published!;}
 const image=await pin(file);
 const metadata={name:coin.name,symbol:coin.symbol,description:coin.description,image,showName:true,createdOn:'https://pump.fun'};
 const uri=await pin(new File([JSON.stringify(metadata)],`${coin.id}.json`,{type:'application/json'}));
 const published={uri,image};await bucket().put(cacheKey,JSON.stringify(published),{httpMetadata:{contentType:'application/json'}});return published;
}
async function publicRead(url:string){
 const gateway=url.replace('https://ipfs.io/ipfs/','https://gateway.pinata.cloud/ipfs/');
 return fetch(gateway,{signal:AbortSignal.timeout(20000)});
}
export async function verifyLaunchMetadata(coin:Coin,published:{uri:string;image:string}){
 const response=await publicRead(published.uri);
 if(!response.ok)fail(503,'Your metadata is still propagating on IPFS. Wait a moment and retry; no launch has been sent.');
 const data=await response.json() as {name?:string;symbol?:string;image?:string};
 if(data.name!==coin.name||data.symbol!==coin.symbol||data.image!==published.image)fail(503,'Public metadata does not match your saved character.');
 const image=await publicRead(published.image);
 if(!image.ok||!image.headers.get('content-type')?.startsWith('image/'))fail(503,'Your public artwork is not readable yet. Retry in a moment.');
 await image.body?.cancel();
}
