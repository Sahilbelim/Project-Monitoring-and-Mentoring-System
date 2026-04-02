export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data:    T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data:    T[];
  pagination: {
    page:  number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}
