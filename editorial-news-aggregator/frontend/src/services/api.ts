import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

// Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface Article {
  id: string;
  title: string;
  url: string;
  content?: string;
  excerpt?: string;
  summary?: string;
  language: string;
  published_date: string;
  fetched_date: string;
  author?: string;
  category: string;
  word_count?: number;
  reading_time?: number;
  sentiment_score?: number;
  is_editorial: boolean;
  is_opinion: boolean;
  is_summary_generated: boolean;
  is_translated: boolean;
  original_language?: string;
  view_count: number;
  share_count: number;
  quality_score?: number;
  tags?: string[];
  topics?: string[];
  slug?: string;
  meta_description?: string;
  image_url?: string;
  source: Source;
}

export interface Source {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  url: string;
  domain: string;
  source_type: string;
  language: string;
  country: string;
  category: string;
  logo_url?: string;
  publisher?: string;
  is_active: boolean;
  is_verified: boolean;
  health_status: string;
  reliability_score: number;
  success_rate: number;
  total_articles_fetched: number;
  tags?: string[];
}

export interface ArticleFilters {
  page?: number;
  per_page?: number;
  language?: string;
  source_id?: string;
  category?: string;
  is_editorial?: boolean;
  is_opinion?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SummarizationRequest {
  model_name?: string;
  regenerate?: boolean;
}

export interface SummarizationResponse {
  message: string;
  summary: string;
  regenerated: boolean;
  model_used: string;
}

export interface ArticleStats {
  total_articles: number;
  total_editorials: number;
  total_opinions: number;
  total_with_summaries: number;
  recent_articles_24h: number;
  summary_coverage_percent: number;
  language_distribution: Record<string, number>;
  top_sources: Record<string, number>;
}

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

class ApiService {
  private api: AxiosInstance;
  private requestInterceptorId?: number;
  private responseInterceptorId?: number;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.requestInterceptorId = this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request timestamp for debugging
        config.metadata = { startTime: new Date() };

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.responseInterceptorId = this.api.interceptors.response.use(
      (response) => {
        // Log response time in development
        if (process.env.NODE_ENV === 'development') {
          const endTime = new Date();
          const startTime = response.config.metadata?.startTime;
          if (startTime) {
            const duration = endTime.getTime() - startTime.getTime();
            console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url}: ${duration}ms`);
          }
        }

        return response;
      },
      (error: AxiosError) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleApiError(error: AxiosError): void {
    const status = error.response?.status;
    const message = error.response?.data?.detail || error.message;

    switch (status) {
      case 400:
        toast.error(`Bad Request: ${message}`);
        break;
      case 401:
        toast.error('Authentication required');
        // Clear auth token and redirect to login
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        break;
      case 403:
        toast.error('Access forbidden');
        break;
      case 404:
        toast.error('Resource not found');
        break;
      case 429:
        toast.error('Too many requests. Please try again later.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        if (error.code === 'NETWORK_ERROR' || !error.response) {
          toast.error('Network error. Please check your connection.');
        } else {
          toast.error(`Error: ${message}`);
        }
    }
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // Articles API
  async getArticles(filters: ArticleFilters = {}): Promise<PaginatedResponse<Article>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await this.api.get(`/articles?${params.toString()}`);
    return response.data;
  }

  async getArticle(articleId: string, includeContent = true): Promise<Article> {
    const response = await this.api.get(`/articles/${articleId}?include_content=${includeContent}`);
    return response.data;
  }

  async summarizeArticle(
    articleId: string,
    options: SummarizationRequest = {}
  ): Promise<SummarizationResponse> {
    const params = new URLSearchParams();

    if (options.model_name) {
      params.append('model_name', options.model_name);
    }
    if (options.regenerate !== undefined) {
      params.append('regenerate', options.regenerate.toString());
    }

    const response = await this.api.post(`/articles/${articleId}/summarize?${params.toString()}`);
    return response.data;
  }

  async getSimilarArticles(articleId: string, limit = 5): Promise<Article[]> {
    const response = await this.api.get(`/articles/${articleId}/similar?limit=${limit}`);
    return response.data;
  }

  async shareArticle(articleId: string): Promise<{ message: string; share_count: number }> {
    const response = await this.api.post(`/articles/${articleId}/share`);
    return response.data;
  }

  async getTrendingArticles(language?: string, days = 7, limit = 10): Promise<Article[]> {
    const params = new URLSearchParams();
    if (language) params.append('language', language);
    params.append('days', days.toString());
    params.append('limit', limit.toString());

    const response = await this.api.get(`/articles/trending?${params.toString()}`);
    return response.data;
  }

  async getRecentArticles(
    language?: string,
    sourceId?: string,
    hours = 24,
    limit = 20
  ): Promise<Article[]> {
    const params = new URLSearchParams();
    if (language) params.append('language', language);
    if (sourceId) params.append('source_id', sourceId);
    params.append('hours', hours.toString());
    params.append('limit', limit.toString());

    const response = await this.api.get(`/articles/recent?${params.toString()}`);
    return response.data;
  }

  async getArticleStats(language?: string): Promise<ArticleStats> {
    const params = language ? `?language=${language}` : '';
    const response = await this.api.get(`/articles/stats${params}`);
    return response.data;
  }

  // Sources API
  async getSources(): Promise<Source[]> {
    const response = await this.api.get('/sources');
    return response.data;
  }

  async getSource(sourceId: string): Promise<Source> {
    const response = await this.api.get(`/sources/${sourceId}`);
    return response.data;
  }

  // Languages API
  async getSupportedLanguages(): Promise<string[]> {
    const response = await this.api.get('/languages');
    return response.data;
  }

  async getLanguageInfo(languageCode: string): Promise<any> {
    const response = await this.api.get(`/languages/${languageCode}`);
    return response.data;
  }

  // Summarization API
  async getAvailableModels(): Promise<any[]> {
    const response = await this.api.get('/summarization/models');
    return response.data;
  }

  async batchSummarize(articleIds: string[], modelName?: string): Promise<any> {
    const response = await this.api.post('/summarization/batch', {
      article_ids: articleIds,
      model_name: modelName,
    });
    return response.data;
  }

  // Search API (if implemented)
  async searchArticles(
    query: string,
    filters: Partial<ArticleFilters> = {}
  ): Promise<PaginatedResponse<Article>> {
    const searchFilters = { ...filters, search: query };
    return this.getArticles(searchFilters);
  }

  // Utility methods
  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  clearAuthToken(): void {
    localStorage.removeItem('auth_token');
  }

  getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // Cleanup method
  destroy(): void {
    if (this.requestInterceptorId !== undefined) {
      this.api.interceptors.request.eject(this.requestInterceptorId);
    }
    if (this.responseInterceptorId !== undefined) {
      this.api.interceptors.response.eject(this.responseInterceptorId);
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types and service
export default apiService;

// Utility functions
export const formatApiError = (error: any): string => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isNetworkError = (error: any): boolean => {
  return error.code === 'NETWORK_ERROR' || !error.response;
};

export const retry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && isNetworkError(error)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};
