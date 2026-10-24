# ICO Viewer

<p align="center"><img src="resources/ico-viewer-demo.gif" alt="ICO Viewer in action" width="800"></p>

View `.ico` icons, `favicon.ico` files, and `.cur` cursors in VS Code. Browse every embedded image size, inspect transparency and color depth, and export supported images to PNG.

[Install ICO Viewer from the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=jcoc611.icoviewer)


## Why ICO Viewer?

An icon file can contain several images at different sizes and color depths. VS Code's default image viewer gives you a single preview; ICO Viewer shows the whole collection so you can check exactly what you're shipping.

- **See every size.** Compare embedded images in a grid, including variants with the same dimensions.
- **Inspect the details.** Check dimensions, color depth, encoding, and cursor hotspot coordinates—the point where a cursor clicks.
- **Check every pixel.** Zoom up to 400% and switch between checkerboard, light, and dark backgrounds to inspect transparency.
- **Keep what you need.** Export any supported image as a PNG at its original resolution.

Files are processed locally. No account, uploads, or configuration needed.

## Install and open an icon or cursor

In VS Code's Extensions view, search for **ICO Viewer** by **jcoc611**, or use the [Marketplace listing](https://marketplace.visualstudio.com/items?itemName=jcoc611.icoviewer). The extension ID is `jcoc611.icoviewer`.

With ICO Viewer installed, open an `.ico` or `.cur` file in VS Code. Click an image to inspect it, use the arrow keys to move between images, and press **Escape** to return to the grid.

If another viewer opens, choose **Reopen Editor With… → ICO Viewer**. You can also run **ICO Viewer: Open Icon or Cursor** from the Command Palette.

Supports ICO icons and static CUR cursors with PNG or uncompressed bitmap images. See [format support](DEV.md#format-support) for details and limits.

## Common questions

**Can I preview a favicon?** Yes. Open a `favicon.ico` file to compare its embedded sizes and check transparency. Other favicon formats, such as standalone SVG and PNG files, use VS Code's existing viewers.

**Can I convert ICO or CUR to PNG?** Open the file, select a supported embedded image, and choose **Export PNG**. Each export keeps that image's original resolution; it does not resize images or batch-convert files.

**Can I edit or create icons and cursors?** ICO Viewer is a viewer and PNG exporter. It does not modify ICO or CUR files, create icons from PNGs, or play animated `.ani` cursors.

## Contributing

Contributions are welcome! The focus is on keeping the extension simple and reliable: bug fixes and quality-of-life improvements are especially appreciated. I'm not currently looking to expand the feature set substantially. Please open an issue before starting a larger change.

See [DEV.md](DEV.md) for setup, development commands, and verification guidance. For bug reports, include steps to reproduce and, when possible, a sample file you can share.

## License

Everything in this project is available under the [MIT License](LICENSE), except the **ICO Viewer** extension name and logo. The name and logo are reserved and are not covered by the MIT license; see [branding notes](BRANDING.md#license) for the logo assets.
