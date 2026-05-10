# Gravity Desktop

The Gravity desktop application built with Electrobun.

## Getting Started

```bash
# Install dependencies (at monorepo root)
bun install

# Build Go core (required dependency)
make build-core

# Run in development with HMR
bun run dev:hmr

# Build for production
bun run build:desktop
```

## How It Works

### Core Communication

The desktop app communicates with the Go core (`packages/core`) through a child process model:

1. **Process Spawning**: The Bun backend (`src/bun/core.ts`) spawns `gravity-core` as a child process
2. **STDIO JSON-RPC**: Communication happens via JSON-RPC 2.0 over stdin/stdout
3. **Type Safety**: ElysiaJS + Eden Treaty wrap the raw JSON-RPC calls for end-to-end typing

### HMR Flow

When running `bun run dev:hmr`:

1. Vite dev server starts on `http://localhost:5173` with HMR
2. Electrobun detects the running Vite server
3. React components update instantly without full reload

## Project Structure

```
src/
├── bun/
│   └── core.ts      # Backend process (spawns Go core)
├── mainview/
│   ├── App.tsx     # React app
│   ├── main.tsx    # Entry point
│   └── index.html  # HTML template
├── stores/         # State management
└── components/    # React components
```

## Dependencies

- **Go Core**: Requires compiled `gravity-core` binary in `bin/`
- **UI Package**: Consumes shared components from `@gravity/ui`

## Common Tasks

- Add new UI components
- Integrate new core commands via RPC
- Set up state management for Go responses