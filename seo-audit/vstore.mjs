// Target site. rgiservice.ma is the decided final domain, but its DNS still points at
// HeberJahiz parking — until it is aimed at Vercel, audit the live build and pass
// SITE=https://rgiservice.ma once the cutover is done.
const BASE = process.env.SITE ?? 'https://rgi-service.vercel.app';
for (let i=0;i<40;i++){
  const h = await (await fetch(BASE + '/',{cache:'no-store'})).text();
  const m = [...h.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  const g = JSON.parse(m[0][1])['@graph'];
  const store = g.find(n=>n['@type']==='ComputerStore');
  if (store){ console.log('live after', i*10, 's\n'); console.log(JSON.stringify(store,null,1)); 
              console.log('\ngraph types:', g.map(n=>n['@type']).join(' + ')); break; }
  await new Promise(r=>setTimeout(r,10000));
}
