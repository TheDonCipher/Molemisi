const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export interface ProfileData {
  id: string;
  displayName: string;
  farmName: string;
  farmLevel: number;
  farmXp: number;
  currency: number;
  energy: number;
  maxEnergy: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export class ApiClient {
  private baseUrl: string;
  private retryConfig: RetryConfig;

  constructor(baseUrl: string = API_BASE_URL, retryConfig?: Partial<RetryConfig>) {
    this.baseUrl = baseUrl;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  private getToken(): string | null {
    return localStorage.getItem('molemisi_token') || localStorage.getItem('token');
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRetry<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
          // Don't retry client errors (except retryable ones)
          if (
            response.status >= 400 &&
            response.status < 500 &&
            !this.retryConfig.retryableStatuses.includes(response.status)
          ) {
            throw new Error(data.error?.message || `API error ${response.status}`);
          }

          // Retryable error
          if (attempt < this.retryConfig.maxRetries) {
            const delay = Math.min(
              this.retryConfig.baseDelayMs * Math.pow(2, attempt),
              this.retryConfig.maxDelayMs,
            );
            lastError = new Error(data.error?.message || `API error ${response.status}`);
            await this.sleep(delay);
            continue;
          }

          throw new Error(data.error?.message || `API error ${response.status}`);
        }

        return data.data as T;
      } catch (error) {
        if (error instanceof Error) {
          lastError = error;

          // Network errors are retryable
          if (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('ECONNREFUSED')
          ) {
            if (attempt < this.retryConfig.maxRetries) {
              const delay = Math.min(
                this.retryConfig.baseDelayMs * Math.pow(2, attempt),
                this.retryConfig.maxDelayMs,
              );
              await this.sleep(delay);
              continue;
            }
          }
        }

        throw error;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  async get<T>(path: string): Promise<T> {
    return this.fetchWithRetry<T>('GET', path);
  }

  async getProfile(): Promise<ProfileData> {
    return this.get<ProfileData>('/profile');
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.fetchWithRetry<T>('POST', path, body);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.fetchWithRetry<T>('PATCH', path, body);
  }
}
