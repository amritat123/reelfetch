const { chromium } = require('playwright');
const axios = require('axios');
const UserAgent = require('user-agents');

class InstagramScraper {
  constructor() {
    this.browser = null;
    this.context = null;
   
    this.igAppId = '936619743392459';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      this.context = await this.browser.newContext({
        userAgent: this.userAgent,
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        colorScheme: 'light',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': '*/*',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Dest': 'empty'
        }
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }


  async scrapeReelsByUsernameAPI(username, options = {}) {
    const { limit = 12 } = options;

    try {
      console.log(` Scraping reels for username: ${username} via API`);

      const profileResponse = await axios.get(
        `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
        {
          headers: {
            'X-IG-App-ID': this.igAppId,
            'User-Agent': this.userAgent,
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.instagram.com/',
            'X-Requested-With': 'XMLHttpRequest'
          },
          timeout: 15000
        }
      );

      if (!profileResponse.data?.data?.user) {
        return { error: 'Profile not found', details: 'User does not exist or is private' };
      }

      const user = profileResponse.data.data.user;

      if (user.is_private && !user.followed_by_viewer) {
        return { error: 'Private account', details: 'Cannot scrape reels from private accounts' };
      }


      const profile = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        bio: user.biography,
        profile_pic: user.profile_pic_url_hd || user.profile_pic_url,
        followers: user.edge_followed_by?.count || 0,
        following: user.edge_follow?.count || 0,
        posts: user.edge_owner_to_timeline_media?.count || 0,
        is_verified: user.is_verified,
        is_private: user.is_private,
        external_url: user.external_url,
        business_category: user.business_category_name
      };

   
      const timelineMedia = user.edge_owner_to_timeline_media?.edges || [];
      const reels = [];

      for (const edge of timelineMedia.slice(0, limit)) {
        const node = edge.node;

     
        if (node.__typename === 'GraphVideo' || node.product_type === 'clips') {
          reels.push({
            id: node.id,
            shortcode: node.shortcode,
            url: `https://www.instagram.com/reel/${node.shortcode}/`,
            thumbnail: node.display_url,
            video_url: node.video_url || null,
            caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
            likes: node.edge_media_preview_like?.count || 0,
            comments: node.edge_media_to_comment?.count || 0,
            views: node.video_view_count || 0,
            timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
            dimensions: {
              width: node.dimensions?.width || 0,
              height: node.dimensions?.height || 0
            },
            is_video: node.is_video,
            duration: node.video_duration || 0
          });
        }
      }

      return {
        reels,
        profile,
        pagination: {
          has_next: timelineMedia.length === limit,
          cursor: reels.length > 0 ? reels[reels.length - 1].id : null
        }
      };

    } catch (error) {
      console.error('API method error:', error.message);

    
      return this.scrapeReelsByUsernameBrowser(username, options);
    }
  }


  async scrapeReelsByUsernameBrowser(username, options = {}) {
    const { limit = 12 } = options;

    try {
      console.log(` Fallback: Browser scraping for username: ${username}`);

      await this.initBrowser();
      const page = await this.context.newPage();

    
      await page.goto('https://www.instagram.com/', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });


      await page.waitForTimeout(2000);

    
      const profileUrl = `https://www.instagram.com/${username}/`;
      console.log(`Navigating to: ${profileUrl}`);

      const response = await page.goto(profileUrl, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });

      if (!response || response.status() === 404) {
        await page.close();
        return { error: 'Profile not found', details: 'User does not exist' };
      }

  
      const currentUrl = page.url();
      if (currentUrl.includes('/accounts/login') || currentUrl.includes('/login')) {
        await page.close();
        return { error: 'Login required', details: 'Instagram requires login for this request' };
      }

    
      await page.waitForSelector('main', { timeout: 10000 });


      const profileData = await page.evaluate(() => {
        
        const scripts = Array.from(document.querySelectorAll('script'));
        let profileInfo = null;

        for (const script of scripts) {
          const content = script.textContent || script.innerHTML;
          if (content.includes('profilePage_') || content.includes('user":{"')) {
            try {
              const jsonMatch = content.match(/window\._sharedData\s*=\s*({.*?});/) || 
                               content.match(/"user":\s*({.*?"is_private"[^}]*})/);
              if (jsonMatch) {
                const data = JSON.parse(jsonMatch[1]);
                if (data.user || data.entry_data?.ProfilePage?.[0]?.graphql?.user) {
                  profileInfo = data.user || data.entry_data.ProfilePage[0].graphql.user;
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
        }

 
        if (!profileInfo) {
          const getTextContent = (selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent.trim() : '';
          };

          profileInfo = {
            username: getTextContent('header h2') || getTextContent('h1'),
            full_name: getTextContent('header section h1'),
            biography: getTextContent('header div > span'),
            is_private: !!document.querySelector('h2:contains("This Account is Private")'),
            is_verified: !!document.querySelector('svg[aria-label="Verified"]')
          };
        }

        return profileInfo;
      });

      if (profileData?.is_private) {
        await page.close();
        return { error: 'Private account', details: 'Cannot scrape reels from private accounts' };
      }

    
      try {
        const reelsUrl = `https://www.instagram.com/${username}/reels/`;
        await page.goto(reelsUrl, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(3000);
      } catch (error) {
        console.log('Could not load reels page, extracting from main profile');
      }


      const reels = await page.evaluate((limit) => {
        const reelElements = Array.from(document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]'));
        const reelsData = [];

        for (let i = 0; i < Math.min(reelElements.length, limit); i++) {
          const element = reelElements[i];
          const href = element.getAttribute('href');
          const img = element.querySelector('img');

          if (href && (href.includes('/reel/') || href.includes('/p/'))) {
            const shortcode = href.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/)?.[2];
            if (shortcode) {
              reelsData.push({
                id: shortcode,
                shortcode: shortcode,
                url: `https://www.instagram.com${href}`,
                thumbnail: img ? img.src : '',
                caption: img ? (img.alt || '') : '',
                video_url: null, // Will be populated by individual reel scraping
                likes: 0,
                comments: 0,
                views: 0,
                timestamp: new Date().toISOString(),
                dimensions: { width: 0, height: 0 },
                is_video: href.includes('/reel/'),
                duration: 0
              });
            }
          }
        }

        return reelsData;
      }, limit);

      await page.close();

      const profile = {
        username: profileData?.username || username,
        full_name: profileData?.full_name || '',
        bio: profileData?.biography || '',
        profile_pic: profileData?.profile_pic_url_hd || profileData?.profile_pic_url || '',
        followers: profileData?.edge_followed_by?.count || 0,
        following: profileData?.edge_follow?.count || 0,
        posts: profileData?.edge_owner_to_timeline_media?.count || 0,
        is_verified: profileData?.is_verified || false,
        is_private: profileData?.is_private || false
      };

      return {
        reels,
        profile,
        pagination: {
          has_next: reels.length === limit,
          cursor: reels.length > 0 ? reels[reels.length - 1].id : null
        }
      };

    } catch (error) {
      console.error('Browser scraping error:', error);
      return { error: 'Scraping failed', details: error.message };
    }
  }

 
  async scrapeReelsByUsername(username, options = {}) {
   
    const result = await this.scrapeReelsByUsernameAPI(username, options);

    if (result.error && !result.error.includes('Private account')) {
      console.log('API method failed, trying browser method...');
      return this.scrapeReelsByUsernameBrowser(username, options);
    }

    return result;
  }

  async scrapeReelByUrl(url) {
    try {
      const shortcode = this.extractShortcode(url);
      if (!shortcode) {
        return { error: 'Invalid URL', details: 'URL does not contain a valid shortcode' };
      }

      console.log(` Scraping reel: ${shortcode}`);

  
      try {
        const response = await axios.get(
          `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`,
          {
            headers: {
              'X-IG-App-ID': this.igAppId,
              'User-Agent': this.userAgent,
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.instagram.com/',
              'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 15000
          }
        );

        const items = response.data?.items?.[0];
        if (items) {
          const reel = {
            id: items.id,
            shortcode: items.code,
            url: `https://www.instagram.com/reel/${items.code}/`,
            video_url: items.video_versions?.[0]?.url || null,
            thumbnail: items.image_versions2?.candidates?.[0]?.url || '',
            caption: items.caption?.text || '',
            username: items.user?.username || '',
            user_full_name: items.user?.full_name || '',
            user_profile_pic: items.user?.profile_pic_url || '',
            likes: items.like_count || 0,
            comments: items.comment_count || 0,
            views: items.view_count || items.play_count || 0,
            timestamp: new Date(items.taken_at * 1000).toISOString(),
            duration: items.video_duration || 0,
            dimensions: {
              width: items.original_width || 0,
              height: items.original_height || 0
            },
            is_video: !!items.video_versions,
            product_type: items.product_type
          };

          return { reel };
        }
      } catch (apiError) {
        console.log('API method failed for single reel, trying browser method...');
      }

    
      await this.initBrowser();
      const page = await this.context.newPage();

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const currentUrl = page.url();
      if (currentUrl.includes('/accounts/login')) {
        await page.close();
        return { error: 'Login required', details: 'Instagram requires login for this reel' };
      }

      const reel = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        let reelData = null;

   
        for (const script of scripts) {
          const content = script.textContent || script.innerHTML;
          if (content.includes('shortcode_media') || content.includes('video_url')) {
            try {
              const jsonMatch = content.match(/window\._sharedData\s*=\s*({.*?});/);
              if (jsonMatch) {
                const data = JSON.parse(jsonMatch[1]);
                const media = data.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
                if (media) {
                  reelData = media;
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
        }

      
        if (!reelData) {
          const video = document.querySelector('video');
          const img = document.querySelector('article img');

          reelData = {
            shortcode: window.location.pathname.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/)?.[2],
            video_url: video ? video.src : null,
            display_url: img ? img.src : '',
            edge_media_to_caption: {
              edges: [{ node: { text: document.querySelector('meta[property="og:description"]')?.content || '' } }]
            },
            owner: {
              username: document.querySelector('header a')?.textContent || ''
            },
            video_view_count: 0,
            edge_media_preview_like: { count: 0 },
            taken_at_timestamp: Date.now() / 1000
          };
        }

        return {
          id: reelData.id || reelData.shortcode,
          shortcode: reelData.shortcode,
          url: window.location.href,
          video_url: reelData.video_url,
          thumbnail: reelData.display_url,
          caption: reelData.edge_media_to_caption?.edges?.[0]?.node?.text || '',
          username: reelData.owner?.username || '',
          likes: reelData.edge_media_preview_like?.count || 0,
          comments: reelData.edge_media_to_comment?.count || 0,
          views: reelData.video_view_count || 0,
          timestamp: new Date(reelData.taken_at_timestamp * 1000).toISOString(),
          duration: reelData.video_duration || 0,
          dimensions: {
            width: reelData.dimensions?.width || 0,
            height: reelData.dimensions?.height || 0
          }
        };
      });

      await page.close();
      return { reel };

    } catch (error) {
      console.error('Error scraping reel by URL:', error);
      return { error: 'Scraping failed', details: error.message };
    }
  }

  extractShortcode(url) {
    const regex = /instagram\.com\/(reel|p)\/([A-Za-z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[2] : null;
  }
}


const scraper = new InstagramScraper();


module.exports = {
  scrapeReelsByUsername: (username, options) => scraper.scrapeReelsByUsername(username, options),
  scrapeReelByUrl: (url) => scraper.scrapeReelByUrl(url),
  closeBrowser: () => scraper.closeBrowser()
};


process.on('SIGINT', async () => {
  console.log('Closing browser...');
  await scraper.closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing browser...');
  await scraper.closeBrowser();
  process.exit(0);
});