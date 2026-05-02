package engine

import (
	"context"
	"testing"
)

func TestSessionManager_RegisterCancelDeregister(t *testing.T) {
	sm := NewSessionManager()
	ctx, cancel := context.WithCancel(context.Background())
	sm.Register("run-1", cancel)

	if ok := sm.Cancel("run-1"); !ok {
		t.Fatalf("expected cancel to return true")
	}
	if ctx.Err() == nil {
		t.Fatalf("expected context to be canceled")
	}

	sm.Deregister("run-1")
	if ok := sm.Cancel("run-1"); ok {
		t.Fatalf("expected cancel to return false after deregister")
	}
}

func TestSessionManager_CancelMissing(t *testing.T) {
	sm := NewSessionManager()
	if ok := sm.Cancel("missing"); ok {
		t.Fatalf("expected cancel to return false for missing run")
	}
}
