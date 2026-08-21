/** Drive the live mobile nav at phone width and report what actually happens. */
import WebSocket from 'ws';
const CDP = 'http://localhost:9333';
const URL_ = process.argv[2] ?? 'https://rgi-service.vercel.app/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await (await fetch(`${CDP}/json/list`)).json();
const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.on('open', r));
let id = 0;
const pend = new Map();
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.id && pend.has(m.id)) {
    const { resolve, reject } = pend.get(m.id);
    pend.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    pend.set(i, { resolve: res, reject: rej });
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error(method + ' timeout')); } }, 30000);
  });

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 390, height: 844, deviceScaleFactor: 3, mobile: true,
});
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

const ev = async (expr) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression: expr, awaitPromise: true, returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
};

await send('Page.navigate', { url: URL_ });
await sleep(6000);

const report = {};

report.burgerVisible = await ev(`(() => {
  const b = [...document.querySelectorAll('button[aria-label]')].find(x => /menu/i.test(x.getAttribute('aria-label')));
  if (!b) return 'NO BURGER FOUND';
  const r = b.getBoundingClientRect();
  const cs = getComputedStyle(b);
  return JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height), display: cs.display, expanded: b.getAttribute('aria-expanded') });
})()`);

// open it
await ev(`(() => {
  const b = [...document.querySelectorAll('button[aria-label]')].find(x => /menu/i.test(x.getAttribute('aria-label')));
  b.click(); return true;
})()`);
await sleep(1200);

report.afterOpen = await ev(`(() => {
  const nav = document.querySelector('nav.absolute') || [...document.querySelectorAll('nav')].find(n => getComputedStyle(n).position === 'absolute');
  const b = [...document.querySelectorAll('button[aria-label]')].find(x => /menu/i.test(x.getAttribute('aria-label')));
  const closeBtns = [...document.querySelectorAll('button[aria-label]')].filter(x => /fermer|close/i.test(x.getAttribute('aria-label')));
  const r = nav ? nav.getBoundingClientRect() : null;
  return JSON.stringify({
    drawerPresent: !!nav,
    drawerRect: r ? { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) } : null,
    viewportW: innerWidth,
    backdropStripPx: r ? Math.round(r.x) : null,
    visibleCloseButtons: closeBtns.length,
    bodyOverflow: document.body.style.overflow,
    ariaExpanded: b ? b.getAttribute('aria-expanded') : null,
    linkCount: nav ? nav.querySelectorAll('a').length : 0,
    drawerScrollable: nav ? nav.scrollHeight > nav.clientHeight : null,
    scrollHeight: nav ? nav.scrollHeight : null,
    clientHeight: nav ? nav.clientHeight : null,
  });
})()`);

// does Escape close it?
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await sleep(800);
report.escapeCloses = await ev(`document.querySelectorAll('nav').length > 1 ? 'STILL OPEN' : 'closed'`);

ws.close();
for (const [k, v] of Object.entries(report)) console.log(k.padEnd(16), v);
