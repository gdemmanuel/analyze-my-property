/**
 * Claude API Queue Manager
 * 
 * Manages concurrent Claude API calls with:
 * - Token bucket rate limiting
 * - Priority queuing (Pro tier > Free tier)
 * - Backpressure handling
 * - Job status tracking
 */

const isDev = process.env.NODE_ENV !== 'production';

interface QueueJob {
  id: string;
  userId: string;
  tier: 'free' | 'pro';
  priority: number;
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  addedAt: number;
  startedAt?: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

interface QueueStats {
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageWaitTime: number;
  averageProcessingTime: number;
}

export class ClaudeQueue {
  private queue: QueueJob[] = [];
  private processing: Set<string> = new Set();
  private maxConcurrent: number;
  private tokensPerSecond: number;
  private maxTokens: number;
  private currentTokens: number;
  private stats: {
    completed: number;
    failed: number;
    totalWaitTime: number;
    totalProcessingTime: number;
  } = {
    completed: 0,
    failed: 0,
    totalWaitTime: 0,
    totalProcessingTime: 0,
  };

  constructor(maxConcurrent: number = 3, tokensPerSecond: number = 1, maxTokens: number = 5) {
    this.maxConcurrent = maxConcurrent;
    this.tokensPerSecond = tokensPerSecond;
    this.maxTokens = maxTokens;
    this.currentTokens = maxTokens;

    // Refill tokens every second
    setInterval(() => {
      this.currentTokens = Math.min(this.maxTokens, this.currentTokens + this.tokensPerSecond);
      this.processNext();
    }, 1000);
  }

  /**
   * Add a job to the queue
   */
  async enqueue<T>(
    userId: string,
    tier: 'free' | 'pro',
    fn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const job: QueueJob = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        tier,
        priority: tier === 'pro' ? 1 : 0,
        fn,
        resolve,
        reject,
        addedAt: Date.now(),
        status: 'queued',
      };

      this.queue.push(job);
      this.queue.sort((a, b) => {
        // Sort by priority (higher first), then by addedAt (FIFO)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.addedAt - b.addedAt;
      });

      if (isDev) console.log(`[ClaudeQueue] Job ${job.id} queued for ${userId} (${tier}). Queue size: ${this.queue.length}`);
      this.processNext();
    });
  }

  /**
   * Process the next job in the queue
   */
  private async processNext() {
    // Check if we can process more jobs
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    // Check if we have tokens available
    if (this.currentTokens < 1) {
      return;
    }

    // Get next job
    const job = this.queue.shift();
    if (!job) {
      return;
    }

    // Consume a token
    this.currentTokens -= 1;

    // Mark as processing
    this.processing.add(job.id);
    job.status = 'processing';
    job.startedAt = Date.now();

    const waitTime = job.startedAt - job.addedAt;
    this.stats.totalWaitTime += waitTime;

    if (isDev) console.log(`[ClaudeQueue] Processing job ${job.id}. Wait time: ${waitTime}ms. Tokens: ${this.currentTokens}`);

    try {
      const result = await job.fn();
      
      const processingTime = Date.now() - job.startedAt;
      this.stats.totalProcessingTime += processingTime;
      this.stats.completed += 1;

      job.status = 'completed';
      job.resolve(result);

      if (isDev) console.log(`[ClaudeQueue] Job ${job.id} completed in ${processingTime}ms`);
    } catch (error) {
      this.stats.failed += 1;
      job.status = 'failed';
      job.reject(error);

      if (isDev) console.error(`[ClaudeQueue] Job ${job.id} failed:`, error);
    } finally {
      this.processing.delete(job.id);
      
      // Process next job immediately if we have capacity
      setTimeout(() => this.processNext(), 0);
    }
  }

  /**
   * Get queue position for a user
   */
  getPosition(userId: string): number {
    const index = this.queue.findIndex(job => job.userId === userId);
    return index >= 0 ? index + 1 : 0;
  }

  /**
   * Get estimated wait time for a user (in seconds)
   */
  getEstimatedWaitTime(userId: string): number {
    const position = this.getPosition(userId);
    if (position === 0) return 0;

    // Estimate based on average processing time and queue position
    const avgProcessingTime = this.stats.completed > 0
      ? this.stats.totalProcessingTime / this.stats.completed
      : 5000; // Default 5 seconds

    // Account for concurrent processing
    const estimatedTime = (position / this.maxConcurrent) * avgProcessingTime;
    return Math.ceil(estimatedTime / 1000);
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const totalJobs = this.stats.completed + this.stats.failed;
    return {
      queuedJobs: this.queue.length,
      processingJobs: this.processing.size,
      completedJobs: this.stats.completed,
      failedJobs: this.stats.failed,
      averageWaitTime: totalJobs > 0 ? Math.round(this.stats.totalWaitTime / totalJobs) : 0,
      averageProcessingTime: this.stats.completed > 0 
        ? Math.round(this.stats.totalProcessingTime / this.stats.completed) 
        : 0,
    };
  }

  /**
   * Cancel all jobs for a user
   */
  cancelUserJobs(userId: string): number {
    const cancelled = this.queue.filter(job => job.userId === userId);
    this.queue = this.queue.filter(job => job.userId !== userId);
    
    cancelled.forEach(job => {
      job.reject(new Error('Job cancelled by user'));
    });

    return cancelled.length;
  }
}

// Singleton instance
export const claudeQueue = new ClaudeQueue(3, 1, 5);
