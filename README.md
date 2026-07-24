# Today OS — Milestone 3

A local-first personal operating system built on Milestones 1 and 2.

## Run

Open `index.html`, or run `python3 -m http.server 8080` in this folder.

## Milestone 3 additions

- Unified entity model: tasks, meetings, waiting items, notes, and ideas
- Daily Brief with smart metrics and suggestions
- Chronological Timeline view
- Full month Calendar with drag-and-drop rescheduling
- Real project workspaces
- People relationships using `@Name`
- Notes and Ideas view
- Advanced recurring rules: weekdays, every N weeks, first Monday, last Friday
- Raycast-style command palette
- Multiple themes: Linear, GitHub, Raycast, Terminal
- Focus mode with timer
- Local JSON import/export
- Automatic migration from Milestone 1 and 2 storage

## Capture examples

```text
! Prepare Haven interview tomorrow #Haven @Taek
meeting Product review Friday 3pm #Work @Laura
waiting for Taek in 3 days #Haven @Taek
note Pricing strategy ideas #OMS
Review metrics every weekday #Work
Monthly finance review first Monday #Personal
```

All data stays in the browser under `today-os-m3`.

## Deploy to Vercel

This package is configured for Vercel and does not require Vite.

- Build command: `npm run build`
- Output directory: `dist`
- Install command: leave as default
- Framework preset: `Other`

You can import the repository or upload this folder to Vercel. The included `vercel.json` supplies the build settings automatically.
