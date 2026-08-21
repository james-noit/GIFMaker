# GIFMaker

A mobile-first Angular app for turning a handful of photos into a GIF, entirely in the browser.

## Features

- **Image loader** — drop or pick photos of any common format; each one is resized to a
  thumbnail and animated into the timeline below.
- **Timeline** — drag and drop to reorder frames (via `@angular/cdk` drag-drop), width adapts
  to the number of photos, remove any frame inline.
- **Playback** — a play button and a configurable per-frame delay (default `0.5s`) preview the
  GIF in the same area used for uploading.
- **Export** — the header menu renders the timeline to an actual GIF (via `gif.js`, off the
  main thread using a web worker) and downloads it.
- **Themes** — a light "Japanese notebook" theme and a dark "Night Dracula" theme, toggled from
  the header and persisted across sessions.
- **Clear & reset** — wipes the timeline and local storage.

## Performance notes

- Only a resized JPEG thumbnail (≤480px, persisted as a data URL) is written to
  `localStorage`; the full-resolution photo lives only in memory for the current session as an
  object URL, so adding many large photos does not blow up storage. On reload, frames restore
  from their thumbnail and are flagged for re-upload if you export before adding them again.
- GIF encoding runs in a Web Worker via `gif.js` and is capped at a sane output resolution to
  keep memory/CPU bounded regardless of source photo size.
- Drag-and-drop, upload-to-timeline, and spinner animations are done with CSS
  transitions/keyframes (GPU-friendly transforms/opacity) rather than JS-driven animation, and
  respect `prefers-reduced-motion`.

## Development

```bash
npm install
npm start        # dev server on http://localhost:4200
npm run build     # production build
npm test          # unit tests
```
