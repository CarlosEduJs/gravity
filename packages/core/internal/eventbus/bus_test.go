package eventbus

import "testing"

func TestMemoryBus_PublishSubscribe(t *testing.T) {
	bus := NewMemoryBus()
	called := 0
	bus.Subscribe(func(Event) {
		called++
	})

	bus.Publish(Event{ID: "1", Type: EventRunStarted})
	bus.Publish(Event{ID: "2", Type: EventRunFinished})

	if called != 2 {
		t.Fatalf("expected 2 handler calls, got %d", called)
	}
}

func TestMemoryBus_MultipleSubscribers(t *testing.T) {
	bus := NewMemoryBus()
	first := 0
	second := 0
	bus.Subscribe(func(Event) { first++ })
	bus.Subscribe(func(Event) { second++ })

	bus.Publish(Event{ID: "1", Type: EventLogOutput})

	if first != 1 || second != 1 {
		t.Fatalf("expected both subscribers to be called once, got %d and %d", first, second)
	}
}
