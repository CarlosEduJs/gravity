package engine

import (
	"context"
	"errors"
	"fmt"
	"g-core/internal/eventbus"
	"path/filepath"
	"time"

	"github.com/nektos/act/pkg/model"
	"github.com/nektos/act/pkg/runner"
)

// ActAdapter implementa a interface Engine utilizando o nektos/act
type ActAdapter struct{
	bus      eventbus.Bus
	sessions *SessionManager
}

func NewActAdapter(bus eventbus.Bus, sessions *SessionManager) *ActAdapter {
	return &ActAdapter{
		bus:      bus,
		sessions: sessions,
	}
}

// Plan lê o diretório de trabalho e extrai os workflows e seus jobs
func (a *ActAdapter) Plan(workdir string) ([]Workflow, error) {
	workflowPath := filepath.Join(workdir, ".github", "workflows")
	
	// Utiliza o NewWorkflowPlanner: path, noWorkflowRecurse, strict
	wp, err := model.NewWorkflowPlanner(workflowPath, false, false)
	if err != nil {
		return nil, fmt.Errorf("falha ao criar WorkflowPlanner: %w", err)
	}

	plan, err := wp.PlanAll()
	if err != nil {
		return nil, fmt.Errorf("falha ao planejar workflows: %w", err)
	}

	var workflows []Workflow

	for _, stage := range plan.Stages {
		for _, run := range stage.Runs {
			
			var wf *Workflow
			for i := range workflows {
				if workflows[i].File == run.Workflow.File {
					wf = &workflows[i]
					break
				}
			}

			if wf == nil {
				workflows = append(workflows, Workflow{
					File: run.Workflow.File,
					Name: run.Workflow.Name,
					Jobs: []Job{},
				})
				wf = &workflows[len(workflows)-1]
			}

			wf.Jobs = append(wf.Jobs, Job{
				ID:   run.JobID,
				Name: run.String(),
			})
		}
	}

	return workflows, nil
}

// Run executa um workflow no nektos/act
func (a *ActAdapter) Run(ctx context.Context, opts RunOptions) error {
	workflowPath := filepath.Join(opts.Workdir, ".github", "workflows")
	
	wp, err := model.NewWorkflowPlanner(workflowPath, false, false)
	if err != nil {
		return fmt.Errorf("falha ao criar WorkflowPlanner: %w", err)
	}

	var plan *model.Plan
	if opts.Job != "" {
		plan, err = wp.PlanJob(opts.Job)
	} else if opts.Event != "" {
		plan, err = wp.PlanEvent(opts.Event)
	} else {
		// Default to push event
		plan, err = wp.PlanEvent("push")
	}

	if err != nil {
		return fmt.Errorf("falha ao planejar execução: %w", err)
	}

	runnerConfig := &runner.Config{
		Workdir:   opts.Workdir,
		EventName: opts.Event,
		LogOutput: true,
		Platforms: map[string]string{
			"ubuntu-latest": "catthehacker/ubuntu:act-latest",
			"ubuntu-22.04":  "catthehacker/ubuntu:act-22.04",
			"ubuntu-20.04":  "catthehacker/ubuntu:act-20.04",
			"ubuntu-18.04":  "catthehacker/ubuntu:act-18.04",
		},
	}

	r, err := runner.New(runnerConfig)
	if err != nil {
		return fmt.Errorf("falha ao instanciar runner: %w", err)
	}

	cancellableCtx, cancel := context.WithCancel(ctx)
	a.sessions.Register(opts.RunID, cancel)
	defer a.sessions.Deregister(opts.RunID)

	factory := &GravityLoggerFactory{bus: a.bus, runID: opts.RunID}
	runCtx := runner.WithJobLoggerFactory(cancellableCtx, factory)

	executor := r.NewPlanExecutor(plan)

	a.bus.Publish(eventbus.Event{
		ID:        "start-" + opts.RunID,
		RunID:     opts.RunID,
		Type:      eventbus.EventRunStarted,
		Timestamp: time.Now(),
		Payload:   eventbus.RunStartedPayload{Job: opts.Job, Event: opts.Event},
	})

	err = executor(runCtx)
	
	status := "success"
	if err != nil {
		if errors.Is(err, context.Canceled) {
			status = "canceled"
		} else {
			status = "error"
		}
	}

	a.bus.Publish(eventbus.Event{
		ID:        "end-" + opts.RunID,
		RunID:     opts.RunID,
		Type:      eventbus.EventRunFinished,
		Timestamp: time.Now(),
		Payload:   eventbus.RunFinishedPayload{Status: status},
	})

	return err
}
