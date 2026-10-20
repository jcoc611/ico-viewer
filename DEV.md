# Developing ICO Viewer

Setup, architecture, and verification notes for contributors. For an overview of the extension, see [README.md](README.md).

The logo is a pixel inside a viewing frame. [Brand assets and naming notes](BRANDING.md) include the editable SVGs, light and dark marks, and a preview.

## Get started

Requires Node.js 22+ and npm.

```sh
npm install
npm run build
```

**VS Code:** open this repository in VS Code and press **F5** (Run ICO Viewer). In the Extension Development Host, open `fixtures/atlas.ico`, `fixtures/mixed.ico`, or `fixtures/mixed.cur`. The viewer registers as the default custom editor for `*.ico` and `*.cur`. Existing editor associations can override this; use **Reopen Editor With… → ICO Viewer**. **ICO Viewer: Open Icon or Cursor** is also available in the Command Palette.

**Web utility:** run `npm run dev`, then visit [localhost:5173](http://127.0.0.1:5173). Open a file or drop it anywhere on the page. The viewer starts with a drop area; **Show Sample** opens the sample bundle. Files are parsed locally; no service or upload is involved. The static `dist/` directory can also be served by any static HTTP server.

## File icons

The extension includes distinct 16 px SVG icons for `.ico` (the framed-pixel mark) and `.cur` (a cursor arrow), with light and dark variants. Viewer tabs and outline entries use these icons. File-type defaults are registered at installation for Explorer and other file lists.

Explorer icons follow [VS Code's file icon theme rules](https://code.visualstudio.com/api/extension-guides/file-icon-theme#language-default-icons): themes with an existing filename, extension, or language icon take precedence. For example, the built-in Seti theme keeps its existing `.ico` icon and uses the new cursor icon for `.cur`. Themes that disable language icons, Minimal, and None will not display these defaults. The extension does not change your selected icon theme or settings.

## Viewer

- Edge-to-edge grid preserving directory order and duplicate sizes. No editor header, filename area, sidebar, or outer padding in VS Code.
- Click a grid item for a full-page preview with a thin metadata and controls bar.
- Escape or **Grid** returns to the collection. Left/right arrows navigate images.
- 100% / 200% / 400% / fit zoom, transparency backgrounds, and PNG export at original resolution.
- Cursor hotspot coordinates (x, y pixels from the top-left) in the preview metadata and Explorer outline.
- **ICO Outline** in VS Code's Explorer, synchronized with the active icon or cursor editor. Select an entry to inspect that resource.
- VS Code theme colors, split-editor support, and reloads when files change externally.

### Outline API limitation

The stable VS Code API does not provide binary custom editors with a native Outline provider. This bootstrap provides a dedicated **ICO Outline** tree in Explorer without adding a sidebar inside the editor. It does not claim to populate VS Code's built-in Outline. See [the current upstream request](https://github.com/microsoft/vscode/issues/327247).

## Format support

ICO and static CUR containers with PNG payloads and uncompressed Windows DIB payloads with 1-, 4-, 8-, 16- (RGB555), 24-, or 32-bit pixels. CUR hotspot coordinates are read from each directory entry; color depth comes from the image payload. DIB decoding supports palettes, bottom-up/top-down rows, row padding, alpha, and AND transparency masks. Valid 32-bit alpha takes precedence over legacy AND masks.

Compressed DIBs, BI_BITFIELDS, and pre-Windows-3 bitmap headers currently show an explicit per-image error; the other resources remain browsable. Animated ANI cursors are outside this scope. Files are limited to 64 MB and 256 resources. Invalid directories are rejected, and image dimensions are checked before PNG decoding.

## Development

```sh
npm run watch    # rebuild extension/UI JS and copy changed web assets
npm run check    # TypeScript checks
npm run lint     # ESLint checks for authored JavaScript and TypeScript
npm test        # parser and bitmap decoder tests
npm run build   # extension + standalone static web utility
npm run build:web  # minified web-only bundle in dist/web/
node --import tsx scripts/fixtures.ts  # regenerate the sample icons and cursor
```

After a watch rebuild, reload the browser or use **Developer: Reload Webviews** in the Extension Development Host.

For the production website at `https://jcoc611.com/ico/`, run `npm run build:web` and copy the four files from `dist/web/` into the Pages repository's `ico/` folder. The bundle contains `index.html`, `viewer.css`, `viewer.js`, and `icon.svg`, uses relative asset URLs, and includes the license notice in the JavaScript. The HTML includes a canonical URL, social metadata, structured application data, and fallback content. No server or runtime dependencies are needed.

- `src/ico.ts` — shared parser, DIB decoder, deterministic sample
- `src/viewer.ts` — shared browser/webview interface
- `src/extension.ts` — custom editor, native tree, filesystem watching, export
- `web/viewer.css` — responsive styling and VS Code theme integration
- `fixtures/atlas.ico` — seven bitmap resources, 16–256 px
- `fixtures/mixed.ico` — the same bundle with a PNG-backed 256 px resource
- `fixtures/mixed.cur` — an original retro pixel arrow with an ivory fill, charcoal outline, mint tail cap, and tip hotspots; BMP/PNG resources at 16–256 px

No runtime npm dependencies. The extension runs in the desktop/remote Node extension host; a browser extension host entry point is future work. The Marketplace extension ID is `jcoc611.icoviewer`. Before publishing, update [CHANGELOG.md](CHANGELOG.md) for the release and package with the official VS Code extension tooling. Keep [LICENSE](LICENSE) with distributions, including its exclusion of the extension name and logo.

## Verification

Before submitting a change, run `npm run check`, `npm run lint`, `npm test`, and `npm run build`. For UI changes, also check the affected workflow in the browser and Extension Development Host.

Type checks, lint, the production build, and automated parser tests run locally. The grid and full-page preview share one UI in the browser and VS Code. Browser smoke testing covers mixed BMP/PNG CUR previews and hotspot metadata through the file input handler. Native file-picker dialogs, Extension Development Host behavior, and PNG export still need a manual check.
