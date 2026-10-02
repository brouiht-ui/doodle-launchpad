import Doodle from '@/components/doodle';
export default async function CoinPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <Doodle initialCoinId={id}/>;
}
