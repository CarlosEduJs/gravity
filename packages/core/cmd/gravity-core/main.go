package main

import (
	"bufio"
	"os"

	"g-core/internal/bridge"
	"g-core/internal/engine"
	"g-core/internal/eventbus"
	"g-core/internal/version"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "info" {
		version.ShowVersion()
		return
	}

	bus := eventbus.NewMemoryBus()
	sessions := engine.NewSessionManager()
	adapter := engine.NewActAdapter(bus, sessions)
	
	appBridge := bridge.New(bus, sessions, adapter)
	scanner := bufio.NewScanner(os.Stdin)

	for scanner.Scan() {
		appBridge.Handle(scanner.Bytes())
	}
}
