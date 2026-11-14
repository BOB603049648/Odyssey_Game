import { signalAtBridge } from './bridge-journey.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-smoke');
await mkdir(output, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox'],proxy});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
async function pointer(el){
 const b=await el.boundingBox();if(!b)throw new Error('No pointer target');const vp=page.viewportSize();
 const x=(Math.max(1,b.x)+Math.min(vp.width-1,b.x+b.width))/2, y=(Math.max(1,b.y)+Math.min(vp.height-1,b.y+b.height))/2;
 // Let Playwright wait for the camera/element to settle and check hit testing.
 // A screen coordinate measured during the scene transition becomes stale.
 await el.click({position:{x:x-b.x,y:y-b.y}});
}
const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('odyssey.save.v1')));
async function closeSheet(){if(['casefile','lexicon','settings'].includes((await save()).overlay))await page.getByRole('button',{name:'合上',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});}
async function ready(){await page.locator('.scene-display').waitFor({state:'hidden'});}
async function spot(id){await closeSheet();await ready();const el=page.getByTestId(id);if(await el.getAttribute('data-reach')!=='near'){await pointer(el);await page.waitForFunction(id=>document.querySelector(`[data-testid="${id}"]`)?.dataset.reach==='near',id);}await page.waitForFunction(()=>document.querySelector('[data-testid="traveler"]')?.dataset.moving==='no');await page.waitForTimeout(200);await pointer(el);console.log('spot',id);}
async function gate(to){
 await closeSheet();await ready();
 // Select the public route and let the traveler approach its actual doorway.
 // Holding a direction against an unrelated piece of the scene edge is not travel.
 if(!await page.locator('.route-panel').count())await page.getByRole('button',{name:'路线',exact:true}).click();
 await page.getByTestId(`route-${to}`).click();
 await page.waitForFunction(to=>document.querySelector('[data-testid="walk-stage"]')?.dataset.scene===`dba.scene.${to}`,to);
 await ready();console.log('scene',to);
}

try{
await page.goto(url);await page.getByRole('button',{name:'新游戏',exact:true}).click();
for(let i=0;i<3;i++)await page.getByRole('button',{name:'下一幕',exact:true}).click();
await page.getByRole('button',{name:'走上潮线',exact:true}).click();await ready();
await page.screenshot({path:resolve(output, 'play-shore.png')});
await spot('shore-driftwood');
await spot('island-mural');
for(let band=0;band<4;band++){
await page.getByRole('tab',{name:`壁画带 ${band+1}`,exact:true}).click();
while(await page.locator('.glyph-wall button[data-testid^="cell-"]').count()){
 const id=(await page.locator('.glyph-wall button[data-testid^="cell-"]').first().getAttribute('data-testid')).slice(5);
 await page.getByTestId(`cell-${id}`).click();await page.getByTestId(`object-${id}`).click();
}
}
assert.equal(Object.values((await save()).words).filter(w=>w.state==='learned').length,28);
console.log('learned 28 words');
await page.getByRole('button',{name:'返回',exact:true}).click();await spot('island-gourd');
assert.equal((await save()).flags['dba.puzzle.water'],'carried');
await spot('water-spring');assert.equal((await save()).flags['dba.puzzle.water'],'filled');
assert.notEqual((await save()).beats['dba.beat.water'],true);await spot('island-gourd');
assert.equal((await save()).beats['dba.beat.water'],true);
await gate('camp');await spot('camp-sleep');await page.waitForFunction(()=>document.querySelector('[data-testid="walk-stage"]')?.dataset.resting==='yes');await page.waitForFunction(()=>document.querySelector('[data-testid="walk-stage"]')?.dataset.resting==='no');
assert.equal((await save()).beats['dba.beat.sleep'],true);
await gate('yard');await spot('amount-more');assert.equal((await save()).beats['dba.beat.amount'],true);assert.equal(await page.getByTestId('amount-more').getAttribute('data-result'),'ok');
await spot('amount-less');assert.equal((await save()).feedback.spot,'act:dba.word.amount:less');assert.equal((await save()).feedback.kind,'no');
await page.screenshot({path:resolve(output, 'play-yard.png')});
await spot('yard-grab');await spot('yard-grab');await spot('yard-grab');
await page.getByRole('dialog',{name:'分一份晚餐',exact:true}).waitFor();
for(let i=0;i<2;i++)await page.getByRole('button',{name:'移一份给同行者',exact:true}).click();
assert.equal(await page.getByTestId('food-self-bowl').getAttribute('data-count'),'2');
assert.equal(await page.getByTestId('food-companion-bowl').getAttribute('data-count'),'2');
await page.getByRole('button',{name:'回到前坪',exact:true}).click();
await spot('yard-give');assert.equal((await save()).beats['dba.beat.food'],true);
await gate('path');await spot('path-stop');await signalAtBridge(page);assert.notEqual((await save()).beats['dba.beat.danger'],true);
await gate('yard');assert.equal((await save()).beats['dba.beat.danger'],true);await gate('camp');await gate('night');await spot('night-read');assert.ok((await save()).evidence.includes('dba.ev.main'));
await gate('camp');await gate('shore');await gate('hall');await spot('hall-stamps');await spot('hall-tattoo');
assert.ok((await save()).inventory.includes('dba.item.token'));assert.ok((await save()).evidence.includes('dba.ev.b'));
await gate('shore');await spot('shore-depart');await page.getByTestId('depart-plate').waitFor();
for(let i=0;i<3;i++)await page.getByRole('button',{name:'下一幕',exact:true}).click();
await page.getByRole('button',{name:'合上',exact:true}).click();
await page.getByTestId('chapter-complete').waitFor();
await page.screenshot({path:resolve(output, 'chapter-complete.png')});
await page.getByRole('button',{name:'留在岛上探索',exact:true}).click();
assert.equal((await save()).flags['v01.completion-seen'],true);
assert.equal((await save()).beats['dba.beat.depart'],true);assert.ok((await save()).chart.includes('chart.jgw'));
await page.reload();await page.getByRole('button',{name:'继续',exact:true}).click();await ready();assert.equal((await save()).beats['dba.beat.depart'],true);
assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',errors,beats:(await save()).beats,evidence:(await save()).evidence}));
}catch(e){await page.screenshot({path:resolve(output, 'play-failure.png')});console.error(e);console.log('state',await save());process.exitCode=1;}finally{await browser.close();}
