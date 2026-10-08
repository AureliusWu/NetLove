const { app, BrowserWindow, Menu } = require('electron');
const path=require('node:path'), fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const smoke=process.argv.includes('--smoke-test');
if(smoke)app.setPath('userData',path.join(app.getPath('temp'),`netlove-smoke-${process.pid}`));
let window;
function openWindow(){
 const index=path.join(__dirname,'..','dist','index.html'),entry=pathToFileURL(index).href;
 window=new BrowserWindow({width:1360,height:860,minWidth:800,minHeight:560,title:'“网”恋 · NetLove',backgroundColor:'#f5f2e8',icon:path.join(__dirname,'..','dist','icons','icon-512.png'),show:false,autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 Menu.setApplicationMenu(null);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 window.webContents.on('will-navigate',(event,url)=>{if(url.split('#')[0]!==entry)event.preventDefault();});
 const allowed=(contents,permission,details={})=>permission==='fullscreen'&&contents===window.webContents&&contents.getURL().split('#')[0]===entry&&details.isMainFrame!==false;
 window.webContents.session.setPermissionRequestHandler((contents,permission,callback,details)=>callback(allowed(contents,permission,details)));
 window.webContents.session.setPermissionCheckHandler((contents,permission,_origin,details)=>allowed(contents,permission,details));
 window.webContents.on('before-input-event',(event,input)=>{if(input.key==='F11'&&input.type==='keyDown'){event.preventDefault();window.setFullScreen(!window.isFullScreen());}});
 window.once('ready-to-show',()=>window.show());
 window.webContents.on('did-fail-load',(_event,code,description)=>{console.error('Desktop load failed:',code,description);if(smoke)app.exit(1);});
 if(smoke)window.webContents.once('did-finish-load',async()=>{
  try{
   const result=await window.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname,'smoke-script.js'),'utf8'));
   const out=path.join(process.cwd(),'test-results','desktop');fs.mkdirSync(out,{recursive:true});
   fs.writeFileSync(path.join(out,app.isPackaged?'packaged.png':'source.png'),(await window.webContents.capturePage()).toPNG());
   console.log('DESKTOP_SMOKE_OK',JSON.stringify({...result,packaged:app.isPackaged,version:app.getVersion()}));app.exit(0);
  }catch(error){console.error(error);app.exit(1);}
 });
 void window.loadFile(index);
}
app.whenReady().then(openWindow);
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)openWindow();});
