package main

import (
	"bufio"
	"context"
	"encoding/json"
	"os"
	"sync"

	"g-core/internal/engine"
	"g-core/internal/eventbus"
)

// RPCRequest representa uma chamada JSON-RPC simples vinda do Electrobun
type RPCRequest struct {
	JSONRPC string `json:"jsonrpc"`
	Method  string `json:"method"`
	Params  struct {
		Workdir string `json:"workdir"`
		Job     string `json:"job"`
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
	dispatcher := NewDispatcher()

	// inicia o EventBus e linkar ao Dispatcher
	bus := eventbus.NewMemoryBus()
	bus.Subscribe(func(e eventbus.Event) {
		// Toda vez que um evento ocorrer no bus, despacha como JSON-RPC Notification
		dispatcher.SendEvent(e)
	})

	// Passamos o EventBus para o Adapter (que logo logo injetará no act)
	adapter := engine.NewActAdapter(bus)

	// Escuta do Stdin
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
				opts := engine.RunOptions{
					RunID:    "run-12345",
					Event:    "push",
					Job:      reqData.Params.Job,
					Workdir:  reqData.Params.Workdir,
					EventBus: bus,
				}
				
				// Aqui usar um SessionManager, simplificar primeiro com context background
				err := adapter.Run(context.Background(), opts)
				if err != nil {
					dispatcher.SendError(reqID, err.Error())
				} else {
					dispatcher.SendResult(reqID, map[string]string{"status": "completed"})
				}
			}(req.ID, req)
		default:
			dispatcher.SendError(req.ID, "Método não encontrado")
		}
	}
}
