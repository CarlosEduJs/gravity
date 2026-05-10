# Apps: Gravity - Agent Guidelines

This document provides specific instructions for working in `apps/gravity`. **These rules complement and, in case of conflicts, override the global monorepo guidelines.**

## Subproject Overview

`apps/gravity` is the frontend/desktop application of the ecosystem, built using **Electrobun**. This application is still in its **early development phase** for the first release version.

The application inherently depends on the compiled binary from `packages/core` for its full operation.

### Core Communication Architecture

The communication between this Electrobun application and the Go Core (`packages/core`) works through a child process model:
*   **Process Spawning**: The Bun backend process (`src/bun/core.ts`) uses `spawn` to start the compiled `gravity-core` binary as a child process.
*   **STDIO JSON-RPC**: It communicates with the Go process using the **JSON-RPC 2.0** protocol directly through standard input (`stdin`) and standard output (`stdout`).
*   **Elysia & Eden Treaty Wrapper**: To provide end-to-end type safety, these raw JSON-RPC STDIO calls are wrapped by a local **ElysiaJS** server within the Bun process. The React frontend interacts with this Elysia server using **Eden Treaty**, ensuring that all bridge calls are strictly typed from the UI down to the Go binary.

## Execution and Build

The application is orchestrated via Turborepo, with scripts defined in the `package.json` at the root of the monorepo and referenced internally within this package.

*   **To run in development environment**: At the root of the monorepo, run `bun run dev:hmr`.
*   **To build the stable version**: At the root of the monorepo, run `bun run build:desktop`.
*   **Critical Dependency (Core)**: The desktop needs the compiled `gravity-core` binary to function. Remember to run `make build-core` at the root before testing locally to have the latest core version available in `apps/gravity/bin/`.

## Code Style and Guidelines

*   **UI/Design**: The application will seek to adopt modern best practices for web/desktop development, possibly using frameworks like React, and utilizing the Electrobun infrastructure.
*   **Typing**: Use strict TypeScript (`strict: true`). Linting and formatting are handled globally by `oxlint` and `oxfmt` (via `bun run check`).

## Common Agent Tasks

1.  **User Interface (UI) Creation**: Develop new user interface views within the Electrobun context.
2.  **Integration with the Core**: Write asynchronous functions that call (via RPC or child_process, depending on how the bridge is implemented) the endpoints or commands exposed by the binary in `packages/core`.
3.  **State Management**: Since the app is in early development, assist in the initial setup of stores (Zustand, Redux, Context API) for reactive communication between Go Core responses and the UI.
