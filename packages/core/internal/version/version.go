package version

import (
	"fmt"
)

// Injected at build time via ldflags
var (
	Version   = "dev"
	BuildDate = "unknown"
)

// ShowVersion prints version info
func ShowVersion() {
	fmt.Println("Version:", Version)
	fmt.Println("Build Date:", BuildDate)
}