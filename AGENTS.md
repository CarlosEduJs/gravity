# Gravity Monorepo - Agent Guidelines

Welcome to the **Gravity** monorepo! This file provides global guidelines for AI agents working in this project. Follow the instructions below to ensure consistency across the codebase.

## Monorepo Overview

This project is a monorepo managed with **Bun workspaces** and **Turborepo** (`turbo`). It houses the Gravity ecosystem, which includes:
- The core (backend/bridge) built in Go (`packages/core`).
- The desktop application built with Electrobun (`apps/gravity`).
- The project's website and documentation (`apps/web`).

## Setup and Installation

*   **Package Manager**: The project strictly uses **Bun**. DO NOT use `npm`, `yarn`, or `pnpm`.
*   **Global Installation**: Run `bun install` at the root of the monorepo to install all dependencies for the Node/TypeScript subprojects.
*   **Task Management**: Use Turborepo commands exposed in the root `package.json` for daily tasks (e.g., `bun run dev`, `bun run build`, `bun run check-types`).

## Style and Formatting Guidelines

*   **TypeScript/JavaScript**: The project uses `oxlint` and `oxfmt` for extremely fast linting and formatting.
    *   Always run `bun run check` at the root for automatic linting and formatting.
*   **Go**: Go code located in `packages/core` must follow the standard language formatting (`go fmt`).
*   **Language**: Code comments and technical documentation should preferably be in English, or according to the standard already established in the file.

## CI/CD, Testing and Makefile

At the root of the project, there is a **Makefile** dedicated mainly to managing the build, testing, and release of the Go component (`packages/core`):
*   `make build-core`: Compiles the core binary for local development and places it in the correct directory (`apps/gravity/bin/`).
*   `make test-core`: Runs unit tests for the Go layer.
*   `make release-core`: Compiles the core for supported platforms (Linux, Windows, macOS).

CI/CD (usually via GitHub Actions) relies heavily on `turbo` for the TS ecosystem and the Makefile / Goreleaser for Go.

## Security Considerations and Pitfalls

*   **Local Dependencies**: Packages share internal dependencies via Bun workspaces (e.g., `workspace:*`). Always declare dependencies using `workspace:*` or `catalog:` (Bun 1.x / Turborepo feature) if the package already exists in the monorepo to avoid duplication and breaking contracts.
*   **Agent Execution**: **Pay attention to the priority of `AGENTS.md` files!** Each subproject (e.g., `apps/gravity`, `packages/core`) has its own nested `AGENTS.md` file. The guidelines in the nested file take precedence over these global rules in case of conflict.

---
*Note: Check the `AGENTS.md` files inside `apps/*` and `packages/*` for instructions specific to the subproject context you are editing.*
