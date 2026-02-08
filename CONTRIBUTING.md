# Contributing to TabAla

Thank you for your interest in contributing! This guide contains everything you need to get started.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Make](https://www.gnu.org/software/make/)
- Google Chrome or Chromium

## Development Setup

```bash
# Clone the repository
git clone https://github.com/vinimlo/tabAla.git
cd tabAla

# Start the development environment
make dev
```

### Available Commands

All commands are executed via Docker through the Makefile:

| Command | Description |
|---------|-------------|
| `make help` | List all available commands |
| `make dev` | Start development server (interactive mode) |
| `make dev-detached` | Start development server (background) |
| `make build` | Build the extension for production |
| `make test` | Run test suite with Vitest |
| `make test-watch` | Run tests in watch mode |
| `make test-ui` | Open Vitest visual interface |
| `make test-coverage` | Generate test coverage report |
| `make lint` | Run ESLint for code validation |
| `make lint-fix` | Run ESLint with auto-fix |
| `make shell` | Open interactive shell in the container |
| `make lockfile` | Regenerate package-lock.json |
| `make clean` | Remove build artifacts (dist/) |
| `make stop` | Stop all running containers |

> **Note:** Do not run npm commands directly. Always use make commands to ensure environment consistency.

### Loading the Extension in Chrome

1. Run `make build`
2. Go to `chrome://extensions`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the `dist/` folder

To reload after changes: click the reload icon (🔄) on the extension card.

## Architecture

### Tech Stack

| Technology | Usage |
|------------|-------|
| [Svelte](https://svelte.dev/) | Lightweight reactive UI |
| [TypeScript](https://www.typescriptlang.org/) | Static typing |
| [Vite](https://vitejs.dev/) | Fast builds |
| [Vitest](https://vitest.dev/) | Unit testing |
| [Docker](https://www.docker.com/) | Development environment |
| [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/) | Platform |

### Folder Structure

```
tabAla/
├── src/
│   ├── popup/           # Popup UI (Svelte)
│   │   ├── App.svelte
│   │   ├── components/
│   │   └── stores/
│   ├── background/      # Service worker
│   │   └── index.ts
│   ├── lib/             # Shared logic
│   │   ├── storage.ts   # chrome.storage wrapper
│   │   └── types.ts     # TypeScript types
│   └── manifest.json    # Manifest V3
├── public/              # Static assets (icons)
├── tests/               # Unit tests
├── docs/                # Documentation
│   └── mvp.md
├── dist/                # Build output (gitignore)
├── Dockerfile           # Development image
├── docker-compose.yml   # Container orchestration
└── Makefile             # Automation commands
```

### Main Components

- **Popup**: Svelte interface rendered when clicking the extension icon
- **Service Worker**: Background script for commands and shortcuts
- **Storage Layer**: Abstraction over chrome.storage.local

### Data Flow

```
[User] → [Popup/Shortcut] → [Storage Layer] → [chrome.storage.local]
                                    ↓
                              [State Store (Svelte)]
                                    ↓
                              [Updated UI]
```

### Entities

```typescript
interface Link {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  collectionId: string;
  createdAt: number;
}

interface Collection {
  id: string;
  name: string;
  order: number;
}
```

### Business Rules

- **Inbox**: Default collection that always exists and cannot be deleted
- **Orphan links**: Links from deleted collections are moved to Inbox
- **Uniqueness**: The same URL can exist in multiple collections
- **Sorting**: Links sorted by date (most recent first)

## Code Conventions

- Svelte components: PascalCase (`LinkItem.svelte`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase
- Prefer `const` over `let`
- Use async/await (never callbacks for storage)

### Anti-Patterns

- **Do not use** synchronous chrome.storage APIs (deprecated)
- **Do not store** sensitive data (passwords, tokens)
- **Do not use** Manifest V2 — always V3
- **Avoid** large bundles — keep the extension lightweight (<500KB)
- **Do not block** UI during storage operations
- **Never** hardcode credentials or API keys

## Tests

```bash
# Run all tests
make test

# Run in watch mode (rerun on save)
make test-watch

# Open Vitest visual interface
make test-ui

# Generate coverage report
make test-coverage
```

## Troubleshooting

### Container does not start

- Check if port 5173 is in use: `lsof -i :5173`
- Confirm Docker is running: `docker info`

### Hot-reload is not working

- Make sure the volume is mounted correctly
- On macOS/Windows, enable file sharing for the project directory
- Check the logs: `docker-compose logs -f`

### Permission errors

- The container runs as user `node` (uid 1000)
- If needed, adjust permissions: `chmod -R 755 .`

### Extension does not appear in Chrome

- Verify that `make build` ran without errors
- Confirm the `dist/` folder exists and contains `manifest.json`
- Try removing the extension and loading it again

### Changes do not appear in the extension

- Run `make build` to generate the new bundle
- In `chrome://extensions`, click the reload icon (🔄) on the extension
- If it persists, remove the extension and load it again

## Contribution Workflow

1. Fork the project
2. Create a branch (`git checkout -b feature/new-feature`)
3. Make your changes
4. Run the tests (`make test`)
5. Validate the code (`make lint`)
6. Commit your changes (`git commit -m 'Add new feature'`)
7. Push to the branch (`git push origin feature/new-feature`)
8. Open a Pull Request

## Useful Links

- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/)
- [Svelte Docs](https://svelte.dev/docs)
- [docs/mvp.md](./docs/mvp.md) — Full MVP specification
