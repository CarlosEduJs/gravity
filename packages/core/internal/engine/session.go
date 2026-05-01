package engine

import (
	"context"
	"sync"
)

// SessionManager gerencia o ciclo de vida das execuções (jobs) do act.
// Ele permite que uma execução seja interrompida (stop) no meio do caminho.
type SessionManager struct {
	mu   sync.Mutex
	runs map[string]context.CancelFunc
}

func NewSessionManager() *SessionManager {
	return &SessionManager{
		runs: make(map[string]context.CancelFunc),
	}
}

// Register adiciona uma nova execução ao mapa de sessões ativas
func (sm *SessionManager) Register(runID string, cancel context.CancelFunc) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.runs[runID] = cancel
}

// Deregister remove a execução do mapa (chamado via defer quando o job acaba)
func (sm *SessionManager) Deregister(runID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.runs, runID)
}

// Cancel envia o sinal de cancelamento para o contexto do job e o remove da lista
func (sm *SessionManager) Cancel(runID string) bool {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	
	if cancel, exists := sm.runs[runID]; exists {
		cancel()
		delete(sm.runs, runID)
		return true
	}
	return false
}
