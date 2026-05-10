package main

import (
	"bufio"
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"g-core/internal/bridge"
	"g-core/internal/engine"
	"g-core/internal/eventbus"
	"g-core/internal/version"
)

const shutdownTimeout = 5 * time.Second

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

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer func() {
		stop()
		if sessions.ActiveRuns() > 0 {
			sessions.CancelAll()
			<-time.After(shutdownTimeout)
		}
		os.Exit(0)
	}()

	go func() {
		<-ctx.Done()
		if sessions.ActiveRuns() > 0 {
			sessions.CancelAll()
			<-time.After(shutdownTimeout)
		}
		os.Exit(0)
	}()

	for scanner.Scan() {
		appBridge.Handle(scanner.Bytes())
	}
}