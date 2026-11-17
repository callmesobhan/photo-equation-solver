# Pictures

| File | Use |
|---|---|
| `logo.svg`, `logo-512.png` | the logo with rounded corners (README header, social cards) |
| `logo-square.svg`, `logo-square-512.png` | the same logo as a full square, for places that crop it themselves (marketplace avatars) |
| `hero.png` | top of the README: photo, text, exact answer |
| `solves.png` | the "What it solves" grid in the README |
| `social-preview.png` | 1280 x 640 card for GitHub's social preview: *Settings -> General -> Social preview -> Edit -> Upload an image* |

Every result shown in these pictures is printed by the real engine (`mcp-server/bin/cli.js`); none is typed by hand.
`node dev/make-visuals.cjs` draws them again (it needs Playwright with Chromium, and uses the font Inter if installed).
The logo is drawn with strokes, so the SVG does not depend on a font.

These files are part of the Software under [`LICENSE`](../LICENSE).
