package engine

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/nektos/act/pkg/model"
)

// ActAdapter implementa a interface Engine utilizando o nektos/act
type ActAdapter struct{}

func NewActAdapter() *ActAdapter {
	return &ActAdapter{}
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

	// Itera sobre as stages e runs (jobs) gerados pelo PlanAll do act
	for _, stage := range plan.Stages {
		for _, run := range stage.Runs {
			
			// Encontra se já temos este workflow registrado (pelo arquivo)
			var wf *Workflow
			for i := range workflows {
				if workflows[i].File == run.Workflow.File {
					wf = &workflows[i]
					break
				}
			}

			// Se não existe ainda, cria um novo
			if wf == nil {
				workflows = append(workflows, Workflow{
					File: run.Workflow.File,
					Name: run.Workflow.Name,
					Jobs: []Job{},
				})
				wf = &workflows[len(workflows)-1]
			}

			// Adiciona o job ao workflow
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
	// WIP: Próxima etapa (Injeção de logger usando WithJobLoggerFactory e context)
	// Vamos focar no Plan() primeiro para validar o funcionamento.
	return fmt.Errorf("Run não implementado ainda")
}
