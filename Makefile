.PHONY: build-core test-core release-core clean

CORE_VERSION := 0.1.0-alpha.0
CORE_BUILD_DATE := $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')
CORE_LDFLAGS := -X 'g-core/internal/version.Version=$(CORE_VERSION)' -X 'g-core/internal/version.BuildDate=$(CORE_BUILD_DATE)'
CORE_BINARY_NAME := gravity-core
CORE_OUT_DIR := .bin
CORE_LOCAL_BIN := apps/gravity/bin/$(CORE_BINARY_NAME)

# Local development build (current OS/ARCH)
build-core:
	@echo "Building core binary v$(CORE_VERSION) for local development..."
	@mkdir -p apps/gravity/bin
	cd packages/core && go build -ldflags "$(CORE_LDFLAGS)" -o ../../$(CORE_LOCAL_BIN) ./cmd/gravity-core
	@echo "Done! Local binary at $(CORE_LOCAL_BIN)"

# Release build for multiple platforms
release-core: clean
	@echo "Building releases for v$(CORE_VERSION)..."
	@mkdir -p $(CORE_OUT_DIR)
	
	# Linux
	GOOS=linux GOARCH=amd64 cd packages/core && go build -ldflags "$(CORE_LDFLAGS)" -o ../../$(CORE_OUT_DIR)/$(CORE_BINARY_NAME)-$(CORE_VERSION)-linux-amd64 ./cmd/gravity-core
	GOOS=linux GOARCH=arm64 cd packages/core && go build -ldflags "$(CORE_LDFLAGS)" -o ../../$(CORE_OUT_DIR)/$(CORE_BINARY_NAME)-$(CORE_VERSION)-linux-arm64 ./cmd/gravity-core
	
	# Windows
	GOOS=windows GOARCH=amd64 cd packages/core && go build -ldflags "$(CORE_LDFLAGS)" -o ../../$(CORE_OUT_DIR)/$(CORE_BINARY_NAME)-$(CORE_VERSION)-windows-amd64.exe ./cmd/gravity-core
	
	# macOS (Darwin)
	GOOS=darwin GOARCH=amd64 cd packages/core && go build -ldflags "$(CORE_LDFLAGS)" -o ../../$(CORE_OUT_DIR)/$(CORE_BINARY_NAME)-$(CORE_VERSION)-darwin-amd64 ./cmd/gravity-core
	GOOS=darwin GOARCH=arm64 cd packages/core && go build -ldflags "$(CORE_LDFLAGS)" -o ../../$(CORE_OUT_DIR)/$(CORE_BINARY_NAME)-$(CORE_VERSION)-darwin-arm64 ./cmd/gravity-core
	
	@echo "All release binaries are in $(CORE_OUT_DIR)/"

test-core:
	@echo "Running tests for packages/core..."
	cd packages/core && go test ./...

clean:
	@echo "Cleaning up..."
	rm -rf $(CORE_OUT_DIR)
	@echo "Clean complete."