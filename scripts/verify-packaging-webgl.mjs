// Run only with acceptance_browser.py's fresh isolated schema on loopback 8099.
// The credential file is ephemeral harness output, never application credentials.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const credentialPath = process.argv[2];
assert.match(credentialPath ?? '', /^\/tmp\/yieldloop-acceptance-[\w-]+\.json$/);
const account = JSON.parse(await fs.readFile(credentialPath, 'utf8')).manager;
assert.match(account.username, /^acceptance_manager_/);
const target = (await (await fetch('http://127.0.0.1:9333/json/list')).json()).find(t => t.type === 'page');
assert(target);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const m = JSON.parse(event.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject, timeout } = pending.get(m.id);
    clearTimeout(timeout); pending.delete(m.id);
    if (m.error) reject(new Error(m.error.message)); else resolve(m.result);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 20000);
  pending.set(id, { resolve, reject, timeout });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  assert(!r.exceptionDetails, 'Browser evaluation failed');
  return r.result.value;
};
const pause = ms => new Promise(r => setTimeout(r, ms));
const wait = async expression => {
  for (let i = 0; i < 40; i++) { if (await evaluate(expression)) return; await pause(250); }
  throw new Error(`Condition not met: ${expression}`);
};
const selector = id => `[data-testid="${id}"]`;
const input = async (id, value) => {
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector(id))}); HTMLInputElement.prototype.__lookupSetter__('value').call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await pause(100);
};
const click = async id => {
  await wait(`!!document.querySelector(${JSON.stringify(selector(id))}) && !document.querySelector(${JSON.stringify(selector(id))}).disabled`);
  await evaluate(`document.querySelector(${JSON.stringify(selector(id))}).click()`);
  await pause(500);
};
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:8099/' });
await wait("document.readyState==='complete' && location.port==='8099'");
const gl = await evaluate(`(()=>{const g=document.createElement('canvas').getContext('webgl2');if(!g)return {available:false};const e=g.getExtension('WEBGL_debug_renderer_info');return {available:true,renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)};})()`);
console.log('Renderer:', JSON.stringify(gl));
assert(gl.available, 'WebGL unavailable; no visual pass');
const login = await evaluate(`(async()=>{const c=await(await fetch('/api/v1/auth/csrf')).json();const r=await fetch('/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':c.csrfToken},body:JSON.stringify(${JSON.stringify({ username: account.username, password: account.password })})});return r.status;})()`);
assert.equal(login, 200);
assert.equal(await evaluate("(async()=> (await (await fetch('/api/v1/packaging/designs')).json()).count)()"), 0, 'Use a fresh harness schema');
await send('Page.navigate', { url: 'http://localhost:8099/packaging' });
await wait(`!!document.querySelector('${selector('input-length')}')`);
for (const [id, value] of Object.entries({ name: 'WebGL acceptance tray', length: '200', width: '120', height: '60', thickness: '2' })) await input(`input-${id}`, value);
await wait("!!document.querySelector('canvas')");
await fs.mkdir('generated-artifacts/webgl-acceptance', { recursive: true });
const capture = async name => {
  await evaluate("document.querySelector('canvas').scrollIntoView({block:'center'})");
  await pause(1500);
  const clip = await evaluate("(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};})()");
  assert(clip.width > 100 && clip.height > 100);
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip });
  await fs.writeFile(`generated-artifacts/webgl-acceptance/${name}.png`, Buffer.from(data, 'base64'));
};
await capture('before-200');
await click('button-validate');
await input('input-save-reason', 'Initial isolated visual verification');
await click('button-save');
await wait("(async()=> (await (await fetch('/api/v1/packaging/designs')).json()).results[0]?.revision===1)()");
await input('input-length', '300');
await capture('after-live-300');
await click('button-validate');
await input('input-save-reason', 'Dimension change verified visually');
await click('button-save');
await wait("(async()=> (await (await fetch('/api/v1/packaging/designs')).json()).results[0]?.revision===2)()");
const saved = await evaluate("(async()=> (await (await fetch('/api/v1/packaging/designs')).json()).results[0])()");
assert.equal(saved.design.parameters.length, '300');
await send('Page.navigate', { url: 'http://localhost:8099/packaging' });
await click(`button-open-${saved.id}`);
assert.equal(await evaluate(`document.querySelector('${selector('input-length')}').value`), '300');
await capture('reopened-revision-2');
const history = await evaluate(`(async()=>await(await fetch('/api/v1/packaging/designs/${saved.id}/history')).json())()`);
assert.equal(history.results[0].revision, 2);
assert.equal(history.results[1].revision, 1);
const result = { renderer: gl, saved, history, screenshots: ['before-200', 'after-live-300', 'reopened-revision-2'] };
await fs.writeFile('generated-artifacts/webgl-acceptance/evidence.json', JSON.stringify(result, null, 2));
console.log('PASS: length 200 → 300, revisions 1 → 2, reopened 300. Screenshots require visual inspection.');
socket.close();
