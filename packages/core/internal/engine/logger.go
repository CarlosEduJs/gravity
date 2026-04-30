package engine

import (
	"time"

	"github.com/sirupsen/logrus"
	"g-core/internal/eventbus"
)

// gravityLogWriter implementa io.Writer para injetar os bytes de log no EventBus
type gravityLogWriter struct {
	bus   eventbus.Bus
	runID string
}

func (g *gravityLogWriter) Write(p []byte) (n int, err error) {
	g.bus.Publish(eventbus.Event{
		ID:        "log-" + time.Now().Format("20060102150405.000"),
		RunID:     g.runID,
		Type:      eventbus.EventLogOutput,
		Timestamp: time.Now(),
		Payload: map[string]any{
			"message": string(p),
		},
	})
	return len(p), nil
}

// GravityLoggerFactory implementa a interface runner.JobLoggerFactory do nektos/act
type GravityLoggerFactory struct {
	bus   eventbus.Bus
	runID string
}

func (f *GravityLoggerFactory) WithJobLogger() *logrus.Logger {
	logger := logrus.New()
	logger.SetOutput(&gravityLogWriter{bus: f.bus, runID: f.runID})
	
	// Formatador simples pra não duplicar timestamps, já que o evento cuida disso
	logger.SetFormatter(&logrus.TextFormatter{
		DisableTimestamp: true,
	})
	
	return logger
}
