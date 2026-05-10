# Packages: Core - Agent Guidelines

This document provides specific instructions for working in `packages/core`. **These rules complement and, in case of conflicts, override the global monorepo guidelines.**

## Subproject Overview

`packages/core` contains the **Gravity Bridge Core**, built natively in **Go**. Currently, it is in its first **Alpha** version.

The main responsibility of this package is to serve as the bridge or backend engine for the application, communicating with the desktop/Electrobun client (in `apps/gravity`).

### Communication Architecture (STDIO JSON-RPC)

The core communicates with the Electrobun application (Bun process) via a **JSON-RPC 2.0 over Standard I/O (STDIO)** protocol, rather than HTTP or TCP ports.
*   **Request/Response**: The core reads JSON-RPC requests line-by-line from `stdin`. It processes the command and writes the JSON-RPC response to `stdout`.
*   **Event Streaming**: The core also emits asynchronous notifications (events) by writing JSON objects with the method `gravity.event` to `stdout`.
*   **Security & Efficiency**: This child process model ensures that no external network ports are opened, keeping the bridge entirely local and secure.

## Build and Testing

Unlike the TypeScript applications that run via Turborepo and Bun, this project uses the Go toolchain in conjunction with the `Makefile` at the root of the monorepo.

*   **Local Build**: Run `make build-core` (from the monorepo root). This will compile the Go binary and place it in the path expected by the desktop application: `apps/gravity/bin/gravity-core`. NEVER compile the standalone binary without using the Makefile.
*   **Testing**: Run `make test-core` from the root or navigate into the directory and run `go test ./...`.
*   **Releases**: The release build process (`make release-core`) generates multi-platform binaries in `.bin/` at the root of the monorepo, while `goreleaser` configurations handle CI publishing.

## Code Style and Guidelines (Go)

*   Strictly adhere to standard Go styling guidelines. Before any commit or significant change, ensure the code passes `go fmt`.
*   Error handling: Make sure not to silence Go errors (`_ = func()`); handle all errors properly to avoid silent bugs in the bridge with the frontend.
*   Keep in mind that the project is in *Alpha* stage, so API design and internal structure may undergo drastic changes, but maintain backward compatibility in interfaces exposed to the desktop (e.g., Electrobun IPC or terminal APIs) unless otherwise instructed to break the contract.

## Common Agent Tasks

1.  **Communication/Bridge Refactoring**: Modify Go data structs that are serialized/deserialized to communicate with the TS/Electrobun frontend.
2.  **Add Unit Tests**: Create tests inside `packages/core/**/*_test.go` using native Go testing frameworks.
3.  **GoReleaser CI/CD Adjustments**: Update flags or environment variables in the `.goreleaser.core.yaml` hooks at the project root.
