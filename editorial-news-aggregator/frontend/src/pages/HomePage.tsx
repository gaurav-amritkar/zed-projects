import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Tabs,
  Tab,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  FilterList as FilterIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  TrendingUp as TrendingIcon,
  Schedule as RecentIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Helmet } from 'react-helmet-async';

import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchArticles,
  fetchTrendingArticles,
  fetchRecentArticles,
  setFilters,
  setView,
  shareArticle,
  incrementViewCount,
} from '../store/slices/articlesSlice';
import { Article } from '../services/api';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleList } from '../components/ArticleList';
import { SearchBar } from '../components/SearchBar';
import { LanguageSelector } from '../components/LanguageSelector';
import { SourceFilter } from '../components/SourceFilter';
import { StatsCard } from '../components/StatsCard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state
  const {
    articles,
    trending,
    recent,
    pagination,
    filters,
    loading,
    error,
    view,
    stats,
  } = useAppSelector((state) => state.articles);

  const { sources } = useAppSelector((state) => state.sources);
  const { selectedLanguage } = useAppSelector((state) => state.languages);

  // Local state
  const [tabValue, setTabValue] = useState(0);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedSource, setSelectedSource] = useState('all');

  // Load initial data
  useEffect(() => {
    const currentFilters = {
      ...filters,
      language: selectedLanguage,
    };

    dispatch(fetchArticles(currentFilters));
    dispatch(fetchTrendingArticles({ language: selectedLanguage }));
    dispatch(fetchRecentArticles({ language: selectedLanguage }));
  }, [dispatch, selectedLanguage]);

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle view change
  const handleViewChange = (newView: 'list' | 'grid' | 'card') => {
    dispatch(setView(newView));
  };

  // Handle filter change
  const handleFilterChange = (newFilters: any) => {
    dispatch(setFilters({ ...newFilters, page: 1 }));
    dispatch(fetchArticles({ ...filters, ...newFilters, page: 1 }));
  };

  // Handle source filter
  const handleSourceFilter = (sourceId: string) => {
    setSelectedSource(sourceId);
    const newFilters = {
      source_id: sourceId === 'all' ? undefined : sourceId,
    };
    handleFilterChange(newFilters);
  };

  // Handle article click
  const handleArticleClick = (article: Article) => {
    dispatch(incrementViewCount(article.id));
    navigate(`/article/${article.id}`);
  };

  // Handle article share
  const handleArticleShare = (articleId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch(shareArticle(articleId));

    // Web Share API if available, otherwise copy to clipboard
    if (navigator.share) {
      const article = articles.find(a => a.id === articleId);
      if (article) {
        navigator.share({
          title: article.title,
          text: article.excerpt || article.summary,
          url: window.location.origin + `/article/${articleId}`,
        });
      }
    } else {
      // Fallback to copy URL
      navigator.clipboard.writeText(`${window.location.origin}/article/${articleId}`);
    }
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    dispatch(setFilters(newFilters));
    dispatch(fetchArticles(newFilters));
  };

  // Handle search
  const handleSearch = (query: string) => {
    handleFilterChange({ search: query });
  };

  // Render article skeleton
  const renderSkeleton = () => (
    <Grid container spacing={3}>
      {[...Array(6)].map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card>
            <Skeleton variant="rectangular" height={200} />
            <CardContent>
              <Skeleton variant="text" height={32} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} width="60%" />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // Render article list based on view type
  const renderArticles = (articleList: Article[]) => {
    if (loading.articles && articleList.length === 0) {
      return renderSkeleton();
    }

    if (view === 'list') {
      return (
        <ArticleList
          articles={articleList}
          onArticleClick={handleArticleClick}
          onShare={handleArticleShare}
        />
      );
    }

    return (
      <Grid container spacing={3}>
        {articleList.map((article) => (
          <Grid
            item
            xs={12}
            sm={view === 'grid' ? 6 : 12}
            md={view === 'grid' ? 4 : 6}
            key={article.id}
          >
            <ArticleCard
              article={article}
              onClick={() => handleArticleClick(article)}
              onShare={(e) => handleArticleShare(article.id, e)}
              variant={view}
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <>
      <Helmet>
        <title>{t('home.title')} | Editorial News Aggregator</title>
        <meta name="description" content={t('home.description')} />
        <meta name="keywords" content="editorial, opinion, news, aggregator, multilingual" />
      </Helmet>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            {t('home.welcome')}
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('home.subtitle')}
          </Typography>
        </Box>

        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title={t('stats.totalArticles')}
                value={stats.total_articles}
                icon={<TrendingIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title={t('stats.editorials')}
                value={stats.total_editorials}
                icon={<TrendingIcon />}
                color="secondary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title={t('stats.opinions')}
                value={stats.total_opinions}
                icon={<TrendingIcon />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title={t('stats.recent24h')}
                value={stats.recent_articles_24h}
                icon={<RecentIcon />}
                color="info"
              />
            </Grid>
          </Grid>
        )}

        {/* Search and Filters */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <SearchBar onSearch={handleSearch} />
            </Grid>
            <Grid item xs={12} md={2}>
              <LanguageSelector />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>{t('filters.source')}</InputLabel>
                <Select
                  value={selectedSource}
                  onChange={(e) => handleSourceFilter(e.target.value)}
                  label={t('filters.source')}
                >
                  <MenuItem value="all">{t('filters.allSources')}</MenuItem>
                  {sources.map((source) => (
                    <MenuItem key={source.id} value={source.id}>
                      {source.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <IconButton
                  onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                  color={filterMenuAnchor ? 'primary' : 'default'}
                >
                  <FilterIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleViewChange('list')}
                  color={view === 'list' ? 'primary' : 'default'}
                >
                  <ListIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleViewChange('grid')}
                  color={view === 'grid' ? 'primary' : 'default'}
                >
                  <GridIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>

          {/* Filter Menu */}
          <Menu
            anchorEl={filterMenuAnchor}
            open={Boolean(filterMenuAnchor)}
            onClose={() => setFilterMenuAnchor(null)}
          >
            <MenuItem onClick={() => handleFilterChange({ is_editorial: true })}>
              {t('filters.editorialsOnly')}
            </MenuItem>
            <MenuItem onClick={() => handleFilterChange({ is_opinion: true })}>
              {t('filters.opinionsOnly')}
            </MenuItem>
            <MenuItem onClick={() => handleFilterChange({ is_editorial: undefined, is_opinion: undefined })}>
              {t('filters.all')}
            </MenuItem>
          </Menu>
        </Box>

        {/* Error Display */}
        {error.articles && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error.articles}
          </Alert>
        )}

        {/* Content Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="content tabs">
            <Tab label={t('tabs.latest')} />
            <Tab label={t('tabs.trending')} />
            <Tab label={t('tabs.recent')} />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          {renderArticles(articles)}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button
                disabled={!pagination.has_prev}
                onClick={() => handlePageChange(pagination.page - 1)}
                sx={{ mr: 2 }}
              >
                {t('pagination.previous')}
              </Button>
              <Typography variant="body1" sx={{ alignSelf: 'center', mx: 2 }}>
                {t('pagination.pageOf', {
                  page: pagination.page,
                  totalPages: pagination.total_pages
                })}
              </Typography>
              <Button
                disabled={!pagination.has_next}
                onClick={() => handlePageChange(pagination.page + 1)}
                sx={{ ml: 2 }}
              >
                {t('pagination.next')}
              </Button>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {loading.trending ? (
            renderSkeleton()
          ) : error.trending ? (
            <Alert severity="error">{error.trending}</Alert>
          ) : (
            renderArticles(trending)
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {loading.recent ? (
            renderSkeleton()
          ) : error.recent ? (
            <Alert severity="error">{error.recent}</Alert>
          ) : (
            renderArticles(recent)
          )}
        </TabPanel>
      </Container>
    </>
  );
};

export default HomePage;
