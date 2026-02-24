# Screenshot Generation

Reproducible screenshot generation for TabAla using Playwright MCP.

Powered by [screenshot-studio](../../../screenshot-studio/) — a standalone, reusable screenshot generation system.

## Architecture

```
┌─────────────┐     ┌──────────────────────────────┐     ┌────────────────┐
│ Backup JSON │────▶│ screenshot-studio/             │────▶│ init-script.js │
│ (user data) │     │ generate-init-script.js        │     │  (chrome mock) │
└─────────────┘     └──────────────────────────────┘     └───────┬────────┘
                              ▲                                   │
                    ┌─────────┘                                   ▼
              ┌─────┴──────┐                      ┌──────────────────────┐
              │ pt_BR/     │                      │   Playwright MCP     │
              │ messages   │                      │   (browser_navigate, │
              │   .json    │                      │    addInitScript,     │
              └────────────┘                      │    take_screenshot)   │
                                                  └──────────┬───────────┘
                    ┌─────────────┐                           │
                    │ config.json │──────────────────────────▶│
                    │ (project +  │                           ▼
                    │  6 screens) │               ┌──────────────────┐
                    └─────────────┘               │  store-assets/    │
                                                  │  screenshots/     │
                                                  │  *.png (1280x800) │
                                                  └──────────────────┘
```

## Quick Start

Use the Claude Code slash command:

```
/screenshots ~/Downloads/tabala-backup.json
```

This runs the full pipeline: build → generate chrome mock → serve → screenshot → post-process.

The `/screenshots` command is a symlink to `screenshot-studio/commands/screenshots.md`, so improvements to the command propagate automatically.

## Files

| File | Purpose |
|------|---------|
| `config.json` | Project config + declarative screenshot definitions (6 entries) |
| `dist/init-script.js` | Generated output (gitignored) |

The chrome mock generator (`generate-init-script.js`) and popup wrapper HTML live in [screenshot-studio](../../../screenshot-studio/) and are referenced automatically by the slash command.

## How to Add/Modify Screenshots

Edit the `screenshots` array in `config.json`:

```json
{
  "id": "07-new-feature",
  "description": "Description of what the screenshot shows",
  "page": "newtab",
  "workspaceId": "general",
  "actions": [
    { "type": "click", "target": "Human-readable element description" },
    { "type": "type", "text": "Search text", "slowly": true }
  ],
  "waitMs": 2000
}
```

- `id` — filename (without .png) and ordering prefix
- `page` — key from `project.pages` (`"newtab"` or `"popup"`)
- `workspaceId` — which workspace to activate (for newtab pages)
- `actions` — sequence of interactions before taking the screenshot
- `target` — human-readable description; Claude interprets it via `browser_snapshot`
- `waitMs` — milliseconds to wait after navigation for rendering

## How to Update Seed Data

1. Export a new backup from TabAla (Settings → Export)
2. Run `/screenshots ~/Downloads/new-backup.json` to regenerate all screenshots

## Troubleshooting

See the [screenshot-studio README](../../../screenshot-studio/README.md) for full troubleshooting guide.

### Quick Reference

| Symptom | Fix |
|---------|-----|
| Blank page | Ensure init script registered before navigation |
| Raw i18n keys visible | Regenerate init script |
| Wrong workspace | Check workspaceId in config |
| Favicons missing | Increase waitMs to 3000+ |
| Page shows onboarding | Verify storageDefaults in project config |

## Chrome Web Store Requirements

- **Dimensions:** 1280x800 px (or 640x400)
- **Format:** PNG, 24-bit, no alpha channel
- **Quantity:** 1–5 screenshots per listing
- **Post-processing:** `sips -z 800 1280` ensures exact dimensions
