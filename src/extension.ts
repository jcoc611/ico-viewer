import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import { parseIco, MAX_FILE_SIZE } from './ico';
const viewType = 'icoAtlas.viewer';
interface IconDocument extends vscode.CustomDocument { bytes: Uint8Array; }
export function activate(context: vscode.ExtensionContext) {
  const fileIcon = (kind: 'ico' | 'cur') => ({
    light: vscode.Uri.joinPath(context.extensionUri, 'resources', 'icons', `${kind}-light.svg`),
    dark: vscode.Uri.joinPath(context.extensionUri, 'resources', 'icons', `${kind}-dark.svg`)
  });
  const provider: vscode.CustomReadonlyEditorProvider<IconDocument> = {
    async openCustomDocument(uri) {
      if ((await vscode.workspace.fs.stat(uri)).size > MAX_FILE_SIZE) throw Error('This icon exceeds the 64 MB limit.');
      const bytes = await vscode.workspace.fs.readFile(uri);
      parseIco(bytes);
      return {uri,bytes,dispose(){}};
    },
    async resolveCustomEditor(document,panel) {
      panel.iconPath = fileIcon(/\.cur$/i.test(document.uri.path) ? 'cur' : 'ico');
      panel.webview.options={enableScripts:true,localResourceRoots:[vscode.Uri.joinPath(context.extensionUri,'dist')]};
      const asset=(name:string)=>panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'dist',name)).toString();
      const nonce=randomBytes(16).toString('hex');
      panel.webview.html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src blob:; img-src blob: data:; style-src ${panel.webview.cspSource}; script-src 'nonce-${nonce}';"><link rel="stylesheet" href="${asset('viewer.css')}"><title>ICO Viewer</title></head><body class="extension"><div id="app"></div><script nonce="${nonce}" src="${asset('viewer.js')}"></script></body></html>`;
      const send=()=>panel.webview.postMessage({type:'load',name:document.uri.path.split('/').pop() || 'icon.ico',bytes:Buffer.from(document.bytes).toString('base64')});
      context.subscriptions.push(panel.webview.onDidReceiveMessage(async message=>{
        if(message?.type==='ready') void send();
        if(message?.type==='export' && typeof message.bytes==='string' && message.bytes.length<2*MAX_FILE_SIZE){
          const bytes=Buffer.from(message.bytes,'base64');
          if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return;
          const filename=String(message.name).replace(/[^a-zA-Z0-9._-]/g,'_');
          const target=await vscode.window.showSaveDialog({defaultUri:vscode.Uri.joinPath(document.uri,'..',filename),filters:{'PNG image':['png']}});
          if(target)try{await vscode.workspace.fs.writeFile(target,bytes);}catch(error){void vscode.window.showErrorMessage(`Could not export image: ${error}`);}
        }
      }));
      // Reload on external changes without overwriting a newer update with an older read.
      let generation=0;
      const watcher=vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.joinPath(document.uri,'..'),document.uri.path.split('/').pop()!));
      const refresh=async()=>{
        const current=++generation;
        try{
          if((await vscode.workspace.fs.stat(document.uri)).size>MAX_FILE_SIZE)throw Error('This icon exceeds the 64 MB limit.');
          const bytes=await vscode.workspace.fs.readFile(document.uri);
          parseIco(bytes);
          if(current!==generation)return;
          document.bytes=bytes;await send();
        }catch(error){if(current===generation){void panel.webview.postMessage({type:'error',message:String(error)});}}
      };
      watcher.onDidChange(refresh);watcher.onDidDelete(()=>{generation++;void panel.webview.postMessage({type:'error',message:'This file has been deleted.'});});
      panel.onDidDispose(()=>watcher.dispose());
    }
  };
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(viewType,provider,{supportsMultipleEditorsPerDocument:true}),
    vscode.commands.registerCommand('icoAtlas.open',async()=>{const files=await vscode.window.showOpenDialog({canSelectMany:false,filters:{'Icons and cursors':['ico','cur']}});if(files?.[0])await vscode.commands.executeCommand('vscode.openWith',files[0],viewType);})
  );
}
