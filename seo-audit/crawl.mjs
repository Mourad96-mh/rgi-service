import fs from 'fs';
// Target site. rgiservice.ma is the decided final domain, but its DNS still points at
// HeberJahiz parking — until it is aimed at Vercel, audit the live build and pass
// SITE=https://rgiservice.ma once the cutover is done.
const BASE = process.env.SITE ?? 'https://rgi-service.vercel.app';
const urls = fs.readFileSync('urls.txt','utf8').trim().split('\n');
const out = [];
for (const u of urls) {
  try {
    const r = await fetch(u, { redirect:'follow' });
    const h = await r.text();
    const head = h.slice(0, h.indexOf('</head>') + 7);
    // Measure what Google measures: `32&quot;` is one character on the SERP, not six.
    // Without this, entity-bearing titles are reported over budget when they are not.
    const decode = (t) => t.replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'")
      .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
    const g = (re) => decode((head.match(re)?.[1] ?? '').trim());
    const title = g(/<title[^>]*>([^<]*)<\/title>/i);
    const desc  = g(/<meta name="description" content="([^"]*)"/i);
    const canon = g(/<link rel="canonical" href="([^"]*)"/i);
    const ogimg = g(/<meta property="og:image" content="([^"]*)"/i);
    const oglc  = g(/<meta property="og:locale" content="([^"]*)"/i);
    const robots= g(/<meta name="robots" content="([^"]*)"/i);
    const h1s = [...h.matchAll(/<h1[^>]*>/gi)].length;
    const ld = [...h.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
      .flatMap(m => { try { const j=JSON.parse(m[1]); const a=j['@graph']??[j];
        return (Array.isArray(a)?a:[a]).map(n=>n['@type']); } catch { return ['PARSE_ERR']; } });
    out.push({ u:u.replace(BASE,''), s:r.status,
      tl:title.length, dl:desc.length, h1s, canon:canon?1:0, og:ogimg?1:0,
      lc:oglc, robots, ld:[...new Set(ld.flat())].join('+'), title, desc });
  } catch(e) { out.push({ u, s:'ERR', err:String(e).slice(0,60) }); }
}
fs.writeFileSync('crawl.json', JSON.stringify(out,null,1));
console.log('crawled', out.length);
