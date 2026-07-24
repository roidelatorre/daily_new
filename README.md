# Today v2 — Vercel Fixed

A private, one-page productivity app for personal use.

## Fix included

This release removes `framer-motion` and its incompatible `motion-dom` dependency, which caused Vercel builds to fail with:

`"activeAnimations" is not exported by motion-dom`

Animations now use dependency-free CSS. The interface and functionality remain the same.

## Local setup

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Replace the files in your GitHub repository with this version.
2. Commit and push.
3. Redeploy in Vercel.

Vercel settings:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Your saved app data remains in browser `localStorage`; updating the deployment does not erase it when the domain stays the same.
