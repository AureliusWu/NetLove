(async()=>{
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const wait=async fn=>{for(let n=0;n<320;n++){if(fn())return;await delay(25);}throw new Error('Desktop UI timeout');};
const button=name=>[...document.querySelectorAll('button')].find(b=>(b.textContent.trim()===name||b.getAttribute('aria-label')===name)&&b.getBoundingClientRect().height>0);
await wait(()=>button('开始阅读'));
if(!document.querySelector('h1').textContent.includes('“网”恋'))throw new Error('Wrong title');
if(typeof require!=='undefined'||typeof process!=='undefined')throw new Error('Renderer has Node access');
await wait(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
button('开始阅读').click();await wait(()=>document.querySelector('.dialogue-text'));
if(!document.querySelector('.dialogue-text').textContent.includes('一月二十七日'))throw new Error('Wrong story');
document.querySelector('.dialogue-text').click();await delay(30);document.querySelector('.dialogue-text').click();
await wait(()=>document.querySelector('.game-screen').dataset.line==='1');
const save=JSON.parse(localStorage.getItem('netlove:v1:save:auto'));
if(save.game!=='netlove'||save.state.line!==1)throw new Error('Autosave failed');
const frame=document.querySelector('.scene-frame').getBoundingClientRect();
if(frame.width<innerWidth-2||frame.height<innerHeight-2)throw new Error('Scene does not fill the window');
button('隐藏界面').click();await wait(()=>document.querySelector('.game-screen').dataset.uiHidden==='true');
button('恢复阅读界面').click();await wait(()=>document.querySelector('.game-screen').dataset.uiHidden==='false');
if(document.querySelector('.game-screen').dataset.line!=='1')throw new Error('Restoring advanced the story');
const choices=[{sceneId:'first-reply',choiceId:'first-reply-1'},{sceneId:'c2-open',choiceId:'c2-open-1'},{sceneId:'c2-call',choiceId:'c2-call-1'},{sceneId:'c3-choice',choiceId:'c3-choice-2'},{sceneId:'c4-choice',choiceId:'c4-choice-1'},{sceneId:'c5-choice',choiceId:'c5-choice-1'}];
async function importAt(sceneId,line,decisions){
 button('返回标题').click();await wait(()=>button('存档迁移'));button('存档迁移').click();await delay(80);
 const file=new File([JSON.stringify({schema:1,game:'netlove',savedAt:new Date().toISOString(),state:{schema:1,storyVersion:'netlove-v1',sceneId,line,decisions}})],'smoke.json',{type:'application/json'});
 const transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 await wait(()=>document.querySelector('.confirm-actions .primary'));document.querySelector('.confirm-actions .primary').click();
 await wait(()=>document.querySelector('.game-screen')?.dataset.scene===sceneId);
}
await importAt('c2-camera',0,choices.slice(0,3));
await wait(()=>document.querySelector('[data-character=tinghe] img')?.naturalWidth===1024);
await importAt('c3-frame',0,choices.slice(0,4));
await wait(()=>document.querySelector('[data-character=xumi] img')?.naturalWidth===1024);
await importAt('end-tinghe',9,choices);await wait(()=>button('回到标题'));
if(!document.querySelector('.ending-card').textContent.includes('同一段呼吸'))throw new Error('Ending failed');
button('制作人员').click();await wait(()=>document.querySelector('.credits-copy'));button('关闭').click();
button('回到标题').click();await wait(()=>button('回忆'));button('回忆').click();
await wait(()=>document.querySelector('.memory.unlocked'));
if(document.querySelectorAll('.cg-card:not(:disabled)').length!==5)throw new Error('Background unlocks not reconstructed');
return {story:true,autosave:true,fullWindow:true,pictureMode:true,sandbox:true,tinghe:true,xumi:true,ending:true,archive:true};
})()
