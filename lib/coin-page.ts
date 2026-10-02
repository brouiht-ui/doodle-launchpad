import {z} from 'zod';
import {drawingSchema,emptyDrawing} from './drawing';
export const pageColors=['#fffdf5','#fff4bd','#fce4ee','#e5edff','#e6f5df','#eee5ff'] as const;
export const coinPageSchema=z.object({
 title:z.string().trim().max(80),
 story:z.string().trim().max(2000),
 color:z.enum(pageColors),
 drawing:drawingSchema,
 revision:z.number().int().min(0),
}).strict();
export type CoinPageContent=z.infer<typeof coinPageSchema>;
export const blankCoinPage=():CoinPageContent=>({title:'welcome to my little corner.',story:'',color:pageColors[0],drawing:emptyDrawing(),revision:0});
