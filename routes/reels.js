const express = require('express');
const router = express.Router();
const { scrapeReelsByUsername, scrapeReelByUrl } = require('../utils/scraper');
const { validateUsername, validateUrl } = require('../utils/validator');

/**
 * GET /api/reels/user/:username
 * Scrape reels for a specific username
 */
router.get('/user/:username', async (req, res) => {
  const startTime = Date.now();

  try {
    const { username } = req.params;
    const { limit = 12, cursor } = req.query;

    // Validate username
    // const { error: validationError } = validateUsername(username);

    // if (validationError) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Invalid username',
    //     details: validationError.details[0].message,
    //     timestamp: new Date().toISOString()
    //   });
    // }

    console.log(`🔍 Scraping reels for username: ${username} (limit: ${limit})`);

    const result = await scrapeReelsByUsername(username, {
      limit: Math.min(parseInt(limit), 24), // Cap at 24 for performance
      cursor
    });

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        timestamp: new Date().toISOString()
      });
    }

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        username,
        reels: result.reels || [],
        profile: result.profile || {},
        pagination: result.pagination || { has_next: false },
        metadata: {
          scraped_at: new Date().toISOString(),
          total_reels: result.reels?.length || 0,
          processing_time_ms: processingTime,
          api_version: '1.0.0',
          method: 'instagram_api_v1'
        }
      }
    });

  } catch (error) {
    console.error('Error scraping reels by username:', error);
    res.status(500).json({
      success: false,
      error: 'Scraping failed',
      message: 'Unable to scrape reels for the specified username',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/reels/url
 * Scrape a specific reel by URL
 */
router.post('/url', async (req, res) => {
  const startTime = Date.now();

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing URL',
        details: 'URL parameter is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate URL
    const { error: validationError } = validateUrl(url);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL',
        details: validationError.details[0].message,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🔍 Scraping reel from URL: ${url}`);

    const result = await scrapeReelByUrl(url);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        timestamp: new Date().toISOString()
      });
    }

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        reel: result.reel || {},
        metadata: {
          scraped_at: new Date().toISOString(),
          source_url: url,
          processing_time_ms: processingTime,
          api_version: '1.0.0',
          method: 'instagram_api_v1'
        }
      }
    });

  } catch (error) {
    console.error('Error scraping reel by URL:', error);
    res.status(500).json({
      success: false,
      error: 'Scraping failed',
      message: 'Unable to scrape the specified reel URL',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/reels/batch
 * Scrape multiple usernames in one request
 */
router.post('/batch', async (req, res) => {
  const startTime = Date.now();

  try {
    const { usernames, limit = 6 } = req.body;

    if (!Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'usernames must be a non-empty array',
        timestamp: new Date().toISOString()
      });
    }

    if (usernames.length > 3) {
      return res.status(400).json({
        success: false,
        error: 'Batch limit exceeded',
        message: 'Maximum 3 usernames allowed per batch request for stability',
        timestamp: new Date().toISOString()
      });
    }

    // Validate all usernames
    for (const username of usernames) {
      const { error } = validateUsername(username);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid username in batch',
          details: `Username '${username}': ${error.details[0].message}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    console.log(`🔍 Batch scraping reels for usernames: ${usernames.join(', ')}`);

    const results = await Promise.allSettled(
      usernames.map(username => scrapeReelsByUsername(username, { limit: Math.min(limit, 12) }))
    );

    const batchResults = results.map((result, index) => ({
      username: usernames[index],
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));

    const processingTime = Date.now() - startTime;
    const successfulRequests = batchResults.filter(r => r.status === 'fulfilled' && !r.data?.error).length;

    res.json({
      success: true,
      data: {
        batch_results: batchResults,
        metadata: {
          scraped_at: new Date().toISOString(),
          total_requests: usernames.length,
          successful_requests: successfulRequests,
          failed_requests: usernames.length - successfulRequests,
          processing_time_ms: processingTime,
          api_version: '1.0.0'
        }
      }
    });

  } catch (error) {
    console.error('Error in batch scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Batch scraping failed',
      message: 'Unable to process batch request',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/reels/test
 * Test endpoint to verify API is working
 */
router.get('/test', async (req, res) => {
  try {
    // Test with Instagram's official account (always public)
    const result = await scrapeReelsByUsername('instagram', { limit: 3 });

    res.json({
      success: true,
      message: 'API is working correctly',
      test_data: {
        username: 'instagram',
        reels_found: result.reels?.length || 0,
        has_error: !!result.error,
        error_details: result.error || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'API test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;