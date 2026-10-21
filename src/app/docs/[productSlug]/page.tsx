import {redirect,notFound} from 'next/navigation';
import {getStore} from '@/lib/dataStore';
import {productHref} from '@/lib/projectModel';
export const dynamic='force-dynamic';
export default async function LegacyProduct({params}:{params:{productSlug:string}}){const store=await getStore();const alias=store.legacyProjectAliases?.[params.productSlug];const project=store.projects?.find(p=>p.id===alias?.projectId);const product=project?.products?.find(p=>p.id===alias?.productId);if(!project||!product)notFound();redirect(productHref(project,product));}
