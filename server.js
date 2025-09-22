const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const reelsRoutes = require('./routes/reels');
const corsConfig = require('./config/cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors(corsConfig));

// Rate limiting - more lenient for testing
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retry_after: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/reels', reelsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Instagram Reels Scraper API - Working 2025 ✅',
    version: '1.0.0',
    status: 'Active',
    endpoints: {
      health: '/health',
      scrapeByUsername: 'GET /api/reels/user/:username',
      scrapeByUrl: 'POST /api/reels/url',
      batchScrape: 'POST /api/reels/batch'
    },
    features: [
      'No login required',
      'Public accounts only', 
      'Fast Playwright-based scraping',
      'Rate limited for stability',
      'Structured JSON output'
    ],
    documentation: 'Built for interview assessment - Sep 2025'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available_endpoints: ['/health', '/api/reels/user/:username', '/api/reels/url', '/api/reels/batch']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Instagram Reels Scraper API running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🎯 Test endpoint: http://localhost:${PORT}/api/reels/user/instagram`);
});

module.exports = app;