.PHONY: build-core test-core

VERSION := 0.1.0-alpha.0
BUILD_DATE := $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')
LDFLAGS := -X 'g-core/internal/version.Version=$(VERSION)' -X 'g-core/internal/version.BuildDate=$(BUILD_DATE)'

# Build the core Go binary and copy it to the gravity app bin directory
build-core:
	@echo "Building core binary v$(VERSION)..."
	@mkdir -p apps/gravity/bin
	cd packages/core && go build -ldflags "$(LDFLAGS)" -o ../../apps/gravity/bin/gravity-core ./cmd/gravity-core
	@echo "Build complete. Binary moved to apps/gravity/bin/gravity-core"

# Run tests for the core package
test-core:
	@echo "Running tests for packages/core..."
	cd packages/core && go test ./...