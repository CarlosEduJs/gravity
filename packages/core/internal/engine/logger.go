package engine

import (
	"io"
	"strings"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"g-core/internal/eventbus"
)

// gravityLogHook implementa logrus.Hook para processar metadados ocultos do act
// e disparar os eventos estruturados (job.started, step.finished, etc).
type gravityLogHook struct {
	bus       eventbus.Bus
	runID     string
	mu        sync.Mutex
	knownJobs map[string]bool
}

func (h *gravityLogHook) Levels() []logrus.Level {
	return logrus.AllLevels
}

func (h *gravityLogHook) Fire(entry *logrus.Entry) error {
	jobID, _ := entry.Data["jobID"].(string)
	if jobID == "" {
		jobID, _ = entry.Data["job"].(string)
	}

	stepName, _ := entry.Data["step"].(string)
	stepID, _ := entry.Data["stepid"].(string)
	if stepID == "" {
		stepID, _ = entry.Data["stepID"].(string)
	}
	if stepID == "" && stepName != "" {
		stepID = stepName
	}

	if jobID != "" {
		h.mu.Lock()
		if !h.knownJobs[jobID] {
			h.knownJobs[jobID] = true
			h.mu.Unlock()
			
			h.bus.Publish(eventbus.Event{
				ID:        "job-" + time.Now().Format("150405.000000"),
				RunID:     h.runID,
				Type:      eventbus.EventJobStarted,
				Timestamp: time.Now(),
				Payload:   eventbus.JobStartedPayload{JobID: jobID, Name: jobID},
			})
		} else {
			h.mu.Unlock()
		}
	}

	jobResult, hasJobResult := entry.Data["jobResult"].(string)
	stepResult, hasStepResult := entry.Data["stepResult"].(string)

	var eventType eventbus.EventType
	var payload eventbus.Payload

	if hasJobResult {
		eventType = eventbus.EventJobFinished
		status := "failure"
		if jobResult == "success" {
			status = "success"
		}
		payload = eventbus.JobFinishedPayload{JobID: jobID, Status: status}
		
	} else if hasStepResult {
		eventType = eventbus.EventStepFinished
		status := "failure"
		if stepResult == "success" {
			status = "success"
		}
		payload = eventbus.StepFinishedPayload{StepID: stepID, Status: status}
		
	} else if strings.HasPrefix(entry.Message, "Run") {
		eventType = eventbus.EventStepStarted
		payload = eventbus.StepStartedPayload{StepID: stepID, Name: stepName}
		
	} else {
		eventType = eventbus.EventLogOutput
		msg := entry.Message
		if entry.Level == logrus.ErrorLevel || entry.Level == logrus.FatalLevel {
			msg = "ERROR: " + msg
		}
		payload = eventbus.LogPayload{JobID: jobID, StepID: stepID, Message: msg}
	}
	h.bus.Publish(eventbus.Event{
		ID:        "evt-" + time.Now().Format("150405.000000"),
		RunID:     h.runID,
		Type:      eventType,
		Timestamp: time.Now(),
		Payload:   payload,
	})

	return nil
}

type GravityLoggerFactory struct {
	bus   eventbus.Bus
	runID string
}

func (f *GravityLoggerFactory) WithJobLogger() *logrus.Logger {
	logger := logrus.New()
	logger.SetOutput(io.Discard)
	logger.AddHook(&gravityLogHook{
		bus:       f.bus,
		runID:     f.runID,
		knownJobs: make(map[string]bool),
	})
	
	return logger
}
