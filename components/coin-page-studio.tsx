'use client';
import {useEffect,useRef,useState} from 'react';
import {Paint} from './paint';
import {renderDrawing} from '@/lib/drawing';
import {blankCoinPage,pageColors,type CoinPageContent} from '@/lib/coin-page';
export function CoinPageStudio({coinId,isOwner}:{coinId:string;isOwner:boolean}){
 const [page,setPage]=useState<CoinPageContent|null>(null),[draft,setDraft]=useState(blankCoinPage),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null);
 async function load(){setError('');try{const r=await fetch(`/api/coins/${coinId}/page`);const d=await r.json() as {page:CoinPageContent;error?:string};if(!r.ok)throw new Error(d.error);setPage(d.page)}catch(e){setError((e as Error).message)}}
 useEffect(()=>{load()},[coinId]);
 useEffect(()=>{if(!isOwner)setEditing(false)},[isOwner]);
 useEffect(()=>{if(!page||editing||!canvas.current)return;const image=new ImageData(640,640);image.data.set(renderDrawing(page.drawing));canvas.current.getContext('2d')!.putImageData(image,0,0)},[page,editing]);
 async function save(){setBusy(true);setError('');try{const r=await fetch(`/api/coins/${coinId}/page`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});const d=await r.json() as {page:CoinPageContent;error?:string};if(!r.ok){if(r.status===409){const latest=await fetch(`/api/coins/${coinId}/page`);if(latest.ok){const data=await latest.json() as {page:CoinPageContent};setPage(data.page)}}throw new Error(d.error)}setPage(d.page);setEditing(false);setNotice('Your page is saved. Everyone can see it.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="creator-page" style={{background:(editing?draft:page)?.color||pageColors[0]}} aria-label="Creator's custom page">
 <div className="section-heading"><span className="eyebrow">A LITTLE WORLD, MADE BY THE CREATOR</span>{isOwner&&!editing&&page&&<button className="small-button" onClick={()=>{setDraft(structuredClone(page));setEditing(true);setNotice('')}}>✎ customize my page</button>}</div>
 {error&&<p role="alert" className="inline-error">{error} {!page&&<button onClick={load}>retry</button>}</p>}
 {notice&&<p role="status">{notice}</p>}
 {!page&&!error&&<p>opening the sketchbook…</p>}
 {editing&&isOwner?<><div className="page-editor-fields"><label>page headline<input maxLength={80} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>the story, the lore, the very important nonsense<textarea rows={5} maxLength={2000} value={draft.story} onChange={e=>setDraft({...draft,story:e.target.value})}/></label><fieldset><legend>pick your paper</legend><div className="swatches">{pageColors.map((color,i)=><button type="button" key={color} aria-label={`Paper color ${i+1}`} aria-pressed={draft.color===color} className={draft.color===color?'active':''} style={{background:color}} onClick={()=>setDraft({...draft,color})}/>)}</div></fieldset></div><div className="page-drawing-editor"><Paint initial={draft.drawing} onChange={drawing=>setDraft(v=>({...v,drawing}))} onDone={drawing=>{setDraft(v=>({...v,drawing}));setNotice('Drawing ready. Save your page below to publish it.')}} doneLabel="done drawing" doneHint="save your page below when you’re happy."/></div><div className="detail-actions"><button className="primary" disabled={busy} onClick={save}>{busy?'saving…':'save my page'}</button><button className="small-button" disabled={busy} onClick={()=>{setEditing(false);setError('');setNotice('')}}>cancel changes</button></div><p className="field-help">Only your creator wallet can edit this page. Changes appear here when you save.</p></>:page&&<><h2>{page.title||'a little world of its own.'}</h2>{page.story&&<p className="creator-story">{page.story}</p>}{page.drawing.strokes.length>0?<canvas className="creator-drawing" ref={canvas} width={640} height={640} role="img" aria-label="Hand-drawn artwork by this coin’s creator"/>:<p className="hand">{isOwner?'Your wall is a blank canvas. Make it yours.':'The creator hasn’t decorated this corner yet.'}</p>}</>}
 </section>
}
