# Art Villa World · 藝術家村

A 3D virtual art gallery world where each artist owns their own villa. Built with Three.js, no build step required.

## Concept

- **Outer shell**: Valley Villa exterior as the world entrance
- **Interior**: First-person 3D gallery for viewing and selling artwork
- **Extensible**: Data-driven system — add new artists by editing `data/artists.json`
- **First resident**: ICY's villa with 9 original artworks

## Quick Start

Serve the project with any static server:

```bash
npx serve .
```

Open:
- World hub: `http://localhost:3000/`
- Direct villa: `http://localhost:3000/villa.html?artist=icy`

## Controls

### Hub (Valley Villa)
- Drag to orbit · Scroll to zoom · Click the glowing portal to enter ICY's villa

### Gallery (Villa Interior)
- Click to lock mouse · WASD to walk · Mouse to look
- Point at artwork and click to view details and purchase info
- `←` button to return to world hub

## Adding a New Artist

1. Add artwork images to `data/artworks/`
2. Edit `data/artists.json` and add a new artist object with:
   - `id`, `name`, `tagline`, `bio`
   - `artworks` array with `image`, `title`, `year`, `price`, `position`
3. The system automatically generates their villa using the same engine.

## Tech Stack

- Three.js r169 (local, no CDN)
- Native ES modules
- No build step
- Vanilla HTML/CSS/JS

## License

© Art Villa World / ICY
