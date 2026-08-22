const urls=['/','/configurateur-pc','/composants/cartes-graphiques','/composants/refroidissement','/ecrans',
'/produit/processeur-amd-ryzen-7-7800x3d','/produit/kit-memoire-corsair-vengeance-rgb-32-go-2-16-ddr5-6000-mhz',
'/produit/alimentation-be-quiet-system-power-10-650-w-80-bronze'];
// wait for the new build to land: poll the homepage title until it changes
const OLD='Rgi Service — PC Gamer, composants et configurateur PC au Maroc';
for(let i=0;i<40;i++){
  const h=await (await fetch('https://rgi-service.vercel.app/',{cache:'no-store'})).text();
  const t=(h.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]??'').trim();
  if(t!==OLD){console.log('new build live after',i*10,'s\n');break;}
  await new Promise(r=>setTimeout(r,10000));
}
let over=0,noog=0,nolc=0;
for(const u of urls){
  const h=await (await fetch('https://rgi-service.vercel.app'+u,{cache:'no-store'})).text();
  const head=h.slice(0,h.indexOf('</head>')+7);
  const g=re=>(head.match(re)?.[1]??'').trim();
  const t=g(/<title[^>]*>([^<]*)<\/title>/i).replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&');
  const og=g(/<meta property="og:image" content="([^"]*)"/i);
  const lc=g(/<meta property="og:locale" content="([^"]*)"/i);
  if(t.length>60)over++; if(!og)noog++; if(!lc)nolc++;
  console.log(String(t.length).padStart(3), og?'og✓':'og✗', lc?'lc✓':'lc✗', t);
}
console.log('\nover-60:',over,'| missing og:image:',noog,'| missing og:locale:',nolc);
