package engine

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/nektos/act/pkg/common"
	"github.com/nektos/act/pkg/model"
	"github.com/nektos/act/pkg/runner"
	"g-core/internal/eventbus"
)

type eventCollector struct {
	mu     sync.Mutex
	events []eventbus.Event
}

func newEventCollector(bus eventbus.Bus) *eventCollector {
	collector := &eventCollector{events: make([]eventbus.Event, 0)}
	bus.Subscribe(collector.handle)
	return collector
}

func (c *eventCollector) handle(evt eventbus.Event) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.events = append(c.events, evt)
}

func (c *eventCollector) Events() []eventbus.Event {
	c.mu.Lock()
	defer c.mu.Unlock()
	copyEvents := make([]eventbus.Event, len(c.events))
	copy(copyEvents, c.events)
	return copyEvents
}

type stubPlanner struct {
	plan    *model.Plan
	err     error
	called  string
	lastArg string
}

func (s *stubPlanner) PlanEvent(eventName string) (*model.Plan, error) {
	s.called = "event"
	s.lastArg = eventName
	return s.plan, s.err
}

func (s *stubPlanner) PlanJob(jobName string) (*model.Plan, error) {
	s.called = "job"
	s.lastArg = jobName
	return s.plan, s.err
}

func (s *stubPlanner) PlanAll() (*model.Plan, error) {
	s.called = "all"
	s.lastArg = ""
	return s.plan, s.err
}

type stubRunner struct {
	executor func(context.Context) error
}

func (s *stubRunner) NewPlanExecutor(_ *model.Plan) common.Executor {
	return s.executor
}

func TestActAdapterPlan_Success(t *testing.T) {
	workdir := t.TempDir()
	workflowDir := filepath.Join(workdir, ".github", "workflows")
	if err := os.MkdirAll(workflowDir, 0755); err != nil {
		t.Fatalf("mkdir workflows: %v", err)
	}
	workflow := `name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "hi"
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "test"`
	workflowPath := filepath.Join(workflowDir, "ci.yml")
	if err := os.WriteFile(workflowPath, []byte(workflow), 0644); err != nil {
		t.Fatalf("write workflow: %v", err)
	}

	bus := eventbus.NewMemoryBus()
	sessions := NewSessionManager()
	adapter := NewActAdapter(bus, sessions)

	workflows, err := adapter.Plan(workdir)
	if err != nil {
		t.Fatalf("expected Plan to succeed, got error: %v", err)
	}
	if len(workflows) != 1 {
		t.Fatalf("expected 1 workflow, got %d", len(workflows))
	}
	if workflows[0].File != "ci.yml" {
		t.Fatalf("expected workflow file ci.yml, got %q", workflows[0].File)
	}
	if workflows[0].Name != "CI" {
		t.Fatalf("expected workflow name CI, got %q", workflows[0].Name)
	}
	if len(workflows[0].Jobs) != 2 {
		t.Fatalf("expected 2 jobs, got %d", len(workflows[0].Jobs))
	}
	jobIDs := map[string]bool{}
	for _, job := range workflows[0].Jobs {
		jobIDs[job.ID] = true
	}
	if !jobIDs["build"] || !jobIDs["test"] {
		t.Fatalf("expected jobs build and test, got %+v", jobIDs)
	}
}

func TestActAdapterPlan_InvalidPath(t *testing.T) {
	workdir := t.TempDir()
	bus := eventbus.NewMemoryBus()
	sessions := NewSessionManager()
	adapter := NewActAdapter(bus, sessions)

	_, err := adapter.Plan(workdir)
	if err == nil {
		t.Fatalf("expected Plan to fail when workflows path is missing")
	}
}

func TestActAdapterRun_SuccessPublishesEvents(t *testing.T) {
	plan := &model.Plan{Stages: []*model.Stage{}}
	planner := &stubPlanner{plan: plan}
	runnerStub := &stubRunner{executor: func(ctx context.Context) error {
		return nil
	}}

	plannerFactory := func(_ string) (workflowPlanner, error) { return planner, nil }
	runnerFactory := func(_ *runner.Config) (runnerRunner, error) { return runnerStub, nil }

	bus := eventbus.NewMemoryBus()
	collector := newEventCollector(bus)
	sessions := NewSessionManager()
	adapter := NewActAdapterWithFactories(bus, sessions, plannerFactory, runnerFactory)

	err := adapter.Run(context.Background(), RunOptions{RunID: "run-1", Workdir: t.TempDir()})
	if err != nil {
		t.Fatalf("expected Run to succeed, got error: %v", err)
	}

	events := collector.Events()
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}
	if events[0].Type != eventbus.EventRunStarted {
		t.Fatalf("expected first event run.started, got %s", events[0].Type)
	}
	if events[1].Type != eventbus.EventRunFinished {
		t.Fatalf("expected second event run.finished, got %s", events[1].Type)
	}
	finished, ok := events[1].Payload.(eventbus.RunFinishedPayload)
	if !ok {
		t.Fatalf("expected RunFinishedPayload, got %T", events[1].Payload)
	}
	if finished.Status != "success" {
		t.Fatalf("expected status success, got %q", finished.Status)
	}
}

func TestActAdapterRun_ErrorPublishesEvents(t *testing.T) {
	plan := &model.Plan{Stages: []*model.Stage{}}
	planner := &stubPlanner{plan: plan}
	runnerStub := &stubRunner{executor: func(ctx context.Context) error {
		return errors.New("boom")
	}}

	plannerFactory := func(_ string) (workflowPlanner, error) { return planner, nil }
	runnerFactory := func(_ *runner.Config) (runnerRunner, error) { return runnerStub, nil }

	bus := eventbus.NewMemoryBus()
	collector := newEventCollector(bus)
	sessions := NewSessionManager()
	adapter := NewActAdapterWithFactories(bus, sessions, plannerFactory, runnerFactory)

	err := adapter.Run(context.Background(), RunOptions{RunID: "run-2", Workdir: t.TempDir()})
	if err == nil {
		t.Fatalf("expected Run to return error")
	}

	events := collector.Events()
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}
	finished, ok := events[1].Payload.(eventbus.RunFinishedPayload)
	if !ok {
		t.Fatalf("expected RunFinishedPayload, got %T", events[1].Payload)
	}
	if finished.Status != "error" {
		t.Fatalf("expected status error, got %q", finished.Status)
	}
}

func TestActAdapterRun_CancelPublishesCanceledStatus(t *testing.T) {
	plan := &model.Plan{Stages: []*model.Stage{}}
	planner := &stubPlanner{plan: plan}
	started := make(chan struct{})
	runnerStub := &stubRunner{executor: func(ctx context.Context) error {
		close(started)
		<-ctx.Done()
		return ctx.Err()
	}}

	plannerFactory := func(_ string) (workflowPlanner, error) { return planner, nil }
	runnerFactory := func(_ *runner.Config) (runnerRunner, error) { return runnerStub, nil }

	bus := eventbus.NewMemoryBus()
	collector := newEventCollector(bus)
	sessions := NewSessionManager()
	adapter := NewActAdapterWithFactories(bus, sessions, plannerFactory, runnerFactory)

	ctx := context.Background()
	go func() {
		_ = adapter.Run(ctx, RunOptions{RunID: "run-3", Workdir: t.TempDir()})
	}()

	<-started
	if ok := sessions.Cancel("run-3"); !ok {
		t.Fatalf("expected cancel to return true")
	}

	deadline := time.After(2 * time.Second)
	for {
		select {
		case <-deadline:
			t.Fatalf("timed out waiting for run.finished event")
		default:
			events := collector.Events()
			if len(events) >= 2 {
				finished, ok := events[1].Payload.(eventbus.RunFinishedPayload)
				if !ok {
					t.Fatalf("expected RunFinishedPayload, got %T", events[1].Payload)
				}
				if finished.Status != "canceled" {
					t.Fatalf("expected status canceled, got %q", finished.Status)
				}
				return
			}
			time.Sleep(10 * time.Millisecond)
		}
	}
}
