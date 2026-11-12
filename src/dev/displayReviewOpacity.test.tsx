import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DisplayReview } from './DisplayReview';

const baseCSS=readFileSync('src/styles.css','utf8');
const pageCSS=readFileSync('src/dev/displayReview.css','utf8');
let style:HTMLStyleElement;
const flush=()=>act(async()=>{for(let n=0;n<24;n++)await Promise.resolve();});
beforeEach(()=>{
 window.history.replaceState(null,'','/?shoreVisual=candidate&loadtrace=1');
 style=document.createElement('style');
 // jsdom26 does not implement selector specificity. Compute actual opacity
 // with the real base and override sheets in cascade-priority order; the
 // CSSOM matching test below separately verifies specificity for bundle order.
 style.textContent=baseCSS+'\n'+pageCSS;document.head.append(style);
});
afterEach(()=>{cleanup();style.remove();});

describe('display-only disabled companion opacity with actual full stylesheets',()=>{
 it.each(['night','yard','shore'])('keeps the %s companion button fully opaque and effectively disabled',async scene=>{
  const view=render(<DisplayReview search={`?view=${scene}&phase=visible`}/>);await flush();
  const cat=view.getByTestId('companion') as HTMLButtonElement;
  expect(cat.tagName).toBe('BUTTON');expect(cat.matches(':disabled')).toBe(true);
  expect(getComputedStyle(cat).opacity).toBe('1');
  expect((cat.closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
  expect(getComputedStyle(view.getByTestId('walk-stage')).pointerEvents).toBe('none');
  expect(view.getByTestId('display-review').getAttribute('data-frozen')).toBe('yes');
 });

 it('does not brighten ordinary disabled companions or any other disabled button',()=>{
  const root=document.createElement('div');document.body.append(root);
  root.innerHTML='<button class="companion" disabled>normal disabled cat</button><button class="companion">normal enabled cat</button><main class="display-review-renderer"><fieldset disabled class="display-review-input-guard"><button class="path-exit">other disabled control</button></fieldset></main>';
  const normal=root.querySelector<HTMLButtonElement>('button[disabled]')!;
  const enabled=root.querySelector<HTMLButtonElement>('button.companion:not([disabled])')!;
  const other=root.querySelector<HTMLButtonElement>('.path-exit')!;
  expect(getComputedStyle(normal).opacity).toBe('0.45');expect(getComputedStyle(other).opacity).toBe('0.45');
  const enabledWithPage=getComputedStyle(enabled).opacity;
  style.textContent=baseCSS;
  expect(getComputedStyle(enabled).opacity).toBe(enabledWithPage);
  expect(getComputedStyle(normal).opacity).toBe('0.45');root.remove();
 });

 it('the real page rule matches the disabled button itself and outranks the later global disabled rule',async()=>{
  // Use the actual dedicated entry order: page CSS is bundled before base CSS.
  style.textContent=pageCSS+'\n'+baseCSS;
  const view=render(<DisplayReview search="?view=night"/>);await flush();const cat=view.getByTestId('companion');
  const matching=[...style.sheet!.cssRules].filter((r):r is CSSStyleRule=>r instanceof CSSStyleRule && !!r.style.opacity && cat.matches(r.selectorText));
  const global=matching.find(r=>r.selectorText==='button:disabled')!;
  const scoped=matching.find(r=>r!==global && r.style.opacity==='1' && r.selectorText.includes('.display-review-renderer'));
  expect(global.style.opacity).toBe('0.45');expect(scoped,'missing real page-scoped opacity rule').toBeTruthy();
  // This exact selector uses no :is/:where/ID constructs; count its class and
  // pseudo-class selectors from CSSOM, not an invented replacement stylesheet.
  const weight=(selector:string)=>(selector.match(/\.[\w-]+|:(?!:)[\w-]+|\[[^\]]+\]/g)||[]).length;
  expect(weight(scoped!.selectorText)).toBeGreaterThan(weight(global.selectorText));
  expect(cat.matches(scoped!.selectorText)).toBe(true);
  expect([...style.sheet!.cssRules].indexOf(scoped!)).toBeLessThan([...style.sheet!.cssRules].indexOf(global));
 });
});
