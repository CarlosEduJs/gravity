package engine

import (
	"context"

	"g-core/internal/eventbus"
)

// Workflow representa um workflow analisado do GitHub Actions
type Workflow struct {
	File string `json:"file"`
	Name string `json:"name"`
	Jobs []Job  `json:"jobs"`
}

// Job representa um job individual dentro de um workflow
type Job struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// RunOptions opções para execução do runner
type RunOptions struct {
	RunID    string
	Event    string // ex: "push", "pull_request"
	Job      string // rodar apenas um job específico (opc)
	Workdir  string
	EventBus eventbus.Bus // Para injeção do logger custom
}

// Engine é a interface principal que encapsula o nektos/act
type Engine interface {
	Plan(workdir string) ([]Workflow, error)
	Run(ctx context.Context, opts RunOptions) error
}
