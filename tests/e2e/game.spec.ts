import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import story from '../../src/story/story.json' with { type: 'json' };
const key='netlove:v1';
const decisions=[
{sceneId:'first-reply',choiceId:'first-reply-1'},
{sceneId:'c2-open',choiceId:'c2-open-1'},
{sceneId:'c2-call',choiceId:'c2-call-1'},
{sceneId:'c3-choice',choiceId:'c3-choice-2'},
{sceneId:'c4-choice',choiceId:'c4-choice-1'},
{sceneId:'c5-choice',choiceId:'c5-choice-1'},
];
async function boot(page:Page) {
  await page.goto('/');
  await page.evaluate(key=>localStorage.setItem(key+':settings',JSON.stringify({textSpeed:0,music:false})),key);
  await page.reload();
  await expect(page.locator('h1')).toContainText('“网”恋');
}
async function importAt(page:Page,id:string,line=0) {
  const chapter=story.scenes.find(s=>s.id===id)!.chapter;
  const route=id==='c2-camera'?decisions.slice(0,3):id==='c3-frame'?decisions.slice(0,4):chapter===5?decisions:decisions.slice(0,1);
  await page.getByRole('button',{name:'返回标题',exact:true}).click();
  await page.getByRole('button',{name:'存档迁移',exact:true}).click();
  await page.getByLabel('选择存档文件').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:1,game:'netlove',savedAt:new Date().toISOString(),state:{schema:1,storyVersion:'netlove-v1',sceneId:id,line,decisions:route}}))});
  await expect(page.locator('.confirm-actions')).toBeVisible();
  await page.locator('.confirm-actions .primary').click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-scene',id);
}
test('starts, saves, hides without advancing and restores after reload',async({page},info)=>{
  await boot(page);await mkdir('test-results/previews',{recursive:true});
  await page.screenshot({path:`test-results/previews/title-${info.project.name}.png`});
  await page.getByRole('button',{name:'开始阅读',exact:true}).click();
  await expect(page.locator('.dialogue-text')).toContainText('一月二十七日');
  await page.locator('.dialogue-text').click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line','1');
  await page.getByRole('button',{name:'隐藏界面',exact:true}).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-ui-hidden','true');
  await page.getByRole('button',{name:'恢复阅读界面',exact:true}).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line','1');
  await page.reload();await page.getByRole('button',{name:'继续上次的故事',exact:true}).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line','1');
  await page.screenshot({path:`test-results/previews/reading-${info.project.name}.png`});
});
test('replays imported character and every ending, retaining chapter archive',async({page},info)=>{
  await boot(page);await page.getByRole('button',{name:'开始阅读',exact:true}).click();
  await importAt(page,'c2-camera');await expect(page.locator('[data-character="tinghe"]')).toBeVisible();
  await expect(page.locator('.netlove-sprite')).toHaveJSProperty('naturalWidth',1024);
  await page.locator('.dialogue-text').click();await page.locator('.dialogue-text').click();await expect(page.locator('.toast')).not.toHaveClass(/visible/);await page.screenshot({path:`test-results/previews/tinghe-${info.project.name}.png`});
  await importAt(page,'c3-frame');await expect(page.locator('[data-character="xumi"]')).toBeVisible();
  await page.locator('.dialogue-text').click();await page.locator('.dialogue-text').click();await expect(page.locator('.toast')).not.toHaveClass(/visible/);await page.screenshot({path:`test-results/previews/xumi-${info.project.name}.png`});
  for(const [index,id] of ['end-tinghe','end-xumi','end-friends','end-letter'].entries()) {
    decisions[5]={sceneId:'c5-choice',choiceId:`c5-choice-${index+1}`};
    await importAt(page,id,story.scenes.find(s=>s.id===id)!.lines.length-1);
    await expect(page.locator('.ending-card')).toBeVisible();await expect(page.locator('.toast')).not.toHaveClass(/visible/);await page.screenshot({path:`test-results/previews/ending-${index+1}-${info.project.name}.png`});
    await page.getByRole('button',{name:'回到标题',exact:true}).click();
    await page.getByRole('button',{name:'回忆',exact:true}).click();
    await expect(page.locator('.memory.unlocked')).toHaveCount(index+1);
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    await page.getByRole('button',{name:'继续上次的故事',exact:true}).click();
  }
  decisions[5]={sceneId:'c5-choice',choiceId:'c5-choice-1'};
});
test('downloads complete offline content and resumes with assets while disconnected',async({page,context})=>{
  await boot(page);await page.getByRole('button',{name:'安装与离线',exact:true}).click();
  await expect(page.getByRole('heading',{name:'可以离线阅读',exact:true})).toBeVisible({timeout:30000});
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.getByRole('button',{name:'开始阅读',exact:true}).click();await importAt(page,'c2-camera');
  await context.setOffline(true);await page.reload();
  await page.getByRole('button',{name:'继续上次的故事',exact:true}).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-scene','c2-camera');
  await expect(page.locator('.netlove-sprite')).toHaveJSProperty('naturalWidth',1024);
  await expect(page.locator('.scene-background')).toHaveJSProperty('naturalWidth',1672);
  await context.setOffline(false);
});
test('short landscape and portrait preserve progress, opacity and readable controls',async({page},info)=>{
  await boot(page);await page.getByRole('button',{name:'开始阅读',exact:true}).click();await importAt(page,'c2-camera');await expect(page.locator('.toast')).not.toHaveClass(/visible/);
  for(const size of [{width:568,height:320},{width:844,height:390},{width:412,height:915}]) {
    await page.setViewportSize(size);
    await expect(page.locator('.game-screen')).toHaveAttribute('data-scene','c2-camera');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const name of ['存档','回看','隐藏界面'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
    const frame=await page.locator('.scene-frame').boundingBox();expect(frame?.width).toBeGreaterThan(size.width-2);
    await page.screenshot({path:`test-results/previews/layout-${size.width}-${info.project.name}.png`});
  }
  await page.getByRole('button',{name:/调整对话框透明度/}).click();
  await page.getByLabel('对话框透明度',{exact:true}).fill('0.5');
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('netlove:v1:dialogue-opacity'))).toBe('0.5');
  await page.reload();await page.getByRole('button',{name:'继续上次的故事',exact:true}).click();
  await expect(page.getByRole('button',{name:/调整对话框透明度/})).toContainText('50%');
});
