const { app, BrowserWindow, Menu } = require('electron');
const path=require('node:path'), fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const smoke=process.argv.includes('--smoke-test');
const hostedSmoke=smoke&&process.platform==='win32'&&process.env.CI==='true'&&process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='AureliusWu/NetLove';
const smokeDataArgument=process.argv.indexOf('--smoke-user-data-dir');
const restoring=smoke&&smokeDataArgument>=0;
if(smoke){
 const directory=restoring?path.resolve(process.argv[smokeDataArgument+1]||''):path.join(app.getPath('temp'),`netlove-smoke-${process.pid}`);
 if(path.dirname(directory).toLowerCase()!==path.resolve(app.getPath('temp')).toLowerCase()||!/^netlove-smoke-\d+$/.test(path.basename(directory)))throw new Error('Smoke storage must be an isolated temporary game profile');
 app.setPath('userData',directory);
}
let window;
function openWindow(){
 // Resolve the portable launcher's Windows 8.3 extraction path before creating file URLs.
 // Chromium and Node must identify the same exact packaged document for fullscreen.
 const root=require('original-fs').realpathSync.native(app.getAppPath());
 const index=path.join(root,'dist','index.html'),entry=pathToFileURL(index).href;
 const permissionTrace=[];
 window=new BrowserWindow({width:1360,height:860,minWidth:800,minHeight:560,title:'“网”恋 · NetLove',backgroundColor:'#f5f2e8',icon:path.join(__dirname,'..','dist','icons','icon-512.png'),show:false,focusable:!smoke,skipTaskbar:smoke,autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:!smoke}});
 let smokeShowEvents=0,fullscreenSmokeActive=false;
 if(smoke){
  window.webContents.setAudioMuted(true);
  window.on('show',()=>{smokeShowEvents++;if(!fullscreenSmokeActive)window.hide();});
 }
 Menu.setApplicationMenu(null);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 window.webContents.on('will-navigate',(event,url)=>{if(url.split('#')[0]!==entry)event.preventDefault();});
 const allowed=(contents,permission,details={})=>{
  const actual=contents?.getURL().split('#')[0];
  const granted=permission==='fullscreen'&&contents===window.webContents&&actual===entry&&details.isMainFrame!==false;
  if(smoke)permissionTrace.push({permission,entry,actual,isMainFrame:details.isMainFrame,requestingUrl:details.requestingUrl,granted});
  return granted;
 };
 window.webContents.session.setPermissionRequestHandler((contents,permission,callback,details)=>callback(allowed(contents,permission,details)));
 window.webContents.session.setPermissionCheckHandler((contents,permission,_origin,details)=>allowed(contents,permission,details));
 window.webContents.on('before-input-event',(event,input)=>{if(input.key==='F11'&&input.type==='keyDown'){event.preventDefault();window.setFullScreen(!window.isFullScreen());}});
 window.once('ready-to-show',()=>{if(!smoke)window.show();});
 window.webContents.on('did-fail-load',(_event,code,description)=>{console.error('Desktop load failed:',code,description);if(smoke)app.exit(1);});
 if(smoke)window.webContents.once('did-finish-load',async()=>{
  try{
   if(restoring){
    await window.webContents.executeJavaScript(`(async()=>{
     const saved=JSON.parse(localStorage.getItem('netlove:v1:save:auto'))||{};
     if(saved.game!=='netlove'||saved.schema!==1||saved.state.storyVersion!=='netlove-v1'||saved.state.sceneId!=='end-tinghe'||saved.state.line!==9||saved.state.decisions.length!==6)throw new Error('Installed upgrade lost the prior version save');
     const button=name=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===name);
     for(let i=0;i<200&&!button('继续上次的故事');i++)await new Promise(r=>setTimeout(r,25));
     button('继续上次的故事').click();
     for(let i=0;i<400&&!document.querySelector('.ending-card');i++)await new Promise(r=>setTimeout(r,25));
     if(document.querySelector('.game-screen')?.dataset.scene!=='end-tinghe'||document.querySelector('.game-screen')?.dataset.line!=='9'||!document.querySelector('.ending-card'))throw new Error('Upgraded installed game cannot resume old ending');
     button('回到标题').click();
     for(let i=0;i<200&&!button('开始阅读');i++)await new Promise(r=>setTimeout(r,25));
    })()`);
    console.log('DESKTOP_UPGRADE_OK',JSON.stringify({version:app.getVersion(),saveSchema:1,sameProfile:true}));
   }
   console.log('DESKTOP_SMOKE_PHASE','story-and-archive');
   const result=await window.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname,'smoke-script.js'),'utf8'));
   console.log('DESKTOP_SMOKE_PHASE','fullscreen-continuation');
   // Each fullscreen action gets its own short trusted-gesture invocation.
   await window.webContents.executeJavaScript(`(async()=>{
    document.querySelector('[aria-label="关闭"]').click();
    [...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='继续上次的故事').click();
    for(let i=0;i<400;i++){if(document.querySelector('.game-screen')?.dataset.scene==='end-tinghe')return;await new Promise(resolve=>setTimeout(resolve,25));}
    throw new Error('Fullscreen continuation setup failed');
   })()`);
   console.log('DESKTOP_SMOKE_PHASE','native-fullscreen-enter');
   // The disposable Windows runner exercises a real visible fullscreen window.
   // Suppressing its show event can cancel the portable launcher's transition.
   if(hostedSmoke){fullscreenSmokeActive=true;window.setFocusable(true);window.show();window.focus();}
   await window.webContents.executeJavaScript(`(async()=>{
    document.querySelector('[aria-label="全屏阅读"]').click();
    for(let i=0;i<400;i++){if(document.fullscreenElement&&document.querySelector('[aria-label="退出全屏"]'))return;await new Promise(resolve=>setTimeout(resolve,25));}
    throw new Error('Native fullscreen entry failed');
   })()`,true);
   console.log('DESKTOP_SMOKE_PHASE','native-fullscreen-exit');
   await window.webContents.executeJavaScript(`(async()=>{
    for(let i=0;i<400;i++){const button=document.querySelector('[aria-label="退出全屏"]');if(button&&!button.disabled){button.click();break;}await new Promise(resolve=>setTimeout(resolve,25));}
    for(let i=0;i<400;i++){if(!document.fullscreenElement&&document.querySelector('[aria-label="全屏阅读"]'))return;await new Promise(resolve=>setTimeout(resolve,25));}
    throw new Error('Native fullscreen exit failed');
   })()`,true);
   fullscreenSmokeActive=false;
   window.hide();
   if(hostedSmoke)window.setFocusable(false);
   const fullscreenProgress=await window.webContents.executeJavaScript(`document.querySelector('.game-screen')?.dataset.scene==='end-tinghe'&&document.querySelector('.game-screen').dataset.line==='9'&&JSON.parse(localStorage.getItem('netlove:v1:save:auto')).state.line===9`);
   if(!fullscreenProgress)throw new Error('Native fullscreen changed the saved reading position');
   // Native fullscreen may briefly show an OS window despite show:false.
   // Suppress focus/audio and explicitly hide after exit; measure final visibility.
   window.hide();const hiddenWindow=!window.isVisible();
   if(!hiddenWindow)throw new Error('Desktop smoke window remained visible');
   const out=path.join(process.cwd(),'test-results','desktop');fs.mkdirSync(out,{recursive:true});
   fs.writeFileSync(path.join(out,app.isPackaged?'packaged.png':'source.png'),(await window.webContents.capturePage()).toPNG());
   const proof={...result,nativeFullscreen:true,fullscreenProgress,hiddenWindow,smokeShowEvents,packaged:app.isPackaged,version:app.getVersion(),profile:app.getPath('userData')};
   const report=process.env.NETLOVE_SMOKE_REPORT;
   if(report&&process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='AureliusWu/NetLove'){
    const directory=path.dirname(path.resolve(report));
    if(path.dirname(directory).toLowerCase()!==path.resolve(process.env.RUNNER_TEMP||'').toLowerCase()||!path.basename(directory).startsWith('NetLove-installed-'))throw new Error('Unsafe smoke report path');
    if(app.isPackaged)proof.asarSha256=require('node:crypto').createHash('sha256').update(require('original-fs').readFileSync(app.getAppPath())).digest('hex');
    fs.writeFileSync(report,JSON.stringify(proof));
   }
   console.log('DESKTOP_SMOKE_OK',JSON.stringify(proof));app.exit(0);
   }catch(error){
   const report=process.env.NETLOVE_SMOKE_REPORT;
   if(report&&process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='AureliusWu/NetLove'){
    try{
     const renderer=await window.webContents.executeJavaScript(`({url:location.href,focused:document.hasFocus(),visibility:document.visibilityState,fullscreen:!!document.fullscreenElement,enabled:document.fullscreenEnabled,button:document.querySelector('[aria-label="全屏阅读"]')?.outerHTML})`).catch(()=>null);
     fs.writeFileSync(report,JSON.stringify({status:'failed',stage:'renderer-smoke',error:String(error),stack:error?.stack,cwd:process.cwd(),profile:app.getPath('userData'),entry,permissionTrace,renderer}));
    }catch{}
   }
   console.error(error);app.exit(1);
  }
 });
 void window.loadFile(index);
}
app.whenReady().then(openWindow);
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)openWindow();});
