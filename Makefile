.PHONY: build-core test-core

# Build the core Go binary and copy it to the gravity app bin directory
build-core:
	@echo "Building core binary..."
	@mkdir -p apps/gravity/bin
	cd packages/core && go build -o ../../apps/gravity/bin/gravity-core ./cmd/gravity-core
	@echo "Build complete. Binary moved to apps/gravity/bin/gravity-core"

# Run tests for the core package
test-core:
	@echo "Running tests for packages/core..."
	cd packages/core && go test ./...
 