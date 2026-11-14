import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('demo supports task creation, local saving, review, undo and calendar views',async()=>{
  const dom=new JSDOM(await readFile(new URL('../public/index.html',import.meta.url),'utf8'),{url:'https://demo.example/'});
  const {window}=dom;const document=window.document;
  Object.assign(globalThis,{document,localStorage:window.localStorage,matchMedia:()=>({matches:false}),confirm:()=>true});
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  window.HTMLElement.prototype.scrollIntoView=function(){};
  const realTimeout=globalThis.setTimeout;
  globalThis.setTimeout=(fn,ms,...args)=>{const timer=realTimeout(fn,ms,...args);timer.unref?.();return timer;};
  try{
    await import('../public/app.js');
    const click=selector=>{const element=document.querySelector(selector);assert.ok(element,selector);element.click();};
    assert.equal(document.querySelectorAll('.day-column').length,7);
    click('#new-task');assert.equal(document.querySelector('#task-dialog').open,true);
    assert.equal(document.querySelector('#task-options').open,false);
    assert.equal(document.querySelector('#task-time').value,'');
    document.querySelector('#task-title').value='Synthetic QA task';
    document.querySelector('#task-date').value='2026-11-16';
    document.querySelector('#task-owner').value='code';
    document.querySelector('#task-status').value='review';
    document.querySelector('#task-result').value='Synthetic result ready for review.';
    document.querySelector('#task-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
    let saved=JSON.parse(localStorage.getItem('relay-planner-demo-v1'));
    const created=saved.find(t=>t.title==='Synthetic QA task');assert.ok(created);assert.equal(created.owner,'code');
    assert.equal(document.querySelector('#task-dialog').open,false);
    click('[data-page="review"]');
    assert.equal(document.querySelector('#review-page').hidden,false);
    click(`[data-approve="${created.id}"]`);
    saved=JSON.parse(localStorage.getItem('relay-planner-demo-v1'));
    assert.equal(saved.find(t=>t.id===created.id).status,'done');
    click('#undo');
    assert.equal(JSON.parse(localStorage.getItem('relay-planner-demo-v1')).find(t=>t.id===created.id).status,'review');
    click(`[data-return="${created.id}"]`);
    assert.equal(JSON.parse(localStorage.getItem('relay-planner-demo-v1')).find(t=>t.id===created.id).status,'planned');
    click('[data-page="calendar"]');click('[data-view="month"]');
    assert.equal(document.querySelectorAll('.month-cell').length,42);
    click('.month-cell .day-number');
    assert.ok(document.querySelector('.agenda-strip'));assert.ok(document.querySelector('.agenda-list'));
    click('#add-idea');document.querySelector('#task-title').value='Queued synthetic idea';
    document.querySelector('#task-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
    assert.ok([...document.querySelectorAll('.queue-task')].some(t=>t.textContent.includes('Queued synthetic idea')));
    assert.equal(JSON.parse(localStorage.getItem('relay-planner-demo-v1')).find(t=>t.title==='Queued synthetic idea').date,'');
    click('#new-task');document.querySelector('#task-title').value='Title-only quick capture';click('[data-quick-date=tomorrow]');
    const chosenDate=document.querySelector('#task-date').value;assert.ok(chosenDate);
    document.querySelector('#task-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
    const quick=JSON.parse(localStorage.getItem('relay-planner-demo-v1')).find(t=>t.title==='Title-only quick capture');
    assert.equal(quick.date,chosenDate);assert.equal(quick.time,'');assert.equal(quick.owner,'human');assert.equal(quick.status,'planned');
  }finally{globalThis.setTimeout=realTimeout;dom.window.close();}
});

test('cloud schedule saves only through the account API and rolls back failed writes',async()=>{
  const dom=new JSDOM(await readFile(new URL('../public/index.html',import.meta.url),'utf8'),{url:'https://demo.example/'});
  const {window}=dom;const document=window.document;const wrapper=document.createElement('div');wrapper.id='workspace';document.body.append(wrapper);
  Object.assign(globalThis,{document,localStorage:window.localStorage,matchMedia:()=>({matches:false}),confirm:()=>true});
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  window.HTMLElement.prototype.scrollIntoView=function(){};
  const realTimeout=globalThis.setTimeout;
  globalThis.setTimeout=(fn,ms,...args)=>{const timer=realTimeout(fn,ms,...args);timer.unref?.();return timer;};
  try{
    globalThis.relaySession={tasks:[],save:async rows=>{globalThis.cloudSaved=structuredClone(rows);}};
    await import('../public/app.js?cloud-test');
    const click=selector=>{const element=document.querySelector(selector);assert.ok(element,selector);element.click();};
    assert.equal(document.querySelectorAll('.day-column').length,7);
    click('#new-task');assert.equal(document.querySelector('#task-dialog').open,true);
    document.querySelector('#task-title').value='Synthetic QA task';
    document.querySelector('#task-date').value='2026-11-16';
    document.querySelector('#task-owner').value='code';
    document.querySelector('#task-status').value='review';
    document.querySelector('#task-result').value='Synthetic result ready for review.';
    document.querySelector('#task-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(globalThis.cloudSaved[0].title,'Synthetic QA task');
    assert.equal(localStorage.getItem('relay-planner-demo-v1'),null);
    globalThis.relaySession.save=async()=>{throw Error('This schedule changed on another device.');};
    click('#new-task');document.querySelector('#task-title').value='Must not save';
    document.querySelector('#task-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
    await new Promise(resolve=>setImmediate(resolve));
    assert.ok(!document.querySelector('#calendar').textContent.includes('Must not save'));
    assert.ok(document.querySelector('#toast-message').textContent.includes('another device'));
  }finally{globalThis.setTimeout=realTimeout;delete globalThis.relaySession;delete globalThis.cloudSaved;dom.window.close();}
});
