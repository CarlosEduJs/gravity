.PHONY: build-core test-core release-core clean

VERSION := 0.1.0-alpha.0
BUILD_DATE := $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')
LDFLAGS := -X 'g-core/internal/version.Version=$(VERSION)' -X 'g-core/internal/version.BuildDate=$(BUILD_DATE)'
BINARY_NAME := gravity-core
OUT_DIR := .bin
LOCAL_BIN := apps/gravity/bin/$(BINARY_NAME)

# Local development build (current OS/ARCH)
build-core:
	@echo "Building core binary v$(VERSION) for local development..."
	@mkdir -p apps/gravity/bin
	cd packages/core && go build -ldflags "$(LDFLAGS)" -o ../../$(LOCAL_BIN) ./cmd/gravity-core
	@echo "Done! Local binary at $(LOCAL_BIN)"

# Release build for multiple platforms
release-core: clean
	@echo "Building releases for v$(VERSION)..."
	@mkdir -p $(OUT_DIR)
	
	# Linux
	GOOS=linux GOARCH=amd64 cd packages/core && go build -ldflags "$(LDFLAGS)" -o ../../$(OUT_DIR)/$(BINARY_NAME)-$(VERSION)-linux-amd64 ./cmd/gravity-core
	GOOS=linux GOARCH=arm64 cd packages/core && go build -ldflags "$(LDFLAGS)" -o ../../$(OUT_DIR)/$(BINARY_NAME)-$(VERSION)-linux-arm64 ./cmd/gravity-core
	
	# Windows
	GOOS=windows GOARCH=amd64 cd packages/core && go build -ldflags "$(LDFLAGS)" -o ../../$(OUT_DIR)/$(BINARY_NAME)-$(VERSION)-windows-amd64.exe ./cmd/gravity-core
	
	# macOS (Darwin)
	GOOS=darwin GOARCH=amd64 cd packages/core && go build -ldflags "$(LDFLAGS)" -o ../../$(OUT_DIR)/$(BINARY_NAME)-$(VERSION)-darwin-amd64 ./cmd/gravity-core
	GOOS=darwin GOARCH=arm64 cd packages/core && go build -ldflags "$(LDFLAGS)" -o ../../$(OUT_DIR)/$(BINARY_NAME)-$(VERSION)-darwin-arm64 ./cmd/gravity-core
	
	@echo "All release binaries are in $(OUT_DIR)/"

test-core:
	@echo "Running tests for packages/core..."
	cd packages/core && go test ./...

clean:
	@echo "Cleaning up..."
	rm -rf $(OUT_DIR)
	@echo "Clean complete."