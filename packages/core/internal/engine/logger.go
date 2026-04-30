package engine

import (
	"strings"
	"time"

	"github.com/sirupsen/logrus"
	"g-core/internal/eventbus"
)

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
		Payload: eventbus.LogPayload{
			Message: strings.TrimRight(string(p), "\n"),
		},
	})
	return len(p), nil
}

// gravityFormatter limpa a sujeira do Logrus para extrair só a mensagem
type gravityFormatter struct{}

func (f *gravityFormatter) Format(entry *logrus.Entry) ([]byte, error) {
	msg := entry.Message
	if entry.Level == logrus.ErrorLevel || entry.Level == logrus.FatalLevel {
		msg = "ERROR: " + msg
	}
	return []byte(msg + "\n"), nil
}

type GravityLoggerFactory struct {
	bus   eventbus.Bus
	runID string
}

func (f *GravityLoggerFactory) WithJobLogger() *logrus.Logger {
	logger := logrus.New()
	logger.SetOutput(&gravityLogWriter{bus: f.bus, runID: f.runID})

	logger.SetFormatter(&gravityFormatter{})
	
	return logger
}
