package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"

	"g-core/internal/engine"
)

// RPCRequest representa uma chamada JSON-RPC simples vinda do Electrobun
type RPCRequest struct {
	JSONRPC string `json:"jsonrpc"`
	Method  string `json:"method"`
	Params  struct {
		Workdir string `json:"workdir"`
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

func main() {
	adapter := engine.NewActAdapter()
	scanner := bufio.NewScanner(os.Stdin)

	// O Go fica em um loop infinito esperando comandos no stdin
	for scanner.Scan() {
		line := scanner.Bytes()
		
		var req RPCRequest
		if err := json.Unmarshal(line, &req); err != nil {
			sendError(-1, fmt.Sprintf("Erro de parse: %v", err))
			continue
		}

		// Roteamento de métodos
		switch req.Method {
		case "plan":
			workflows, err := adapter.Plan(req.Params.Workdir)
			if err != nil {
				sendError(req.ID, err.Error())
			} else {
				sendResult(req.ID, workflows)
			}
		default:
			sendError(req.ID, fmt.Sprintf("Método '%s' não encontrado", req.Method))
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Erro lendo stdin: %v\n", err)
	}
}

func sendResult(id int, result any) {
	resp := RPCResponse{JSONRPC: "2.0", Result: result, ID: id}
	out, _ := json.Marshal(resp)
	fmt.Println(string(out)) // Escreve como linha única no stdout
}

func sendError(id int, errStr string) {
	resp := RPCResponse{JSONRPC: "2.0", Error: errStr, ID: id}
	out, _ := json.Marshal(resp)
	fmt.Println(string(out)) // Escreve como linha única no stdout
}
