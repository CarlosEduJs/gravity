package bridge

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"

	"g-core/internal/engine"
	"g-core/internal/eventbus"
	"g-core/internal/version"
)

type RPCRequest struct {
	JSONRPC string `json:"jsonrpc"`
	Method  string `json:"method"`
	Params  struct {
		Workdir string `json:"workdir"`
		Job     string `json:"job"`
		RunID   string `json:"runId"`
	} `json:"params"`
	ID int `json:"id"`
}

type RPCResponse struct {
	JSONRPC string `json:"jsonrpc"`
	Result  any    `json:"result,omitempty"`
	Error   string `json:"error,omitempty"`
	ID      int    `json:"id"`
}

type RPCNotification struct {
	JSONRPC string `json:"jsonrpc"`
	Method  string `json:"method"`
	Params  any    `json:"params"`
}

type Dispatcher struct {
	mu sync.Mutex
}

func NewDispatcher() *Dispatcher {
	return &Dispatcher{}
}

func (d *Dispatcher) Write(payload any) {
	out, err := json.Marshal(payload)
	if err != nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	os.Stdout.Write(out)
	os.Stdout.Write([]byte("\n"))
}

func (d *Dispatcher) SendResult(id int, result any) {
	d.Write(RPCResponse{JSONRPC: "2.0", Result: result, ID: id})
}

func (d *Dispatcher) SendError(id int, errStr string) {
	d.Write(RPCResponse{JSONRPC: "2.0", Error: errStr, ID: id})
}

func (d *Dispatcher) SendEvent(event eventbus.Event) {
	d.Write(RPCNotification{
		JSONRPC: "2.0",
		Method:  "gravity.event",
		Params:  event,
	})
}

type Bridge struct {
	dispatcher *Dispatcher
	adapter    *engine.ActAdapter
	sessions   *engine.SessionManager
	bus        eventbus.Bus
}

func New(bus eventbus.Bus, sessions *engine.SessionManager, adapter *engine.ActAdapter) *Bridge {
	d := NewDispatcher()
	bus.Subscribe(func(e eventbus.Event) {
		d.SendEvent(e)
	})

	return &Bridge{
		dispatcher: d,
		adapter:    adapter,
		sessions:   sessions,
		bus:        bus,
	}
}

func (b *Bridge) Handle(line []byte) {
	var req RPCRequest
	if err := json.Unmarshal(line, &req); err != nil {
		b.dispatcher.SendError(-1, "Invalid JSON-RPC request")
		return
	}

	switch req.Method {
	case "plan":
		workflows, err := b.adapter.Plan(req.Params.Workdir)
		if err != nil {
			b.dispatcher.SendError(req.ID, err.Error())
		} else {
			b.dispatcher.SendResult(req.ID, workflows)
		}

	case "run":
		go b.handleRun(req)

	case "stop":
		b.handleStop(req)

	case "info":
		b.dispatcher.SendResult(req.ID, map[string]string{
			"version":   version.Version,
			"buildDate": version.BuildDate,
		})

	default:
		b.dispatcher.SendError(req.ID, "Method not found")
	}
}

func (b *Bridge) handleRun(req RPCRequest) {
	runID := req.Params.RunID
	if runID == "" {
		runID = fmt.Sprintf("run-%d", time.Now().UnixNano())
	}

	opts := engine.RunOptions{
		RunID:    runID,
		Event:    "push",
		Job:      req.Params.Job,
		Workdir:  req.Params.Workdir,
		EventBus: b.bus,
	}

	err := b.adapter.Run(context.Background(), opts)
	if err != nil {
		b.dispatcher.SendError(req.ID, err.Error())
	} else {
		b.dispatcher.SendResult(req.ID, map[string]string{"status": "completed", "runId": runID})
	}
}

func (b *Bridge) handleStop(req RPCRequest) {
	runID := req.Params.RunID
	if runID == "" {
		b.dispatcher.SendError(req.ID, "runId is required to stop execution")
		return
	}

	if b.sessions.Cancel(runID) {
		b.dispatcher.SendResult(req.ID, map[string]bool{"stopped": true})
	} else {
		b.dispatcher.SendError(req.ID, fmt.Sprintf("No active execution found for runId: %s", runID))
	}
}
