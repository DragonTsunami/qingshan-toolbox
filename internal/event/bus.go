// Package event 提供简单的事件总线，用于模块间通信
// Package event provides a simple event bus for inter-module communication
package event

import (
	"fmt"
	"sync"
	"time"
)

// EventType 事件类型枚举
// EventType represents the type of event
type EventType string

const (
	// SystemCheck 系统检查事件 / System health check event
	SystemCheck EventType = "system.check"
	// ServiceChange 服务变更事件 / Service status change event
	ServiceChange EventType = "service.change"
	// AlertTriggered 告警触发事件 / Alert triggered event
	AlertTriggered EventType = "alert.triggered"
	// BackupCompleted 备份完成事件 / Backup completed event
	BackupCompleted EventType = "backup.completed"
	// RemoteExecDone 远程执行完成事件 / Remote execution completed event
	RemoteExecDone EventType = "remote.exec.done"
	// LogAlert 日志告警事件 / Log alert event
	LogAlert EventType = "log.alert"
)

// Event 事件结构体，携带事件元数据和数据
// Event carries event metadata and payload data
type Event struct {
	// Type 事件类型 / Event type identifier
	Type EventType `json:"type"`
	// Source 事件来源模块 / Source module that published the event
	Source string `json:"source"`
	// Timestamp 事件发生时间 / When the event occurred
	Timestamp time.Time `json:"timestamp"`
	// Data 事件数据负载 / Event payload data
	Data interface{} `json:"data"`
	// Message 事件描述消息 / Human-readable event description
	Message string `json:"message"`
}

// Handler 事件处理函数类型
// Handler is a function that processes an event
type Handler func(event Event)

// Subscription 订阅信息，用于取消订阅
// Subscription holds subscription info for unsubscribing
type Subscription struct {
	// ID 订阅唯一标识 / Unique subscription identifier
	ID string
	// EventType 订阅的事件类型 / Subscribed event type
	EventType EventType
	// bus 引用事件总线（用于取消订阅）
	bus *Bus
}

// Unsubscribe 取消当前订阅
// Unsubscribe removes this subscription from the event bus
func (s *Subscription) Unsubscribe() {
	if s.bus != nil {
		s.bus.unsubscribe(s.EventType, s.ID)
	}
}

// subscriber 内部订阅者结构体
// subscriber is an internal subscriber record
type subscriber struct {
	id      string
	handler Handler
}

// Bus 事件总线，实现发布/订阅模式
// Bus implements the publish/subscribe pattern for inter-module communication.
// 线程安全：使用 sync.RWMutex 保护并发访问
// Thread-safe: uses sync.RWMutex for concurrent access protection
type Bus struct {
	// mu 读写互斥锁，保护subscribers映射表
	// Read-write mutex protecting the subscribers map
	mu sync.RWMutex

	// subscribers 事件类型到订阅者列表的映射
	// Map from event type to list of subscribers
	subscribers map[EventType][]subscriber

	// idCounter 订阅ID计数器（原子递增）
	// Subscription ID counter
	idCounter int

	// closed 标记事件总线是否已关闭
	// Whether the bus has been closed
	closed bool
}

// NewBus 创建一个新的事件总线实例
// NewBus creates a new event bus instance
func NewBus() *Bus {
	return &Bus{
		subscribers: make(map[EventType][]subscriber),
	}
}

// Subscribe 订阅指定类型的事件，返回 Subscription 用于取消订阅
// Subscribe registers a handler for the given event type.
// Returns a Subscription that can be used to unsubscribe later.
func (b *Bus) Subscribe(eventType EventType, handler Handler) *Subscription {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.closed {
		return nil
	}

	// 生成唯一订阅ID / Generate unique subscription ID
	b.idCounter++
	id := fmt.Sprintf("sub-%d", b.idCounter)

	sub := subscriber{
		id:      id,
		handler: handler,
	}

	b.subscribers[eventType] = append(b.subscribers[eventType], sub)

	return &Subscription{
		ID:        id,
		EventType: eventType,
		bus:       b,
	}
}

// SubscribeAll 订阅所有类型的事件
// SubscribeAll registers a handler that receives all event types
func (b *Bus) SubscribeAll(handler Handler) []*Subscription {
	allTypes := []EventType{
		SystemCheck,
		ServiceChange,
		AlertTriggered,
		BackupCompleted,
		RemoteExecDone,
		LogAlert,
	}

	subs := make([]*Subscription, 0, len(allTypes))
	for _, et := range allTypes {
		sub := b.Subscribe(et, handler)
		if sub != nil {
			subs = append(subs, sub)
		}
	}
	return subs
}

// Publish 发布事件，异步通知所有订阅者
// Publish sends an event to all subscribers of the given event type.
// 每个处理函数在独立的 goroutine 中执行，避免阻塞发布者
// Each handler runs in its own goroutine to avoid blocking the publisher.
func (b *Bus) Publish(event Event) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if b.closed {
		return
	}

	// 设置事件时间戳（如果未设置）/ Set timestamp if not already set
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	// 获取当前订阅者快照，避免在回调中死锁
	// Take a snapshot of subscribers to avoid deadlock in callbacks
	subs := make([]subscriber, len(b.subscribers[event.Type]))
	copy(subs, b.subscribers[event.Type])

	for _, sub := range subs {
		// 在独立 goroutine 中执行处理函数
		// Execute handler in a separate goroutine
		go func(h Handler) {
			// 捕获 panic，防止单个处理函数崩溃影响整个系统
			// Recover from panic to prevent a single handler from crashing the system
			defer func() {
				if r := recover(); r != nil {
					fmt.Printf("[EventBus] 处理函数 panic / Handler panic: %v\n", r)
				}
			}()
			h(event)
		}(sub.handler)
	}
}

// PublishSync 同步发布事件，等待所有处理函数执行完毕
// PublishSync sends an event and waits for all handlers to complete.
// 适用于需要确保所有处理完成后再继续的场景
// Use when you need to ensure all handlers complete before proceeding.
func (b *Bus) PublishSync(event Event) {
	b.mu.RLock()
	if b.closed {
		b.mu.RUnlock()
		return
	}

	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	subs := make([]subscriber, len(b.subscribers[event.Type]))
	copy(subs, b.subscribers[event.Type])
	b.mu.RUnlock()

	var wg sync.WaitGroup
	for _, sub := range subs {
		wg.Add(1)
		go func(h Handler) {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					fmt.Printf("[EventBus] 处理函数 panic / Handler panic: %v\n", r)
				}
			}()
			h(event)
		}(sub.handler)
	}
	wg.Wait()
}

// unsubscribe 内部方法，按ID移除指定事件类型的订阅者
// unsubscribe is an internal method that removes a subscriber by ID
func (b *Bus) unsubscribe(eventType EventType, id string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	subs := b.subscribers[eventType]
	for i, sub := range subs {
		if sub.id == id {
			// 从切片中移除该订阅者（保持顺序）
			// Remove subscriber from slice (preserving order)
			b.subscribers[eventType] = append(subs[:i], subs[i+1:]...)
			return
		}
	}
}

// HasSubscribers 检查指定事件类型是否有订阅者
// HasSubscribers checks whether an event type has any subscribers
func (b *Bus) HasSubscribers(eventType EventType) bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.subscribers[eventType]) > 0
}

// SubscriberCount 返回指定事件类型的订阅者数量
// SubscriberCount returns the number of subscribers for an event type
func (b *Bus) SubscriberCount(eventType EventType) int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.subscribers[eventType])
}

// Close 关闭事件总线，清除所有订阅者
// Close shuts down the event bus and clears all subscribers.
// 关闭后，Publish 和 Subscribe 操作将被忽略
// After closing, Publish and Subscribe calls are no-ops.
func (b *Bus) Close() {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.closed = true
	// 清除所有订阅 / Clear all subscriptions
	b.subscribers = make(map[EventType][]subscriber)
}

// NewEvent 创建一个新的事件实例的便捷函数
// NewEvent is a convenience function to create a new event
func NewEvent(eventType EventType, source string, message string, data interface{}) Event {
	return Event{
		Type:      eventType,
		Source:    source,
		Timestamp: time.Now(),
		Data:      data,
		Message:   message,
	}
}

// defaultBus 默认全局事件总线实例
// Default global event bus instance
var defaultBus = NewBus()

// Default 返回默认的全局事件总线
// Default returns the default global event bus
func Default() *Bus {
	return defaultBus
}
