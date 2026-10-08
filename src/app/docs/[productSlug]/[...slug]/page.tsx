import {redirect,notFound} from 'next/navigation';
import {getStore} from '@/lib/dataStore';
import {publishedHref} from '@/lib/projectModel';
export const dynamic='force-dynamic';
export default function LegacyDoc({params}:{params:{productSlug:string;slug:string[]}}){const store=getStore();const doc=store.docs[`${params.productSlug}/${params.slug.join('/')}`] || store.docs[`${params.productSlug}/${params.slug[params.slug.length-1]}`];if(!doc||doc.status!=='published')notFound();const href=publishedHref(store.projects||[],doc);if(!href)notFound();redirect(href);}
