# Daily Lessons

A small offline-first PWA that shows one life lesson a day from Stoics, philosophers and modern thinkers. It uses plain HTML, CSS and JavaScript, with no frameworks and no build step.

## Features

- **Lesson of the day:** the same lesson all day, changing at local midnight. No lesson repeats until all of them have been shown.
- **Next / Previous:** shuffles without repeats, so you see every lesson (in the current category) before any comes back. Swipe left or right, or use the arrow keys.
- **Favorites:** tap the heart to save a lesson. Favorites are stored in `localStorage`.
- **Category filter:** Stoic, Discipline, Mindset, Relationships, Purpose, Wisdom.
- **Share:** uses the Web Share API, or copies to the clipboard where sharing isn't supported.
- **Installable and offline:** a service worker caches every asset.

## Run locally

```sh
cd lessons-pwa
python -m http.server 8000
```

Open <http://localhost:8000>. Service workers need `localhost` or HTTPS, so opening `index.html` directly from the file system won't work.

## Deploy to GitHub Pages

1. Create a repository on GitHub, then push:
   ```sh
   git remote add origin https://github.com/<you>/lessons-pwa.git
   git push -u origin main
   ```
2. In the repo, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, and pick `main` / `/ (root)`.
3. The app will be live at `https://<you>.github.io/lessons-pwa/`. All paths are relative, so it works in that subfolder.
4. On your phone, open the URL and choose **Add to Home screen** or **Install app**.

## Updating content

Edit `lessons.json` (fields: `id`, `figure`, `lesson`, `category`) and give every new lesson a unique `id`. After changing any file, bump `CACHE` in `sw.js` (for example `daily-lessons-v2`) so installed copies pick up the update.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup |
| `style.css` | Dark, mobile-first styles with safe-area padding |
| `app.js` | App logic |
| `sw.js` | Service worker (offline cache) |
| `manifest.json` | PWA manifest |
| `lessons.json` | Lesson content |
| `icons/` | App icons (192, 512 PNG and SVG) |
