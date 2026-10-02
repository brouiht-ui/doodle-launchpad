// Only server-rendered canvas images enter this upload flow.
export async function uploadPumpMetadata(file:File,coin:{name:string;symbol:string;description:string}){
 const form=new FormData();form.set('file',file);form.set('name',coin.name);form.set('symbol',coin.symbol);form.set('description',coin.description);form.set('showName','true');
 const response=await fetch('https://pump.fun/api/ipfs',{method:'POST',body:form,signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(`Artwork upload is unavailable (${response.status}). Your drawing is saved; retry shortly.`);
 const data=await response.json() as {metadataUri?:string;metadata?:{image?:string}};
 const normalize=(value:unknown)=>{if(typeof value!=='string')throw new Error('Artwork upload returned no public address.');const match=value.match(/^(?:https:\/\/[^/]+\/ipfs\/|ipfs:\/\/)([a-zA-Z0-9]{32,120})$/);if(!match)throw new Error('Artwork upload returned an invalid content address.');return `https://ipfs.io/ipfs/${match[1]}`};
 return {uri:normalize(data.metadataUri).replace('https://ipfs.io/','https://gateway.pinata.cloud/'),image:normalize(data.metadata?.image)};
}
