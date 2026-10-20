<img src="resources/branding/icon.svg" width="80" height="80" alt="ICO Viewer logo: a pixel inside a viewing frame">

# ICO Viewer

<p align="center"><img src="resources/ico-viewer-demo.gif" alt="ICO Viewer in action" width="800"></p>

See what's inside your icons and cursors without leaving VS Code. Open an `.ico` or `.cur` file, browse its embedded images, and click one to take a closer look.

## Why ICO Viewer?

An icon file can contain several images at different sizes and color depths. VS Code's default image viewer gives you a single preview; ICO Viewer shows the whole collection so you can check exactly what you're shipping.

- **See every size.** Compare embedded images in a grid, including variants with the same dimensions.
- **Inspect the details.** Check dimensions, color depth, encoding, and cursor hotspot coordinates—the point where a cursor clicks.
- **Check every pixel.** Zoom up to 400% and switch between checkerboard, light, and dark backgrounds to inspect transparency.
- **Keep what you need.** Export any supported image as a PNG at its original resolution.

Files are processed locally. No account, uploads, or configuration needed.

## Simple to use

With ICO Viewer installed, open an `.ico` or `.cur` file in VS Code. Click an image to inspect it, use the arrow keys to move between images, and press **Escape** to return to the grid.

If another viewer opens, choose **Reopen Editor With… → ICO Viewer**. You can also run **ICO Viewer: Open Icon or Cursor** from the Command Palette.

Supports ICO icons and static CUR cursors with PNG or uncompressed bitmap images. See [format support](DEV.md#format-support) for details and limits.

## Contributing

Contributions are welcome! The focus is on keeping the extension simple and reliable: bug fixes and quality-of-life improvements are especially appreciated. I'm not currently looking to expand the feature set substantially. Please open an issue before starting a larger change.

See [DEV.md](DEV.md) for setup, development commands, and verification guidance. For bug reports, include steps to reproduce and, when possible, a sample file you can share.

## License

Everything in this project is available under the [MIT License](LICENSE), except the **ICO Viewer** extension name and logo. The name and logo are reserved and are not covered by the MIT license; see [branding notes](BRANDING.md#license) for the logo assets.
