# Gravity Core

The Go backend engine for Gravity. It handles the execution of GitHub Actions workflows locally through the act binary.

## Overview

- **Language**: Go (Alpha version)
- **Communication**: JSON-RPC 2.0 over Standard I/O (STDIO)
- **Purpose**: Bridge/engine for running GitHub Actions locally

## Building

```bash
# Build the core binary
make build-core

# Run tests
make test-core
```

The compiled binary is placed at `apps/gravity/bin/gravity-core`.

## Architecture

The core communicates with the desktop application via **STDIO JSON-RPC**:

- **Requests**: JSON-RPC requests are read line-by-line from stdin
- **Responses**: JSON-RPC responses are written to stdout
- **Events**: Async notifications use the method `gravity.event`

This approach keeps the bridge entirely local — no network ports required.

## Usage

The core is automatically spawned by the desktop application. To test manually:

```bash
# Run the built binary
./apps/gravity/bin/gravity-core

# Send a JSON-RPC request (example)
echo '{"jsonrpc":"2.0","method":"gravity.version","id":1}' | ./apps/gravity/bin/gravity-core
```

## API

The core exposes JSON-RPC methods for:
- Listing workflows
- Running workflows
- Monitoring execution status
- Handling events and logs

## Development

Follow Go styling guidelines (`go fmt`). Always handle errors properly — never silence them.