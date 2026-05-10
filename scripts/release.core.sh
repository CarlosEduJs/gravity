#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CORE_DIR="$PROJECT_ROOT/packages/core"
BIN_DIR="$PROJECT_ROOT/apps/gravity/bin"
DRY_RUN=false
TAG=""
PLATFORMS=("linux/amd64" "linux/arm64" "darwin/amd64" "darwin/arm64" "windows/amd64" "windows/arm64")

GITHUB_REPO="${GITHUB_REPO:-$(git remote get-url origin 2>/dev/null | sed 's|.*github.com[/:]||' | sed 's|\.git$||')}"

EXCLUDE_PREFIXES=("^docs:" "^test:" "^chore:" "^ci:" "ai:")

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
    --tag TAG         Release tag (e.g., core/v0.1.0)
    --dry-run        Simulate release without creating on GitHub
    --platforms P    Comma-separated platforms (default: all)
    -h, --help      Show this help message

Examples:
    $(basename "$0") --tag core/v0.1.0 --dry-run
    $(basename "$0") --tag core/v0.1.0 --platforms linux/amd64,darwin/arm64
EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)
            TAG="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --platforms)
            IFS=',' read -ra PLATFORMS <<< "$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

VERSION=""
if [[ -n "$TAG" ]]; then
    VERSION="${TAG#core/v}"
    if [[ "$VERSION" == "$TAG" ]]; then
        VERSION="${TAG#v}"
    fi
fi

generate_changelog() {
    local previous_tag="$1"
    local changelog_file="$2"
    
    local GITHUB_REPO="${GITHUB_REPO:-$(git remote get-url origin 2>/dev/null | sed 's|.*github.com[/:]||' | sed 's|\.git$||')}"
    
    local exclude_filter=""
    for prefix in "${EXCLUDE_PREFIXES[@]}"; do
        if [[ -n "$exclude_filter" ]]; then
            exclude_filter="$exclude_filter|$prefix"
        else
            exclude_filter="${prefix:1}"
        fi
    done
    
    {
        echo "## What's Changed"
        echo ""
        
        local prs_raw
        if [[ -n "$previous_tag" ]]; then
            local since_ref
            since_ref=$(git rev-list -n1 "$previous_tag" 2>/dev/null || echo "")
            if [[ -n "$since_ref" ]]; then
                prs_raw=$(gh pr list --state merged --limit 20 --json number,title 2>/dev/null | python3 -c "import sys,json; [print(f'#{p[\"number\"]} {p[\"title\"]}') for p in json.load(sys.stdin)]" 2>/dev/null || "")
            fi
        else
            prs_raw=$(gh pr list --state merged --limit 20 --json number,title 2>/dev/null | python3 -c "import sys,json; [print(f'#{p[\"number\"]} {p[\"title\"]}') for p in json.load(sys.stdin)]" 2>/dev/null || "")
        fi
        
        local prs
        if [[ -n "$prs_raw" ]]; then
            if [[ -n "$exclude_filter" ]]; then
                prs=$(echo "$prs_raw" | grep -vE "$exclude_filter" || true)
            else
                prs="$prs_raw"
            fi
        fi
        
        if [[ -z "$prs" ]]; then
            echo "* No PRs since last release"
        else
            echo "$prs"
            echo ""
        fi
        
        echo "---"
        echo "*Full Changelog*: https://github.com/${GITHUB_REPO}/compare/${previous_tag:-main}...main"
    } > "$changelog_file"
}

get_previous_tag() {
    local tags
    tags=$(git tag --list 'core/v*' --sort=-creatordate 2>/dev/null | head -n 1)
    
    if [[ -n "$tags" ]]; then
        echo "$tags"
    else
        echo ""
    fi
}

build_platform() {
    local os="$1"
    local arch="$2"
    local output_dir="$3"
    
    local ext=""
    if [[ "$os" == "windows" ]]; then
        ext=".exe"
    fi
    
    local output_name="gravity-core-${VERSION}-${os}-${arch}"
    if [[ "$os" == "windows" ]]; then
        output_name="${output_name}.exe"
    fi
    
    export GOOS="$os"
    export GOARCH="$arch"
    (cd "$CORE_DIR" && go build -ldflags="-s -w -X g-core/internal/version.Version=${VERSION} -X g-core/internal/version.BuildDate=$(date -u +%Y-%m-%dT%H:%MZ)" -o "${output_dir}/${output_name}" "./cmd/gravity-core")
    
    echo "${output_dir}/${output_name}"
}

create_archive() {
    local binary="$1"
    local output_dir="$2"
    
    local name
    name=$(basename "$binary")
    local archive_name
    local dir="$output_dir"
    
    if [[ "$name" == *.exe ]]; then
        archive_name="${name%.exe}.zip"
        (cd "$dir" && zip -q "$archive_name" "$name")
    else
        archive_name="${name}.tar.gz"
        (cd "$dir" && tar -czf "$archive_name" "$name")
    fi
    
    echo "${output_dir}/${archive_name}"
}

main() {
    echo "==> Release: gravity-core $VERSION"
    echo ""
    
    if [[ -z "$TAG" ]]; then
        echo "Error: --tag is required"
        usage
        exit 1
    fi
    
    echo "Tag: $TAG"
    echo "Dry run: $DRY_RUN"
    echo "Platforms: ${PLATFORMS[*]}"
    echo ""
    
    local build_dir
    build_dir=$(mktemp -d)
    echo "==> Build directory: $build_dir"
    
    local release_dir="$build_dir/release"
    mkdir -p "$release_dir"
    
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "==> Building binaries..."
    
    for platform in "${PLATFORMS[@]}"; do
        local os="${platform%/*}"
        local arch="${platform#*/}"
        
        echo "Building: $os-$arch"
        
        build_platform "$os" "$arch" "$release_dir"
    done
    
    echo ""
    echo "==> Creating archives..."
    
    local archives=()
    for binary in "$release_dir"/*; do
        if [[ -f "$binary" ]]; then
            local archive
            archive=$(create_archive "$binary" "$release_dir")
            archives+=("$archive")
            
            if command -v shasum >/dev/null 2>&1; then
                shasum -a 256 "$archive" >> "$release_dir/checksums.txt"
            elif command -v sha256sum >/dev/null 2>&1; then
                sha256sum "$archive" >> "$release_dir/checksums.txt"
            fi
        fi
    done
    
    echo "Archives created: ${#archives[@]}"
    
    if [[ -f "$release_dir/checksums.txt" ]]; then
        echo ""
        echo "Checksums:"
        cat "$release_dir/checksums.txt"
    fi
    
    echo ""
    echo "==> Generating changelog..."
    
    local changelog_file="$release_dir/CHANGELOG.md"
    local previous_tag
    previous_tag=$(get_previous_tag)
    generate_changelog "$previous_tag" "$changelog_file"
    
    echo "Changelog:"
    cat "$changelog_file"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo ""
        echo "==> DRY RUN - No release will be created"
        echo "Archives are in: $release_dir"
        
        read -p "Press Enter to cleanup..."
        rm -rf "$build_dir"
        exit 0
    fi
    
    echo ""
    echo "==> Creating GitHub release..."
    
    local body_file
    body_file=$(mktemp)
    cat "$changelog_file" > "$body_file"
    
    local release_notes
    release_notes=$(cat "$body_file")
    
    gh release create "$TAG" \
        --title "Gravity Core $VERSION" \
        --notes "$release_notes" \
        "${archives[@]}"
    
    rm -f "$body_file"
    rm -rf "$build_dir"
    
    echo ""
    echo "==> Done! Release created: $TAG"
}

main "$@"