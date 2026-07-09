# LC001-V2

Phase 1: a single green plane that locks onto a painting via MindAR image tracking. Nothing else.

## Folder structure

```
LC001-V2/
├── index.html
├── app.js
├── style.css
├── assets/
│   └── painting.jpg
├── targets/
│   └── targets.mind
└── README.md
```

## Setup steps (do these before it will work)

### 1. Add your painting image
Place your reference image at:
```
assets/painting.jpg
```
This repo does not include a real photo — you need to drop in the actual painting image you want to track. Use a well-lit, high-contrast, high-detail photo for best tracking.

### 2. Generate targets.mind
MindAR requires a compiled `.mind` file generated from your painting image — it can't be created from code, it must go through MindAR's official compiler:

1. Go to https://hiukim.github.io/mind-ar-js-doc/tools/compile
2. Upload `assets/painting.jpg`
3. Download the resulting `targets.mind` file
4. Place it at:
```
targets/targets.mind
```

### 3. Serve over HTTPS (or localhost)
Camera access requires a secure context. Options:
- `npx serve .` (then open the printed localhost URL)
- GitHub Pages (push this repo, enable Pages in repo settings)
- Any static host with HTTPS

Opening `index.html` directly via `file://` will **not** work — the camera won't be granted permission.

## What this does

- Loads A-Frame + MindAR's image-tracking module from CDN (no build step, no npm install required)
- Tracks `targets/targets.mind` (compiled from `assets/painting.jpg`)
- When the painting is recognized, a single semi-transparent green plane appears aligned to it
- No video, no audio, no debug panel, no loading screen

## Stack versions used

- A-Frame `1.5.0`
- MindAR (A-Frame build) `1.2.5`

Both are loaded via CDN `<script>` tags in `index.html` — check https://github.com/hiukim/mind-ar-js/releases for anything newer if you want to bump versions later.

## Next steps (not in Phase 1)

Do not add these yet — confirm the green plane locks onto the painting first:
- Replacing the plane with a 3D model or image overlay
- Multiple targets
- UI, animations, interactions
