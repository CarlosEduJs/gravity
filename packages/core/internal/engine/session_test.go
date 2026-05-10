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

func TestSessionManager_CancelAll(t *testing.T) {
	sm := NewSessionManager()

	ctx1, cancel1 := context.WithCancel(context.Background())
	ctx2, cancel2 := context.WithCancel(context.Background())
	sm.Register("run-1", cancel1)
	sm.Register("run-2", cancel2)

	if sm.ActiveRuns() != 2 {
		t.Fatalf("expected 2 active runs, got %d", sm.ActiveRuns())
	}

	sm.CancelAll()

	if ctx1.Err() == nil {
		t.Fatalf("expected ctx1 to be canceled")
	}
	if ctx2.Err() == nil {
		t.Fatalf("expected ctx2 to be canceled")
	}
	if sm.ActiveRuns() != 0 {
		t.Fatalf("expected 0 active runs after CancelAll, got %d", sm.ActiveRuns())
	}
}

func TestSessionManager_ActiveRuns(t *testing.T) {
	sm := NewSessionManager()

	if sm.ActiveRuns() != 0 {
		t.Fatalf("expected 0 active runs initially")
	}

	ctx, cancel := context.WithCancel(context.Background())
	sm.Register("run-1", cancel)

	if sm.ActiveRuns() != 1 {
		t.Fatalf("expected 1 active run, got %d", sm.ActiveRuns())
	}

	sm.Cancel("run-1")
	if sm.ActiveRuns() != 0 {
		t.Fatalf("expected 0 active runs after cancel, got %d", sm.ActiveRuns())
	}

	_ = ctx
}

func TestSessionManager_ActiveRunsEmpty(t *testing.T) {
	sm := NewSessionManager()
	if sm.ActiveRuns() != 0 {
		t.Fatalf("expected 0 for empty session manager")
	}
}
