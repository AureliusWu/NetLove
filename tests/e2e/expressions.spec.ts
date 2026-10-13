import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {replay} from '../../src/game/engine';
import {encodeSave} from '../../src/game/storage';
test('six expressions for both characters remain available offline',async({page,context},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.getByRole('button',{name:'角色',exact:true}).click();
  for(const name of ['谢听禾','许弥']){
    const card=page.locator('.character-card').filter({has:page.getByRole('heading',{name,exact:true})});
    for(const expression of ['平静','微笑','惊讶','担忧','委屈','害羞']){
      await card.getByRole('button',{name:expression,exact:true}).click();
      await expect(card.getByRole('img',{name:`${name} · ${expression}`,exact:true})).toBeVisible();
      await expect(card.locator('.expression-atlas')).toHaveJSProperty('naturalWidth',1254);
    }
  }
  await mkdir('test-results/previews',{recursive:true});await page.screenshot({path:`test-results/previews/expressions-${info.project.name}.png`});
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'角色',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0))).toBe(true);expect(errors).toEqual([]);
});
test('old paragraph saves restore expression through narration, hiding and rotation',async({page},info)=>{
  const state=replay([{sceneId:'first-reply',choiceId:'first-reply-1'},{sceneId:'c2-open',choiceId:'c2-open-1'},{sceneId:'c2-call',choiceId:'c2-call-1'}],'c2-camera',6);
  const save=encodeSave(state);save.state.history=save.state.history.map(({expression:_expression,...line})=>line);
  await page.addInitScript(raw=>{if(!localStorage.getItem('netlove:v1:save:auto'))localStorage.setItem('netlove:v1:save:auto',raw);localStorage.setItem('netlove:v1:settings',JSON.stringify({textSpeed:0,music:false,reducedMotion:true}));},JSON.stringify(save));
  await page.goto('/');await page.getByRole('button',{name:'继续上次的故事',exact:true}).click();
  await expect(page.locator('.scene-character')).toHaveAttribute('data-expression','surprised');
  await page.getByRole('button',{name:'隐藏界面',exact:true}).click();await page.getByRole('button',{name:'恢复阅读界面',exact:true}).click();
  for(const size of [{width:568,height:320},{width:844,height:390},{width:412,height:915}]){await page.setViewportSize(size);await expect(page.locator('.game-screen')).toHaveAttribute('data-line','6');await expect(page.locator('.scene-character')).toHaveAttribute('data-expression','surprised');}
  await page.reload();await page.getByRole('button',{name:'继续上次的故事',exact:true}).click();await expect(page.locator('.scene-character')).toHaveAttribute('data-expression','surprised');
  await expect(page.locator('.toast.visible')).toHaveCount(0);await mkdir('test-results/previews',{recursive:true});await page.screenshot({path:`test-results/previews/expression-save-${info.project.name}.png`});
});
