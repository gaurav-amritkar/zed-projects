import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Article, ArticleFilters, PaginatedResponse, ArticleStats } from '../../services/api';
import apiService from '../../services/api';

// Types
export interface ArticlesState {
  // Article data
  articles: Article[];
  currentArticle: Article | null;
  trending: Article[];
  recent: Article[];
  similar: Article[];

  // Pagination
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };

  // Filters
  filters: ArticleFilters;

  // Statistics
  stats: ArticleStats | null;

  // Loading states
  loading: {
    articles: boolean;
    currentArticle: boolean;
    trending: boolean;
    recent: boolean;
    similar: boolean;
    stats: boolean;
    summarizing: boolean;
  };

  // Error states
  error: {
    articles: string | null;
    currentArticle: string | null;
    trending: string | null;
    recent: string | null;
    similar: string | null;
    stats: string | null;
    summarizing: string | null;
  };

  // UI state
  view: 'list' | 'grid' | 'card';
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // Cache
  cache: {
    articles: { [key: string]: PaginatedResponse<Article> };
    trending: { [key: string]: Article[] };
    recent: { [key: string]: Article[] };
    lastFetch: { [key: string]: number };
  };
}

const initialState: ArticlesState = {
  articles: [],
  currentArticle: null,
  trending: [],
  recent: [],
  similar: [],
  pagination: {
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  },
  filters: {
    page: 1,
    per_page: 20,
    sort_by: 'published_date',
    sort_order: 'desc',
  },
  stats: null,
  loading: {
    articles: false,
    currentArticle: false,
    trending: false,
    recent: false,
    similar: false,
    stats: false,
    summarizing: false,
  },
  error: {
    articles: null,
    currentArticle: null,
    trending: null,
    recent: null,
    similar: null,
    stats: null,
    summarizing: null,
  },
  view: 'list',
  sortBy: 'published_date',
  sortOrder: 'desc',
  cache: {
    articles: {},
    trending: {},
    recent: {},
    lastFetch: {},
  },
};

// Async thunks
export const fetchArticles = createAsyncThunk(
  'articles/fetchArticles',
  async (filters: ArticleFilters = {}, { rejectWithValue }) => {
    try {
      const response = await apiService.getArticles(filters);
      return { response, filters };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

export const fetchArticleById = createAsyncThunk(
  'articles/fetchArticleById',
  async ({ id, includeContent = true }: { id: string; includeContent?: boolean }, { rejectWithValue }) => {
    try {
      const article = await apiService.getArticle(id, includeContent);
      return article;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

export const fetchTrendingArticles = createAsyncThunk(
  'articles/fetchTrendingArticles',
  async ({ language, days = 7, limit = 10 }: { language?: string; days?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const articles = await apiService.getTrendingArticles(language, days, limit);
      return { articles, language, days, limit };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

export const fetchRecentArticles = createAsyncThunk(
  'articles/fetchRecentArticles',
  async ({ language, sourceId, hours = 24, limit = 20 }: {
    language?: string;
    sourceId?: string;
    hours?: number;
    limit?: number;
  }, { rejectWithValue }) => {
    try {
      const articles = await apiService.getRecentArticles(language, sourceId, hours, limit);
      return { articles, language, sourceId, hours, limit };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

export const fetchSimilarArticles = createAsyncThunk(
  'articles/fetchSimilarArticles',
  async ({ articleId, limit = 5 }: { articleId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const articles = await apiService.getSimilarArticles(articleId, limit);
      return articles;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

export const fetchArticleStats = createAsyncThunk(
  'articles/fetchArticleStats',
  async (language?: string, { rejectWithValue }) => {
    try {
      const stats = await apiService.getArticleStats(language);
      return stats;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

export const summarizeArticle = createAsyncThunk(
  'articles/summarizeArticle',
  async ({ articleId, modelName, regenerate = false }: {
    articleId: string;
    modelName?: string;
    regenerate?: boolean;
  }, { rejectWithValue }) => {
    try {
      const result = await apiService.summarizeArticle(articleId, { model_name: modelName, regenerate });
      return { articleId, ...result };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

export const shareArticle = createAsyncThunk(
  'articles/shareArticle',
  async (articleId: string, { rejectWithValue }) => {
    try {
      const result = await apiService.shareArticle(articleId);
      return { articleId, ...result };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

// Slice
const articlesSlice = createSlice({
  name: 'articles',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ArticleFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset page when filters change (except for page itself)
      if (!action.payload.page) {
        state.filters.page = 1;
      }
    },

    clearFilters: (state) => {
      state.filters = {
        page: 1,
        per_page: 20,
        sort_by: 'published_date',
        sort_order: 'desc',
      };
    },

    setView: (state, action: PayloadAction<'list' | 'grid' | 'card'>) => {
      state.view = action.payload;
    },

    setSorting: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
      state.filters.sort_by = action.payload.sortBy;
      state.filters.sort_order = action.payload.sortOrder;
      state.filters.page = 1; // Reset to first page when sorting changes
    },

    clearCurrentArticle: (state) => {
      state.currentArticle = null;
      state.similar = [];
    },

    clearError: (state, action: PayloadAction<keyof ArticlesState['error']>) => {
      state.error[action.payload] = null;
    },

    clearAllErrors: (state) => {
      Object.keys(state.error).forEach(key => {
        state.error[key as keyof ArticlesState['error']] = null;
      });
    },

    updateArticleInList: (state, action: PayloadAction<Partial<Article> & { id: string }>) => {
      const { id, ...updates } = action.payload;

      // Update in articles list
      const articleIndex = state.articles.findIndex(article => article.id === id);
      if (articleIndex !== -1) {
        state.articles[articleIndex] = { ...state.articles[articleIndex], ...updates };
      }

      // Update current article if it matches
      if (state.currentArticle?.id === id) {
        state.currentArticle = { ...state.currentArticle, ...updates };
      }

      // Update in trending list
      const trendingIndex = state.trending.findIndex(article => article.id === id);
      if (trendingIndex !== -1) {
        state.trending[trendingIndex] = { ...state.trending[trendingIndex], ...updates };
      }

      // Update in recent list
      const recentIndex = state.recent.findIndex(article => article.id === id);
      if (recentIndex !== -1) {
        state.recent[recentIndex] = { ...state.recent[recentIndex], ...updates };
      }
    },

    incrementViewCount: (state, action: PayloadAction<string>) => {
      const articleId = action.payload;

      const updateViewCount = (article: Article) => {
        article.view_count = (article.view_count || 0) + 1;
      };

      // Update in all relevant arrays
      const articleInList = state.articles.find(a => a.id === articleId);
      if (articleInList) updateViewCount(articleInList);

      if (state.currentArticle?.id === articleId) {
        updateViewCount(state.currentArticle);
      }

      const trendingArticle = state.trending.find(a => a.id === articleId);
      if (trendingArticle) updateViewCount(trendingArticle);

      const recentArticle = state.recent.find(a => a.id === articleId);
      if (recentArticle) updateViewCount(recentArticle);
    },

    loadFromCache: (state, action: PayloadAction<{ key: string; type: 'articles' | 'trending' | 'recent' }>) => {
      const { key, type } = action.payload;
      const cached = state.cache[type][key];

      if (type === 'articles' && cached) {
        state.articles = (cached as PaginatedResponse<Article>).articles || [];
        state.pagination = (cached as PaginatedResponse<Article>).pagination || state.pagination;
      } else if (cached && Array.isArray(cached)) {
        state[type] = cached as Article[];
      }
    },

    clearCache: (state, action: PayloadAction<'all' | 'articles' | 'trending' | 'recent'>) => {
      if (action.payload === 'all') {
        state.cache = {
          articles: {},
          trending: {},
          recent: {},
          lastFetch: {},
        };
      } else {
        state.cache[action.payload] = {};
      }
    },
  },

  extraReducers: (builder) => {
    // Fetch articles
    builder
      .addCase(fetchArticles.pending, (state) => {
        state.loading.articles = true;
        state.error.articles = null;
      })
      .addCase(fetchArticles.fulfilled, (state, action) => {
        state.loading.articles = false;
        state.articles = action.payload.response.articles || [];
        state.pagination = action.payload.response.pagination || state.pagination;

        // Cache the result
        const cacheKey = JSON.stringify(action.payload.filters);
        state.cache.articles[cacheKey] = action.payload.response;
        state.cache.lastFetch[cacheKey] = Date.now();
      })
      .addCase(fetchArticles.rejected, (state, action) => {
        state.loading.articles = false;
        state.error.articles = action.payload as string;
      });

    // Fetch article by ID
    builder
      .addCase(fetchArticleById.pending, (state) => {
        state.loading.currentArticle = true;
        state.error.currentArticle = null;
      })
      .addCase(fetchArticleById.fulfilled, (state, action) => {
        state.loading.currentArticle = false;
        state.currentArticle = action.payload;
      })
      .addCase(fetchArticleById.rejected, (state, action) => {
        state.loading.currentArticle = false;
        state.error.currentArticle = action.payload as string;
      });

    // Fetch trending articles
    builder
      .addCase(fetchTrendingArticles.pending, (state) => {
        state.loading.trending = true;
        state.error.trending = null;
      })
      .addCase(fetchTrendingArticles.fulfilled, (state, action) => {
        state.loading.trending = false;
        state.trending = action.payload.articles;

        // Cache the result
        const cacheKey = `${action.payload.language}-${action.payload.days}-${action.payload.limit}`;
        state.cache.trending[cacheKey] = action.payload.articles;
        state.cache.lastFetch[cacheKey] = Date.now();
      })
      .addCase(fetchTrendingArticles.rejected, (state, action) => {
        state.loading.trending = false;
        state.error.trending = action.payload as string;
      });

    // Fetch recent articles
    builder
      .addCase(fetchRecentArticles.pending, (state) => {
        state.loading.recent = true;
        state.error.recent = null;
      })
      .addCase(fetchRecentArticles.fulfilled, (state, action) => {
        state.loading.recent = false;
        state.recent = action.payload.articles;

        // Cache the result
        const cacheKey = `${action.payload.language}-${action.payload.sourceId}-${action.payload.hours}-${action.payload.limit}`;
        state.cache.recent[cacheKey] = action.payload.articles;
        state.cache.lastFetch[cacheKey] = Date.now();
      })
      .addCase(fetchRecentArticles.rejected, (state, action) => {
        state.loading.recent = false;
        state.error.recent = action.payload as string;
      });

    // Fetch similar articles
    builder
      .addCase(fetchSimilarArticles.pending, (state) => {
        state.loading.similar = true;
        state.error.similar = null;
      })
      .addCase(fetchSimilarArticles.fulfilled, (state, action) => {
        state.loading.similar = false;
        state.similar = action.payload;
      })
      .addCase(fetchSimilarArticles.rejected, (state, action) => {
        state.loading.similar = false;
        state.error.similar = action.payload as string;
      });

    // Fetch article stats
    builder
      .addCase(fetchArticleStats.pending, (state) => {
        state.loading.stats = true;
        state.error.stats = null;
      })
      .addCase(fetchArticleStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchArticleStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error.stats = action.payload as string;
      });

    // Summarize article
    builder
      .addCase(summarizeArticle.pending, (state) => {
        state.loading.summarizing = true;
        state.error.summarizing = null;
      })
      .addCase(summarizeArticle.fulfilled, (state, action) => {
        state.loading.summarizing = false;

        // Update the article with the new summary
        const articleId = action.payload.articleId;
        const summary = action.payload.summary;

        const updateSummary = (article: Article) => {
          article.summary = summary;
          article.is_summary_generated = true;
        };

        // Update in all relevant arrays
        const articleInList = state.articles.find(a => a.id === articleId);
        if (articleInList) updateSummary(articleInList);

        if (state.currentArticle?.id === articleId) {
          updateSummary(state.currentArticle);
        }

        const trendingArticle = state.trending.find(a => a.id === articleId);
        if (trendingArticle) updateSummary(trendingArticle);

        const recentArticle = state.recent.find(a => a.id === articleId);
        if (recentArticle) updateSummary(recentArticle);
      })
      .addCase(summarizeArticle.rejected, (state, action) => {
        state.loading.summarizing = false;
        state.error.summarizing = action.payload as string;
      });

    // Share article
    builder
      .addCase(shareArticle.fulfilled, (state, action) => {
        const articleId = action.payload.articleId;
        const shareCount = action.payload.share_count;

        const updateShareCount = (article: Article) => {
          article.share_count = shareCount;
        };

        // Update in all relevant arrays
        const articleInList = state.articles.find(a => a.id === articleId);
        if (articleInList) updateShareCount(articleInList);

        if (state.currentArticle?.id === articleId) {
          updateShareCount(state.currentArticle);
        }

        const trendingArticle = state.trending.find(a => a.id === articleId);
        if (trendingArticle) updateShareCount(trendingArticle);

        const recentArticle = state.recent.find(a => a.id === articleId);
        if (recentArticle) updateShareCount(recentArticle);
      });
  },
});

// Export actions
export const {
  setFilters,
  clearFilters,
  setView,
  setSorting,
  clearCurrentArticle,
  clearError,
  clearAllErrors,
  updateArticleInList,
  incrementViewCount,
  loadFromCache,
  clearCache,
} = articlesSlice.actions;

// Selectors
export const selectArticles = (state: { articles: ArticlesState }) => state.articles.articles;
export const selectCurrentArticle = (state: { articles: ArticlesState }) => state.articles.currentArticle;
export const selectTrending = (state: { articles: ArticlesState }) => state.articles.trending;
export const selectRecent = (state: { articles: ArticlesState }) => state.articles.recent;
export const selectSimilar = (state: { articles: ArticlesState }) => state.articles.similar;
export const selectPagination = (state: { articles: ArticlesState }) => state.articles.pagination;
export const selectFilters = (state: { articles: ArticlesState }) => state.articles.filters;
export const selectStats = (state: { articles: ArticlesState }) => state.articles.stats;
export const selectLoading = (state: { articles: ArticlesState }) => state.articles.loading;
export const selectError = (state: { articles: ArticlesState }) => state.articles.error;
export const selectView = (state: { articles: ArticlesState }) => state.articles.view;

export default articlesSlice.reducer;
