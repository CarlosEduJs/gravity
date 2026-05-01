package eventbus

import "time"

type EventType string

const (
	EventRunStarted   EventType = "run.started"
	EventJobStarted   EventType = "job.started"
	EventStepStarted  EventType = "step.started"
	EventLogOutput    EventType = "log.output"
	EventStepFinished EventType = "step.finished"
	EventJobFinished  EventType = "job.finished"
	EventRunFinished  EventType = "run.finished"
)

// Payloads Estritos

type Payload interface {
	isPayload()
}

type LogPayload struct {
    Message string `json:"message"`
}
func (LogPayload) isPayload() {}

type RunStartedPayload struct {
    Job   string `json:"job"`
    Event string `json:"event"`
}
func (RunStartedPayload) isPayload() {}

type RunFinishedPayload struct {
	Status string `json:"status"` // "success", "error", "canceled"
}
func (RunFinishedPayload) isPayload() {}

type Event struct {
	ID        string    `json:"id"`
	RunID     string    `json:"runId"`
	Type      EventType `json:"type"`
	Timestamp time.Time `json:"timestamp"`
	Payload   Payload   `json:"payload"`
}

type Bus interface {
	Publish(event Event)
	Subscribe(handler func(Event))
}

// MemoryBus é uma implementação simples em memória para testes iniciais
type MemoryBus struct {
	handlers []func(Event)
}

func NewMemoryBus() *MemoryBus {
	return &MemoryBus{
		handlers: make([]func(Event), 0),
	}
}

func (b *MemoryBus) Publish(event Event) {
	for _, handler := range b.handlers {
		handler(event)
	}
}

func (b *MemoryBus) Subscribe(handler func(Event)) {
	b.handlers = append(b.handlers, handler)
}
