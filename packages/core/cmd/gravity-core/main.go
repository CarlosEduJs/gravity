package main

import (
	"bufio"
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

// RPCRequest representa uma chamada JSON-RPC simples vinda do Electrobun
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

// RPCResponse representa a resposta devolvida pro Electrobun
type RPCResponse struct {
	JSONRPC string `json:"jsonrpc"`
	Result  any    `json:"result,omitempty"`
	Error   string `json:"error,omitempty"`
	ID      int    `json:"id"`
}

// RPCNotification representa eventos sem ID (stream em tempo real)
type RPCNotification struct {
	JSONRPC string `json:"jsonrpc"`
	Method  string `json:"method"`
	Params  any    `json:"params"`
}

// Dispatcher garante que o stdout seja um stream JSON unificado e thread-safe
type Dispatcher struct {
	mu sync.Mutex
}

func NewDispatcher() *Dispatcher {
	return &Dispatcher{}
}

// Write escreve o JSON serializado de forma atômica no stdout
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

func main() {
	// Support standalone 'info' command
	if len(os.Args) > 1 && os.Args[1] == "info" {
		version.ShowVersion()
		return
	}

	dispatcher := NewDispatcher()

	// inicia o EventBus e linkar ao Dispatcher
	bus := eventbus.NewMemoryBus()
	bus.Subscribe(func(e eventbus.Event) {
		// Toda vez que um evento ocorrer no bus, despacha como JSON-RPC Notification
		dispatcher.SendEvent(e)
	})

	sessions := engine.NewSessionManager()
	adapter := engine.NewActAdapter(bus, sessions)

	scanner := bufio.NewScanner(os.Stdin)

	for scanner.Scan() {
		line := scanner.Bytes()

		var req RPCRequest
		if err := json.Unmarshal(line, &req); err != nil {
			dispatcher.SendError(-1, "Erro de parse do JSON-RPC")
			continue
		}

		// Roteamento
		switch req.Method {
		case "plan":
			workflows, err := adapter.Plan(req.Params.Workdir)
			if err != nil {
				dispatcher.SendError(req.ID, err.Error())
			} else {
				dispatcher.SendResult(req.ID, workflows)
			}
		case "run":
			go func(reqID int, reqData RPCRequest) {
				runID := reqData.Params.RunID
				if runID == "" {
					runID = fmt.Sprintf("run-%d", time.Now().UnixNano())
				}

				opts := engine.RunOptions{
					RunID:    runID,
					Event:    "push",
					Job:      reqData.Params.Job,
					Workdir:  reqData.Params.Workdir,
					EventBus: bus,
				}
				
				err := adapter.Run(context.Background(), opts)
				if err != nil {
					dispatcher.SendError(reqID, err.Error())
				} else {
					dispatcher.SendResult(reqID, map[string]string{"status": "completed", "runId": runID})
				}
			}(req.ID, req)
			
		case "stop":
			runID := req.Params.RunID
			if runID == "" {
				dispatcher.SendError(req.ID, "runId é obrigatório para parar uma execução")
				continue
			}
			
			stopped := sessions.Cancel(runID)
			if stopped {
				dispatcher.SendResult(req.ID, map[string]bool{"stopped": true})
			} else {
				dispatcher.SendError(req.ID, fmt.Sprintf("Nenhuma execução ativa encontrada para runId: %s", runID))
			}
		case "info":
			dispatcher.SendResult(req.ID, map[string]string{
				"version":   version.Version,
				"buildDate": version.BuildDate,
			})
		default:
			dispatcher.SendError(req.ID, "Método não encontrado")
		}
	}
}
