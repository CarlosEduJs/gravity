# Contributing to Gravity

Thank you for your interest in contributing to Gravity! This guide provides everything you need to know to set up your development environment, understand the architecture, and make your first contribution.

## Project Overview

Gravity is a monorepo managed with **Bun workspaces** and **Turborepo** containing:

- **packages/core** — The Go backend/bridge (Alpha version)
- **apps/gravity** — The desktop application built with Electrobun (In Development for first release version)
- **apps/web** — The project website and documentation (Not yet implemented)
- **packages/ui** — Shared UI component library using shadcn/ui (UI Kit to apps/gravity and potentially apps/web in the future)

## Prerequisites

- **Bun** — The project strictly uses Bun as the package manager. Do not use npm, yarn, or pnpm.
- **Go** — Required for building packages/core (version 1.21+ recommended)
- **Make** — Used for Go build commands

## Setting Up

1. Clone the repository:
   ```bash
   git clone https://github.com/carlosedujs/gravity.git
   cd gravity
   ```

2. Install all dependencies:
   ```bash
   bun install
   ```

3. Build the Go core binary:
   ```bash
   make build-core
   ```

## Development Commands

### General

| Command | Description |
| `bun run dev` | Start all applications in development mode |
| `bun run build` | Build all applications for production |
| `bun run check` | Run linting and formatting (oxlint + oxfmt) |
| `bun run check-types` | Type-check all TypeScript packages |

### Desktop Application

| Command | Description |
| `bun run dev:hmr` | Run desktop app with hot module reload |
| `bun run build:desktop` | Build stable desktop version |

### Go Core

| Command | Description |
| `make build-core` | Compile core binary to `apps/gravity/bin/` |
| `make test-core` | Run Go unit tests |
| `make release-core` | Build release binaries for all platforms |

## Architecture

### Core Communication (JSON-RPC over STDIO)

The core (`packages/core`) communicates with the desktop app (`apps/gravity`) via **JSON-RPC 2.0 over Standard I/O**:

1. The Electrobun process spawns `gravity-core` as a child process
2. JSON-RPC requests are written to stdin
3. Responses are read from stdout
4. Events are streamed as JSON objects with method `gravity.event`

This architecture ensures no external network ports are needed, keeping the bridge local and secure.

### UI Layer

- **packages/ui** provides shared components using shadcn/ui
- **apps/gravity** consumes these components via workspace references
- Type safety is maintained from Go → JSON-RPC → ElysiaJS → React frontend

### Important

- Do not write logs to stdout in the Go core
- stdout is reserved for JSON-RPC communication
- use stderr or structured logging instead

### Docker Requirement

Gravity uses Docker internally via act to run workflows.

Make sure Docker is installed and running.

## Code Style

### TypeScript/JavaScript

- Use **oxlint** and **oxfmt** for linting and formatting
- Run `bun run check` before committing
- Strict TypeScript is enforced (`strict: true`)

### Go

- Follow standard Go formatting with `go fmt`
- Never silence errors (`_ = func()`)
- Handle all errors properly

### Documentation

- Write documentation in English
- Use Markdown (`.md` or `.mdx`) for documentation files
- Include code examples reflecting the current version

## Testing

### TypeScript

Run tests via Turborepo:
```bash
bun run test
```

### Go

```bash
make test-core
# or
cd packages/core && go test ./...
```

## First Contribution

If you're new, here are good places to start:

- Fix small UI bugs in `apps/gravity`
- Improve documentation in `apps/web`
- Add tests in `packages/core`
- Improve Core with features or fixes in `packages/core`
- Fix typos and grammar in the documentation

Look for issues labeled `good first issue` or ask in the community channels if you're unsure where to start.

## Pull Request Guidelines

1. **Branch naming**: Use `feature/`, `fix/`, or `refactor/` prefixes
2. **Commits**: Write clear, concise commit messages
3. **Checks**: Ensure all linting and tests pass before submitting
4. **Description**: Include context about what and why in your PR

## Project Structure

```
gravity/
├── apps/
│   ├── gravity/        # Desktop application
│   └── web/           # Documentation site
├── packages/
│   ├── core/          # Go backend
│   └── ui/            # Shared UI components
├── Makefile           # Go build commands
├── turbo.json         # Turborepo configuration
└── package.json      # Workspace root
```

## Getting Help

- Check existing issues on GitHub
- Review the AGENTS.md files in each subproject for additional internal guidelines.

---

*By contributing to Gravity, you agree to follow the code of conduct and styling guidelines established in this project.*