# Gravity

Gravity is a local runtime interface for GitHub Actions, built on top of act. It lets you run, monitor, and debug your workflows locally through a modern desktop UI — no need to push to GitHub just to test a change.

## Features

- **Local Execution** — Run GitHub Actions workflows locally using act
- **Desktop App** — Modern Electrobun desktop interface
- **Go Backend** — Fast core engine in Go for executing workflows
- **TypeScript** — End-to-end type safety from Go to React
- **TailwindCSS** — Utility-first styling with shadcn/ui
- **Bun + Turborepo** — Optimized monorepo build system
- **JSON-RPC over STDIO** — Secure local communication between Go core and desktop

## Getting Started

```bash
# Install dependencies
bun install

# Build the Go core (required for desktop app)
make build-core

# Run the desktop application
bun run dev:hmr
```

Open the Gravity desktop app to start running your GitHub Actions workflows locally.

## Project Structure

```
gravity/
├── apps/
│   ├── gravity/      # Desktop application (Electrobun)
│   └── web/         # Website and documentation
├── packages/
│   ├── core/        # Go backend (bridge/engine)
│   └── ui/          # Shared UI components (shadcn/ui)
├── Makefile         # Go build commands
└── turbo.json       # Turborepo configuration
```

## Available Scripts

| Command | Description |
| `bun run dev` | Start all applications |
| `bun run build` | Build all applications |
| `bun run dev:hmr` | Run desktop app with HMR |
| `bun run build:desktop` | Build desktop app for release |
| `bun run check` | Run linting and formatting |
| `bun run check-types` | Type-check all packages |
| `make build-core` | Build Go core binary |
| `make test-core` | Run Go tests |

## Architecture

The desktop application communicates with the Go core via **JSON-RPC over STDIO**:

1. Electrobun spawns the Go binary as a child process
2. JSON-RPC requests are sent through stdin/stdout
3. Events are streamed back to the UI in real-time
4. ElysiaJS + Eden Treaty provide end-to-end type safety

## UI Customization

Shared UI components live in `packages/ui` using shadcn/ui primitives.

```bash
# Add new shared components
npx shadcn@latest add accordion dialog popover -c packages/ui
```

Import components:

```tsx
import { Button } from "@gravity/ui";
```

## Documentation

- [Contributing Guide](./CONTRIBUTING.md)
- [Core Package](./packages/core/README.md)
- [Desktop App](./apps/gravity/README.md)