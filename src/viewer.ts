import { parseIco, decodeDib, createDemoIco, MAX_FILE_SIZE, type IconEntry } from './ico';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
document.body.classList.toggle('web', !vscode);
const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
${vscode ? '' : `<header class="web-toolbar">
  <strong class="brand">
    <svg class="brand-mark" width="24" height="24" viewBox="0 0 32 32" aria-hidden="true"><path d="M12 5H5v7m15-7h7v7M5 20v7h7m8 0h7v-7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="12" y="12" width="8" height="8" rx="1" fill="currentColor"/></svg>
    ICO Viewer
  </strong>
  <p class="app-description">Preview ICO icons and CUR cursors, inspect each image, and export PNGs.</p>
  <nav aria-label="Viewer actions">
    <button id="demo">Show Sample</button>
    <a href="https://marketplace.visualstudio.com/items?itemName=jcoc611.icoviewer" target="_blank" rel="noopener noreferrer"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m17.5 1 5.5 2.7v16.6L17.5 23 7.8 14.1 3 17.8 1 16.8V7.2l2-1 4.8 3.7L17.5 1Zm0 5.6L11.3 12l6.2 5.4V6.6ZM3 8.5v7l3.2-3.5L3 8.5Z"/></svg>Get Extension</a>
    <a href="https://github.com/jcoc611/ico-viewer" target="_blank" rel="noopener noreferrer"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 .1.77 2.13 3.28 1.04.1-.73.4-1.23.71-1.51-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.63 0c2.15-1.46 3.1-1.15 3.1-1.15.61 1.55.23 2.69.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.77.54A11.25 11.25 0 0 0 12 .75Z"/></svg>View repo</a>
  </nav>
</header>`}
<main>
  ${vscode ? '' : `<section id="empty-state" aria-label="Open an icon or cursor">
    <div class="open-panel">
      <svg class="open-symbol" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4m8 0h4a1 1 0 0 0 1-1v-4M12 16V8m-4 4 4-4 4 4"/></svg>
      <p class="drop-prompt">Drag <strong>.ico</strong> or <strong>.cur</strong> files anywhere</p>
      <button id="open">Open a file</button>
      <p class="privacy-note">Files stay on your device. Nothing is uploaded.</p>
    </div>
  </section>
  <div id="collection" class="collection-bar" hidden>
    <div class="collection-name"><strong id="filename"></strong><span id="sample-label">Sample</span></div>
    <span id="collection-summary" role="status"></span>
    <button id="open-another">Open file…</button>
  </div>`}
  <div id="notice" class="notice" role="status" hidden></div>
  <div id="grid" class="grid" aria-label="Icon images"${vscode ? '' : ' hidden'}></div>
  <section id="detail" aria-label="Image preview" hidden>
    <header class="detail-bar">
      <button id="back" aria-label="Back to grid" title="Back to grid (Escape)">← Grid</button>
      <span id="metadata"></span>
      <div class="detail-tools">
        <select id="zoom" aria-label="Zoom">
          <option value="fit">Fit</option><option value="1">100%</option>
          <option value="2">200%</option><option value="4">400%</option>
        </select>
        <button id="background" aria-label="Change background" title="Change background">◐</button>
        <button id="export">Export PNG</button>
      </div>
    </header>
    <div id="stage" class="stage checker">
      <img id="preview" alt="">
      <p id="decode-error" role="status" hidden></p>
    </div>
  </section>
</main>
${vscode ? '' : `<input type="file" id="file" accept=".ico,.cur,image/x-icon,image/vnd.microsoft.icon" hidden>
<div id="drop-overlay" hidden><div><strong>Drop your icon or cursor</strong><span>.ico or .cur · Opened locally, never uploaded</span></div></div>`}`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let entries: IconEntry[] = [];
let urls: string[] = [];
let selected = 0;
let detailOpen = false;
let name = 'atlas.ico';
let renderVersion = 0;
let failures = new Map<number, string>();
const formatBytes = (n: number) => n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
function notice(message: string) {
  el('notice').textContent = message;
  el('notice').hidden = !message;
}
function saveState() { vscode?.setState({ selected, detailOpen }); }
function setDetail(open: boolean, focus = false) {
  detailOpen = open;
  el('grid').hidden = open;
  el('detail').hidden = !open;
  document.body.classList.toggle('detail-open', open);
  saveState();
  if (focus) {
    if (open) el('back').focus();
    else (el('grid').children[selected] as HTMLButtonElement | undefined)?.focus();
  }
}
async function renderImage(entry: IconEntry): Promise<string> {
  if (entry.encoding === 'PNG') {
    const header = new DataView(entry.data.buffer, entry.data.byteOffset, entry.data.byteLength);
    if (entry.data.length < 33 || header.getUint32(16) !== entry.width || header.getUint32(20) !== entry.height)
      throw Error('PNG dimensions do not match the directory.');
    const blob = new Blob([new Uint8Array(entry.data)], { type: 'image/png' });
    const bitmap = await createImageBitmap(blob);
    const valid = bitmap.width === entry.width && bitmap.height === entry.height;
    bitmap.close();
    if (!valid) throw Error('PNG dimensions do not match the directory.');
    return URL.createObjectURL(blob);
  }
  const canvas = document.createElement('canvas');
  canvas.width = entry.width;
  canvas.height = entry.height;
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(decodeDib(entry)), entry.width, entry.height), 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(Error('Could not render image.')), 'image/png'));
  return URL.createObjectURL(blob);
}
async function load(bytes: Uint8Array, filename: string, isSample = false) {
  const version = ++renderVersion;
  try {
    const parsed = parseIco(bytes);
    notice('');
    const errors = new Map<number, string>();
    const rendered = await Promise.all(parsed.map(async entry => {
      try { return await renderImage(entry); }
      catch (error) { errors.set(entry.index, error instanceof Error ? error.message : String(error)); return ''; }
    }));
    if (version !== renderVersion) {
      rendered.forEach(url => { if (url) URL.revokeObjectURL(url); });
      return;
    }
    urls.forEach(url => { if (url) URL.revokeObjectURL(url); });
    urls = rendered;
    entries = parsed;
    failures = errors;
    name = filename;
    if (!vscode) {
      el('filename').textContent = name;
      el('filename').title = name;
      el('sample-label').hidden = !isSample;
      el('collection-summary').textContent = `${entries.length} ${entries.length === 1 ? 'image' : 'images'}`;
      el('empty-state').hidden = true;
      el('collection').hidden = false;
    }
    el('grid').replaceChildren();
    entries.forEach(entry => {
      const button = document.createElement('button');
      button.className = 'image-card';
      button.setAttribute('aria-label', `${entry.width} by ${entry.height}, ${entry.bitDepth} bit ${entry.encoding}${entry.hotspot ? `, hotspot (${entry.hotspot.x}, ${entry.hotspot.y})` : ''}`);
      const surface = document.createElement('div');
      surface.className = 'card-stage checker';
      if (urls[entry.index]) {
        const img = document.createElement('img');
        img.src = urls[entry.index];
        img.alt = '';
        img.width = entry.width;
        img.height = entry.height;
        surface.append(img);
      } else surface.textContent = 'Preview unavailable';
      const caption = document.createElement('span');
      caption.className = 'card-caption';
      caption.textContent = `${entry.width} × ${entry.height}`;
      if (!vscode) {
        const info = document.createElement('span');
        info.className = 'card-info';
        info.textContent = `${entry.bitDepth}-bit · ${entry.encoding}`;
        caption.append(info);
      }
      button.append(surface, caption);
      button.onclick = () => { select(entry.index); setDetail(true, true); };
      el('grid').append(button);
    });
    const saved = vscode?.getState() as { selected?: number; detailOpen?: boolean } | undefined;
    const index = saved?.selected;
    select(typeof index === 'number' && Number.isInteger(index) && index >= 0 ? Math.min(index, entries.length - 1) : 0);
    setDetail(saved?.detailOpen === true);
  } catch (error) { notice(error instanceof Error ? error.message : String(error)); }
}
function select(index: number) {
  const entry = entries[index];
  if (!entry) return;
  selected = index;
  saveState();
  [...el('grid').children].forEach((node, i) => {
    node.classList.toggle('selected', i === index);
    node.setAttribute('aria-pressed', String(i === index));
  });
  const preview = el<HTMLImageElement>('preview');
  preview.hidden = !urls[index];
  if (urls[index]) preview.src = urls[index];
  else preview.removeAttribute('src');
  preview.alt = `${entry.width} × ${entry.height} image`;
  el('metadata').textContent = `${entry.width} × ${entry.height} · ${entry.bitDepth}-bit · ${entry.encoding} · ${formatBytes(entry.byteLength)}${entry.hotspot ? ` · Hotspot (${entry.hotspot.x}, ${entry.hotspot.y})` : ''}`;
  el('decode-error').textContent = failures.get(index) || '';
  el('decode-error').hidden = !failures.has(index);
  el<HTMLButtonElement>('export').disabled = !urls[index];
  applyZoom();
}
function applyZoom() {
  const entry = entries[selected];
  if (!entry) return;
  const zoom = el<HTMLSelectElement>('zoom').value;
  const img = el<HTMLImageElement>('preview');
  img.classList.toggle('fit', zoom === 'fit');
  img.width = entry.width * (zoom === 'fit' ? 1 : Number(zoom));
  img.height = entry.height * (zoom === 'fit' ? 1 : Number(zoom));
}
el('zoom').onchange = applyZoom;
el('back').onclick = () => setDetail(false, true);
el('background').onclick = () => {
  const stage = el('stage');
  stage.dataset.background = stage.dataset.background === 'dark' ? 'light' : stage.dataset.background === 'light' ? '' : 'dark';
};
el('export').onclick = async () => {
  if (!urls[selected]) return;
  const entry = entries[selected], url = urls[selected];
  const filename = `${name.replace(/\.(ico|cur)$/i, '')}-${entry.width}x${entry.height}-${selected + 1}.png`;
  if (vscode) {
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    vscode.postMessage({ type: 'export', name: filename, bytes: btoa(binary) });
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }
};
async function openFile(file?: File) {
  if (!file) return;
  if (file.size > MAX_FILE_SIZE) { notice('This icon exceeds the 64 MB limit.'); return; }
  try { await load(new Uint8Array(await file.arrayBuffer()), file.name); }
  catch { notice('Could not read this file.'); }
}
if (!vscode) {
  el('open').onclick = () => el<HTMLInputElement>('file').click();
  el('open-another').onclick = () => el<HTMLInputElement>('file').click();
  el<HTMLInputElement>('file').onchange = event => {
    const input = event.target as HTMLInputElement;
    void openFile(input.files?.[0]);
    input.value = '';
  };
  el('demo').onclick = () => void load(createDemoIco(), 'atlas.ico', true);
  let dragDepth = 0;
  window.addEventListener('dragenter', event => {
    event.preventDefault();
    if (event.dataTransfer?.types.includes('Files')) { dragDepth++; el('drop-overlay').hidden = false; }
  });
  window.addEventListener('dragleave', () => {
    if (--dragDepth <= 0) { dragDepth = 0; el('drop-overlay').hidden = true; }
  });
  window.addEventListener('dragover', event => event.preventDefault());
  window.addEventListener('drop', event => {
    event.preventDefault(); dragDepth = 0; el('drop-overlay').hidden = true;
    void openFile(event.dataTransfer?.files[0]);
  });
}
window.addEventListener('keydown', event => {
  const target = event.target as HTMLElement;
  if (event.key === 'Escape' && detailOpen) { event.preventDefault(); setDetail(false, true); return; }
  if (!entries.length || ['INPUT', 'SELECT'].includes(target.tagName)) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    select((selected + (event.key === 'ArrowRight' ? 1 : -1) + entries.length) % entries.length);
    if (!detailOpen) (el('grid').children[selected] as HTMLButtonElement).focus();
  }
});
if (vscode) {
  window.addEventListener('message', event => {
    const message = event.data;
    if (message?.type === 'load') {
      void load(Uint8Array.from(atob(message.bytes), c => c.charCodeAt(0)), message.name);
    } else if (message?.type === 'error') {
      ++renderVersion;
      urls.forEach(url => { if (url) URL.revokeObjectURL(url); });
      urls = []; entries = [];
      el('grid').replaceChildren();
      el<HTMLImageElement>('preview').removeAttribute('src');
      setDetail(false);
      notice(message.message);
    }
  });
  vscode.postMessage({ type: 'ready' });
}
