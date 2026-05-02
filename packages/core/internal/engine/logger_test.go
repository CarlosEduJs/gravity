package engine

import (
	"io"
	"testing"

	"github.com/sirupsen/logrus"
	"g-core/internal/eventbus"
)

func TestGravityLogHook_JobStartEmittedOnce(t *testing.T) {
	bus := eventbus.NewMemoryBus()
	collector := newEventCollector(bus)
	logger := logrus.New()
	logger.SetOutput(io.Discard)
	logger.AddHook(&gravityLogHook{
		bus:       bus,
		runID:     "run-1",
		knownJobs: make(map[string]bool),
	})

	logger.WithField("jobID", "build").Info("first")
	logger.WithField("jobID", "build").Info("second")

	events := collector.Events()
	jobStarted := 0
	for _, evt := range events {
		if evt.Type == eventbus.EventJobStarted {
			jobStarted++
		}
	}
	if jobStarted != 1 {
		t.Fatalf("expected 1 job.started event, got %d", jobStarted)
	}
}

func TestGravityLogHook_StepEvents(t *testing.T) {
	bus := eventbus.NewMemoryBus()
	collector := newEventCollector(bus)
	logger := logrus.New()
	logger.SetOutput(io.Discard)
	logger.AddHook(&gravityLogHook{
		bus:       bus,
		runID:     "run-2",
		knownJobs: make(map[string]bool),
	})

	logger.WithFields(logrus.Fields{"jobID": "build", "step": "Checkout"}).Info("Run actions/checkout@v4")
	logger.WithFields(logrus.Fields{"jobID": "build", "step": "Checkout", "stepResult": "success"}).Info("done")

	events := collector.Events()
	var stepStarted, stepFinished bool
	for _, evt := range events {
		if evt.Type == eventbus.EventStepStarted {
			stepStarted = true
		}
		if evt.Type == eventbus.EventStepFinished {
			stepFinished = true
			payload, ok := evt.Payload.(eventbus.StepFinishedPayload)
			if !ok {
				t.Fatalf("expected StepFinishedPayload, got %T", evt.Payload)
			}
			if payload.Status != "success" {
				t.Fatalf("expected step status success, got %q", payload.Status)
			}
		}
	}
	if !stepStarted || !stepFinished {
		t.Fatalf("expected step started and finished events")
	}
}

func TestGravityLogHook_LogOutputErrorPrefix(t *testing.T) {
	bus := eventbus.NewMemoryBus()
	collector := newEventCollector(bus)
	logger := logrus.New()
	logger.SetOutput(io.Discard)
	logger.AddHook(&gravityLogHook{
		bus:       bus,
		runID:     "run-3",
		knownJobs: make(map[string]bool),
	})

	logger.WithField("jobID", "build").Error("boom")

	events := collector.Events()
	for _, evt := range events {
		if evt.Type == eventbus.EventLogOutput {
			payload, ok := evt.Payload.(eventbus.LogPayload)
			if !ok {
				t.Fatalf("expected LogPayload, got %T", evt.Payload)
			}
			if payload.Message != "ERROR: boom" {
				t.Fatalf("expected error prefix, got %q", payload.Message)
			}
			return
		}
	}
	t.Fatalf("expected log.output event")
}
