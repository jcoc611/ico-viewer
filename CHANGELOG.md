# Changelog

All notable changes to ICO Viewer are documented here.

## [0.1.3] - 2026-10-24

### Removed

- Remove the always-visible ICO Outline section from Explorer. Binary custom editors cannot populate VS Code's standard Outline through the stable API; embedded images remain accessible in the viewer grid and preview.

## [0.1.2] - 2026-10-23

### Changed

- Add relevant Marketplace search keywords and clarify ICO, CUR, favicon, and PNG export support in the listing description and README.
- Add a direct installation link and usage answers to the README, and remove its redundant header logo.

## [0.1.1] - 2026-10-20

### Fixed

- Match the VS Code editor background in the icon grid while preserving the transparency checkerboard in image previews.

## [0.1.0] - 2026-10-19

### Added

- Preview ICO icons and CUR cursors in a custom editor, with a grid of embedded images.
- Inspect image dimensions, color depth, encoding, and cursor hotspot coordinates.
- Zoom in on individual images and switch the preview background.
- Export supported embedded images as PNG files.
- Browse icon and cursor resources in the ICO Outline view.
- Register distinct file icons for `.ico` and `.cur` files.
