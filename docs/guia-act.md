# Building a Go Wrapper for Act: A Technical Guide

This guide walks you through the internal architecture of `nektos/act`'s `pkg` directory. If you're building a Go wrapper or a programmatic integration, this reference will help you navigate the core modules, execution lifecycles, and key extension points of the Act engine.

---

## 1. How it's Organized

The `nektos/act` engine is built as a set of modular sub-packages within the `pkg` directory. Each one handles a specific part of the workflow execution process.

### Core Modules

| Module | What it does |
| :--- | :--- |
| `pkg/model` | Handles the data structures for Workflows, Jobs, and Steps parsed from your YAML files. |
| `pkg/runner` | The "brain" of the operation. It manages execution logic, environment setup, and state. |
| `pkg/common` | Home to shared utilities and the `Executor` primitive that everything else runs on. |
| `pkg/container` | Manages the Docker lifecycle—creating, running, and cleaning up containers. |
| `pkg/exprparser` | Evaluates GitHub Actions expressions like `${{ secrets.GITHUB_TOKEN }}`. |
| `pkg/gh` | Handles all logic related to the GitHub API and integrations. |

---

## 2. The Core API

When building a wrapper, you'll mostly interact with these three interfaces.

### `WorkflowPlanner`
Think of the planner as the loader. It reads your workflow files and prepares them for execution.

**Getting started:**
```go
func NewWorkflowPlanner(path string, noWorkflowRecurse, strict bool) (WorkflowPlanner, error)
```

**Key methods:**
- `PlanEvent(eventName string)`: Sets up an execution based on a specific event (like a `push`).
- `PlanJob(jobName string)`: Focuses on planning just a single job.
- `PlanAll()`: Prepares every job found in the workflow.

---

### `Runner`
The Runner is the orchestrator. Once you have a plan, the Runner is what actually carries it out.

**Getting started:**
```go
func New(runnerConfig *Config) (Runner, error)
```

**Key method:**
- `NewPlanExecutor(plan *model.Plan)`: This converts your plan into an executable `Executor` unit.

---

### `Config` (The Setup)
The `Config` struct is where you define the environment for your Runner. Here are the fields you'll use most often:

| Field | Type | What it's for |
| :--- | :--- | :--- |
| `Workdir` | `string` | The base directory where the action runs. |
| `EventName` | `string` | The event triggering the workflow (e.g., "push", "pull_request"). |
| `Actor` | `string` | The username associated with the execution. |
| `Env` | `map[string]string` | Global environment variables for the run. |
| `Secrets` | `map[string]string` | Your sensitive tokens and secrets. |
| `Platforms` | `map[string]string` | Maps platform labels (like `ubuntu-latest`) to specific Docker images. |

---

### `Executor` (The Workhorse)
Almost everything in Act is an `Executor`. It’s a simple function type: `type Executor func(context.Context) error`.
You can chain them together to build complex flows:
- `NewPipelineExecutor`: Runs a list of executors one after another.
- `NewParallelExecutor`: Runs a list of executors at the same time.

---

## 3. Deep Dive into Operations

### 3.1 Logging
Act uses `logrus` for its logging, but it’s heavily context-aware so that logs stay organized.

- **Isolation**: Logs are tied to the `context.Context`. Each job gets its own logger via `WithJobLogger`, which automatically attaches metadata like the `jobID`.
- **Security**: The system uses a `maskedFormatter` to ensure secrets are redacted from the logs before they ever hit the screen.
- **Workflow Commands**: If a step prints `::debug::` or `::set-output::`, Act intercepts these in `pkg/runner/command.go` and handles them as internal state changes or structured logs.

**Pro Tip:** If you need to use your own logging system, implement the `JobLoggerFactory` interface and inject it into the context using `WithJobLoggerFactory`.

### 3.2 Execution Lifecycle & Hooks
Monitoring a run is easy if you know where to look. The lifecycle is split into Job and Step levels:

- **Jobs**: Managed in `pkg/runner/job_executor.go`. It handles the "Set up job" (container start) and "Complete job" (container teardown) phases.
- **Steps**: Every step goes through `pre()`, `main()`, and `post()`. The `post()` phase is guaranteed to run (via a `Finally` executor), making it the perfect place for cleanup logic.

### 3.3 Handling Cancellation
Since Act uses standard Go contexts, stopping a run is straightforward.
- **Graceful Shutdown**: When a context is cancelled (like via `Ctrl+C`), Act doesn't just kill everything. It initiates a 5-minute timeout window to ensure that cleanup steps (like removing Docker containers) can finish properly.

---

## Wrapping Up

The `nektos/act` codebase is highly modular, making it a great foundation for custom automation. By focusing on the `Runner` and `WorkflowPlanner` interfaces, you can build tools that execute GitHub Actions locally with exactly the configuration you need.
