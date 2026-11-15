# Mars: Last Colony: promo website

A one-page scrolling website for the NASA Space Apps Challenge 2026, ending with links to the game and the GitHub repo. Every image is captured in the game.

Live at https://mars-game-nu.vercel.app/nasaspaceapschallange. It deploys with the game: every push to `main` updates both.

It is plain static HTML: `index.html`, `style.css`, `main.js` and `img/`. Asset paths start with `/nasaspaceapschallange/`, so keep this folder name (or update those paths if you rename it).

## Preview locally
From the repo root:
```bash
python -m http.server 8125
```
Then open http://localhost:8125/nasaspaceapschallange/.
