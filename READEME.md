# Instagram Reels Scraper API

A fast and reliable Instagram Reels scraper API built with Node.js and Playwright that works with public accounts only. No login required!

## 🚀 Features

- ✅ **No Login Required** - Uses Instagram's public API endpoints
- ✅ **Fast Scraping** - Optimized with multiple fallback methods
- ✅ **Public Accounts Only** - Respects privacy settings
- ✅ **Rate Limited** - Prevents abuse and ensures stability
- ✅ **Structured JSON Output** - Clean, consistent data format
- ✅ **Batch Processing** - Scrape multiple usernames at once
- ✅ **Error Handling** - Comprehensive error responses
- ✅ **Production Ready** - Built for deployment

## 🛠️ Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. **Clone/Extract the project**
   ```bash
   cd instagram-reels-scraper-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browser**
   ```bash
   npm run install-playwright
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📚 API Endpoints

### Health Check
```
GET /health
```

### Scrape Reels by Username
```
GET /api/reels/user/:username?limit=12&cursor=optional
```

**Example:**
```bash
curl "http://localhost:3001/api/reels/user/instagram?limit=6"
```

### Scrape Single Reel by URL
```
POST /api/reels/url
Content-Type: application/json

{
  "url": "https://www.instagram.com/reel/ABC123/"
}
```

### Batch Scrape Multiple Users
```
POST /api/reels/batch
Content-Type: application/json

{
  "usernames": ["instagram", "username2"],
  "limit": 6
}
```

### Test Endpoint
```
GET /api/reels/test
```

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "username": "instagram",
    "reels": [
      {
        "id": "reel_id",
        "shortcode": "ABC123",
        "url": "https://www.instagram.com/reel/ABC123/",
        "thumbnail": "https://...",
        "video_url": "https://...",
        "caption": "Reel caption",
        "likes": 1000,
        "comments": 50,
        "views": 10000,
        "timestamp": "2025-09-21T12:00:00.000Z",
        "duration": 15.5,
        "dimensions": {
          "width": 1080,
          "height": 1920
        }
      }
    ],
    "profile": {
      "username": "instagram",
      "full_name": "Instagram",
      "bio": "Bio text",
      "followers": 1000000,
      "following": 100,
      "posts": 500,
      "is_verified": true,
      "is_private": false
    },
    "pagination": {
      "has_next": true,
      "cursor": "next_cursor"
    },
    "metadata": {
      "scraped_at": "2025-09-21T12:00:00.000Z",
      "total_reels": 6,
      "processing_time_ms": 2500,
      "api_version": "1.0.0"
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Profile not found",
  "details": "User does not exist or is private",
  "timestamp": "2025-09-21T12:00:00.000Z"
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 3001 | Server port |
| `RATE_LIMIT_MAX_REQUESTS` | 50 | Max requests per window |
| `BROWSER_HEADLESS` | true | Run browser in headless mode |
| `DEBUG` | false | Enable debug logging |

## 🚀 Deployment

### Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Set environment variables in Vercel dashboard

### Railway
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

### Heroku
1. Create Heroku app
2. Set buildpack: `heroku buildpacks:add jontewks/puppeteer`
3. Deploy with Git

### Docker
```bash
docker build -t instagram-scraper .
docker run -p 3001:3001 instagram-scraper
```

## 🔐 Rate Limits

- **Standard endpoints**: 50 requests per 15 minutes
- **Batch endpoints**: 3 requests per 5 minutes
- **URL endpoints**: 15 requests per 30 seconds

## ⚠️ Important Notes

1. **Public Accounts Only** - Private accounts will return an error
2. **No Login Required** - Uses Instagram's public endpoints
3. **Respect Rate Limits** - Don't abuse the API
4. **Terms of Service** - Use responsibly and respect Instagram's ToS
5. **Data Usage** - Only use scraped data for legitimate purposes

## 🧪 Testing

Test the API with curl:

```bash
# Test health
curl http://localhost:3001/health

# Test scraping
curl "http://localhost:3001/api/reels/user/instagram?limit=3"

# Test with invalid user
curl "http://localhost:3001/api/reels/user/nonexistentuser"
```

## 🐛 Troubleshooting

### Common Issues

1. **"Profile not found"** - User doesn't exist or is private
2. **"Login required"** - Instagram detected automation (try different user-agent)
3. **"Rate limit exceeded"** - Wait and retry
4. **Browser timeout** - Increase `BROWSER_TIMEOUT` in .env

### Debug Mode
```bash
DEBUG=true npm run dev
```

## 📄 License

MIT License - Use responsibly!

## 🤝 Contributing

Built for interview assessment - September 2025

---

**⭐ Ready for Production Deployment!**
