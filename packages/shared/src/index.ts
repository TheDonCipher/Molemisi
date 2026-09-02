// Shared constants
export const API_VERSION = 'v1';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Shared types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    serverTime: string;
    farmVersion?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// Utility functions
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateLevel(xp: number): { level: number; xpToNext: number } {
  let level = 1;
  let xpRequired = 0;

  while (xp >= xpRequired) {
    level++;
    xpRequired = Math.ceil(100 * Math.pow(level, 1.5));
  }

  return {
    level: level - 1,
    xpToNext: xpRequired - xp,
  };
}

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
