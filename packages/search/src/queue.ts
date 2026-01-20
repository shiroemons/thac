import { getMeilisearchClient } from "./client";

export type IndexOperation = "add" | "update" | "delete";

export interface IndexTask<T = unknown> {
	operation: IndexOperation;
	indexName: string;
	documents?: T[];
	documentIds?: string[];
	retryCount: number;
	createdAt: number;
}

interface QueueConfig {
	batchSize: number; // Max documents per batch (default: 100)
	flushIntervalMs: number; // Max time before flush (default: 100ms)
	maxRetries: number; // Max retry attempts (default: 3)
	baseDelayMs: number; // Base delay for exponential backoff (default: 1000ms)
}

const DEFAULT_CONFIG: QueueConfig = {
	batchSize: 100,
	flushIntervalMs: 100,
	maxRetries: 3,
	baseDelayMs: 1000,
};

// Singleton queue instance
let queue: IndexUpdateQueue | null = null;

export class IndexUpdateQueue {
	private tasks: Map<string, IndexTask[]> = new Map(); // indexName -> tasks
	private flushTimer: ReturnType<typeof setTimeout> | null = null;
	private processing = false;
	private config: QueueConfig;

	constructor(config: Partial<QueueConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Add documents to the index
	 */
	addDocuments<T>(indexName: string, documents: T[]): void {
		this.enqueue({
			operation: "add",
			indexName,
			documents,
			retryCount: 0,
			createdAt: Date.now(),
		});
	}

	/**
	 * Update documents in the index
	 */
	updateDocuments<T>(indexName: string, documents: T[]): void {
		this.enqueue({
			operation: "update",
			indexName,
			documents,
			retryCount: 0,
			createdAt: Date.now(),
		});
	}

	/**
	 * Delete documents from the index
	 */
	deleteDocuments(indexName: string, documentIds: string[]): void {
		this.enqueue({
			operation: "delete",
			indexName,
			documentIds,
			retryCount: 0,
			createdAt: Date.now(),
		});
	}

	private enqueue(task: IndexTask): void {
		const existing = this.tasks.get(task.indexName) || [];
		existing.push(task);
		this.tasks.set(task.indexName, existing);

		this.scheduleFlush();
	}

	private scheduleFlush(): void {
		if (this.flushTimer) return;

		this.flushTimer = setTimeout(() => {
			this.flushTimer = null;
			this.flush().catch(console.error);
		}, this.config.flushIntervalMs);
	}

	/**
	 * Flush all pending tasks
	 */
	async flush(): Promise<void> {
		if (this.processing) return;
		this.processing = true;

		try {
			for (const [indexName, tasks] of this.tasks.entries()) {
				if (tasks.length === 0) continue;

				// Clear tasks for this index
				this.tasks.set(indexName, []);

				// Process in batches
				await this.processBatches(indexName, tasks);
			}
		} finally {
			this.processing = false;
		}
	}

	private async processBatches(
		indexName: string,
		tasks: IndexTask[],
	): Promise<void> {
		const client = getMeilisearchClient();
		const index = client.index(indexName);

		// Group by operation
		const addTasks = tasks.filter(
			(t) => t.operation === "add" || t.operation === "update",
		);
		const deleteTasks = tasks.filter((t) => t.operation === "delete");

		// Process add/update operations
		if (addTasks.length > 0) {
			const allDocuments = addTasks.flatMap((t) => t.documents || []);

			// Split into batches
			for (let i = 0; i < allDocuments.length; i += this.config.batchSize) {
				const batch = allDocuments.slice(
					i,
					i + this.config.batchSize,
				) as Record<string, unknown>[];
				await this.executeWithRetry(async () => {
					await index.addDocuments(batch);
				}, 0);
			}
		}

		// Process delete operations
		if (deleteTasks.length > 0) {
			const allIds = deleteTasks.flatMap((t) => t.documentIds || []);

			// Split into batches
			for (let i = 0; i < allIds.length; i += this.config.batchSize) {
				const batch = allIds.slice(i, i + this.config.batchSize);
				await this.executeWithRetry(async () => {
					await index.deleteDocuments(batch);
				}, 0);
			}
		}
	}

	private async executeWithRetry(
		operation: () => Promise<void>,
		retryCount: number,
	): Promise<void> {
		try {
			await operation();
		} catch (error) {
			if (retryCount >= this.config.maxRetries) {
				console.error("[IndexQueue] Max retries exceeded:", error);
				throw error;
			}

			const delay = this.config.baseDelayMs * 2 ** retryCount;
			console.warn(
				`[IndexQueue] Retry ${retryCount + 1}/${this.config.maxRetries} after ${delay}ms`,
			);

			await new Promise((resolve) => setTimeout(resolve, delay));
			await this.executeWithRetry(operation, retryCount + 1);
		}
	}

	/**
	 * Get queue statistics
	 */
	getStats(): { indexName: string; pendingTasks: number }[] {
		return Array.from(this.tasks.entries()).map(([indexName, tasks]) => ({
			indexName,
			pendingTasks: tasks.length,
		}));
	}

	/**
	 * Clear all pending tasks
	 */
	clear(): void {
		this.tasks.clear();
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}
	}
}

/**
 * Get or create the singleton queue instance
 */
export function getIndexQueue(config?: Partial<QueueConfig>): IndexUpdateQueue {
	if (!queue) {
		queue = new IndexUpdateQueue(config);
	}
	return queue;
}

/**
 * Reset queue (useful for testing)
 */
export function resetIndexQueue(): void {
	if (queue) {
		queue.clear();
	}
	queue = null;
}
