# Today OS — Milestone 3 IndexedDB Edition

A Vercel-ready, local-first personal operating system.

## Storage

This edition stores the application state in the browser's **IndexedDB** database:

- Database: `today-os-db`
- Object store: `app_state`
- Record: `current`

On first launch, the app automatically checks the previous keys:

- `today-os-m3`
- `today-os-m2`
- `today-os-m1`

When legacy data exists, it is copied into IndexedDB automatically. The original localStorage value is left intact as a safety backup.

The app also asks the browser for persistent storage when supported. Browser policies still apply: data may be removed when the user clears site data, uses private browsing, or accesses the app from a different browser, device, or domain.

Use **Cmd/Ctrl + K → Storage status** to see IndexedDB usage and whether persistent storage was granted.

## Vercel deployment

Use these settings:

```text
Framework Preset: Other
Build Command: npm run build
Output Directory: dist
```

The included `vercel.json` normally configures this automatically.

## Local development

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Backup

Use the command palette to export data to JSON. IndexedDB is durable browser storage, but JSON exports remain the safest portable backup.
