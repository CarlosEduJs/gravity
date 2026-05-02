export interface Job {
	id: string
	name: string
}

export interface Workflow {
	file: string
	name: string
	jobs: Job[]
}

export interface BaseEvent {
	id: string
	runId: string
	seq: number
	timestamp: string // ISO 8601
}

export interface LogPayload {
	jobId?: string
	stepId?: string
	message: string
}

export interface RunStartedPayload {
	event: string
}

export interface RunFinishedPayload {
	status: "success" | "error" | "canceled"
}

export interface JobStartedPayload {
	jobId: string
	name: string
}

export interface JobFinishedPayload {
	jobId: string
	status: "success" | "failure"
}

export interface StepStartedPayload {
	stepId: string
	name: string
}

export interface StepFinishedPayload {
	stepId: string
	status: "success" | "failure"
}

export type GravityEvent =
	| (BaseEvent & { type: "run.started"; payload: RunStartedPayload })
	| (BaseEvent & { type: "run.finished"; payload: RunFinishedPayload })
	| (BaseEvent & { type: "job.started"; payload: JobStartedPayload })
	| (BaseEvent & { type: "job.finished"; payload: JobFinishedPayload })
	| (BaseEvent & { type: "step.started"; payload: StepStartedPayload })
	| (BaseEvent & { type: "step.finished"; payload: StepFinishedPayload })
	| (BaseEvent & { type: "log.output"; payload: LogPayload })


// JSON-RPC

export interface RPCError {
	code: number
	message: string
	data?: unknown
}

export interface RPCRequest<T = unknown> {
	jsonrpc: "2.0"
	method: string
	params: T
	id: number
}

export interface RPCResponse<T = unknown> {
	jsonrpc: "2.0"
	result?: T
	error?: RPCError
	id: number
}

export interface RPCNotification<T = unknown> {
	jsonrpc: "2.0"
	method: string
	params: T
}

export interface Workspace {
	id: string
	name: string
	path: string
	lastOpenedAt: string
}
