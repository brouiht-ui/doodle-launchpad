import {z} from 'zod';
export const pointSchema=z.tuple([z.number().finite().min(0).max(639),z.number().finite().min(0).max(639)]);
export const drawingSchema=z.object({version:z.literal(1),strokes:z.array(z.object({tool:z.enum(['pen','eraser','fill']),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),size:z.number().int().min(2).max(35),points:z.array(pointSchema).min(1).max(3000)}).strict()).max(250)}).strict().superRefine((d,ctx)=>{if(d.strokes.reduce((n,s)=>n+s.points.length,0)>12000)ctx.addIssue({code:'custom',message:'Drawing has too many points.'});if(d.strokes.filter(s=>s.tool==='fill').length>25)ctx.addIssue({code:'custom',message:'Drawing has too many fill operations.'});let length=0;for(const s of d.strokes)for(let i=1;i<s.points.length;i++)length+=Math.hypot(s.points[i][0]-s.points[i-1][0],s.points[i][1]-s.points[i-1][1]);if(length>60000)ctx.addIssue({code:'custom',message:'Drawing is too complex for this canvas.'})});
export type Drawing=z.infer<typeof drawingSchema>;
export type Stroke=Drawing['strokes'][number];
export const emptyDrawing=():Drawing=>({version:1,strokes:[]});
export function renderDrawing(drawing:Drawing):Uint8ClampedArray{
 const pixels=new Uint8ClampedArray(640*640*4);pixels.fill(255);
 for(const stroke of drawing.strokes){const color=stroke.tool==='eraser'?'#ffffff':stroke.color;const rgb=[parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16)];
  if(stroke.tool==='fill'){const [x,y]=stroke.points[0].map(Math.floor),start=y*640+x,t=Array.from(pixels.slice(start*4,start*4+3));if(t.every((n,k)=>n===rgb[k]))continue;const queue=new Int32Array(640*640),seen=new Uint8Array(640*640);let head=0,tail=1;queue[0]=start;seen[start]=1;while(head<tail){const q=queue[head++],at=q*4;if(!t.every((n,k)=>n===pixels[at+k]))continue;rgb.forEach((n,k)=>pixels[at+k]=n);const neighbours=[q-640,q+640,...(q%640>0?[q-1]:[]),...(q%640<639?[q+1]:[])];for(const next of neighbours)if(next>=0&&next<640*640&&!seen[next]){seen[next]=1;queue[tail++]=next}}continue}
  const radius=stroke.size/2,r2=radius*radius;
  const stamp=(x:number,y:number)=>{for(let py=Math.max(0,Math.floor(y-radius));py<=Math.min(639,Math.ceil(y+radius));py++)for(let px=Math.max(0,Math.floor(x-radius));px<=Math.min(639,Math.ceil(x+radius));px++){if((px-x)**2+(py-y)**2>r2)continue;const at=(py*640+px)*4;pixels[at]=rgb[0];pixels[at+1]=rgb[1];pixels[at+2]=rgb[2]}};
  stamp(...stroke.points[0]);for(let i=1;i<stroke.points.length;i++){const a=stroke.points[i-1],b=stroke.points[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/Math.max(1,radius/2)));for(let j=1;j<=steps;j++)stamp(a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps)}
 }
 return pixels;
}
export function validateEffort(drawing:Drawing,pixels:Uint8ClampedArray){const pen=drawing.strokes.filter(s=>s.tool==='pen'&&s.color.toLowerCase()!=='#ffffff');let distance=0;for(const s of pen)for(let i=1;i<s.points.length;i++)distance+=Math.hypot(s.points[i][0]-s.points[i-1][0],s.points[i][1]-s.points[i-1][1]);let ink=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<245||pixels[i+1]<245||pixels[i+2]<245)ink++;if(pen.length<3||distance<120||ink<200)throw new Error('Give your little guy a few more lines. Use at least 3 pencil strokes and leave a visible drawing.');}
