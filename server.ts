import express from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = express();
const PORT = process.env.PORT || 8080;
const DIST_DIR = join(process.cwd(), 'dist');

// Initialize Firebase Admin SDK
// In production, use default credentials from Cloud Run
// In development, use service account from environment variable
if (getApps().length === 0) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    });
  } else {
    // Use default credentials in Cloud Run
    initializeApp();
  }
}

const db = getFirestore();

// URL validation helper for proxy endpoint
function isValidExternalUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    // Only allow http/https
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    // Block internal networks
    const blockedPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '10.', '192.168.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'];
    const hostname = url.hostname.toLowerCase();
    if (blockedPatterns.some(p => hostname === p || hostname.startsWith(p))) return false;
    return true;
  } catch {
    return false;
  }
}

// List of known social media crawler user agents
const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'LinkedInBot',
  'Twitterbot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Pinterest',
  'Googlebot',
  'bingbot',
];

// Check if the request is from a social media crawler
function isCrawler(userAgent: string): boolean {
  if (!userAgent) return false;
  return CRAWLER_USER_AGENTS.some((crawler) =>
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  );
}

// Escape HTML special characters
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate OG meta tags
function generateOgTags(data: {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: string;
}): string {
  const title = escapeHtml(data.title);
  const description = escapeHtml(data.description);
  const image = data.image || '';
  const siteName = 'Prepd - Recipe Manager';
  const type = data.type || 'article';

  return `
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${type}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:site_name" content="${siteName}" />
    ${data.url ? `<meta property="og:url" content="${escapeHtml(data.url)}" />` : ''}
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ''}

    <!-- Meta -->
    <meta name="description" content="${description}" />
  `;
}

// Handle shared recipe requests
app.get('/recipe/:shareId', async (req, res) => {
  const { shareId } = req.params;
  const userAgent = req.headers['user-agent'] || '';

  // Always fetch recipe data for OG tags (even for non-crawlers, we want proper meta)
  try {
    const docRef = db.collection('sharedRecipes').doc(shareId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const recipe = docSnap.data();

      // Check if recipe is deleted (sharing disabled)
      if (recipe?.isDeleted) {
        // For crawlers, return 404-like page
        if (isCrawler(userAgent)) {
          res.status(404).send('<html><head><title>Recipe not found</title></head><body>Recipe not found</body></html>');
          return;
        }
        // For users, let the SPA handle it
      } else if (recipe) {
        // Read the index.html template
        const indexPath = join(DIST_DIR, 'index.html');
        let html = readFileSync(indexPath, 'utf-8');

        // Generate and inject OG tags
        const ogTags = generateOgTags({
          title: recipe.title,
          description: recipe.description,
          url: `https://getprepd.app/recipe/${shareId}`,
          image: recipe.image,
          type: 'article',
        });

        // Inject OG tags before </head>
        html = html.replace('</head>', `${ogTags}\n  </head>`);

        // Update the title
        html = html.replace(
          /<title>.*?<\/title>/,
          `<title>${escapeHtml(recipe.title)} | Prepd</title>`
        );

        res.send(html);
        return;
      }
    }

    // Recipe not found or deleted - serve default HTML for SPA to handle
    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error fetching shared recipe:', error);
    // On error, still serve the SPA
    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    res.send(html);
  }
});

// Handle collection requests
app.get('/u/:collectionId', async (req, res) => {
  const { collectionId } = req.params;

  try {
    const docRef = db.collection('collections').doc(collectionId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const collection = docSnap.data();

      const isAccessible = collection && (
        collection.isPublic === true ||
        collection.visibility === 'public' ||
        collection.visibility === 'unlisted'
      );
      if (isAccessible) {
        // Read the index.html template
        const indexPath = join(DIST_DIR, 'index.html');
        let html = readFileSync(indexPath, 'utf-8');

        // Generate title
        const ownerName = collection.ownerName || 'Chef';
        const title = `${collection.name} by ${ownerName}`;
        const description = collection.description || `${collection.recipeIds?.length || 0} recipes`;

        // Generate and inject OG tags
        const ogTags = generateOgTags({
          title,
          description,
          url: `https://getprepd.app/u/${collectionId}`,
          image: collection.coverImage,
          type: 'profile',
        });

        // Inject OG tags before </head>
        html = html.replace('</head>', `${ogTags}\n  </head>`);

        // Update the title
        html = html.replace(
          /<title>.*?<\/title>/,
          `<title>${escapeHtml(title)} | Prepd</title>`
        );

        res.send(html);
        return;
      }
    }

    // Collection not found or private - serve default HTML for SPA to handle
    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error fetching collection:', error);
    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    res.send(html);
  }
});

// Proxy endpoint for fetching external URLs (replaces public CORS proxies)
app.get('/api/proxy', async (req, res) => {
  const url = req.query.url as string;

  if (!url || !isValidExternalUrl(url)) {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mise Recipe Fetcher/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      res.status(response.status).json({ error: 'Failed to fetch URL' });
      return;
    }

    const html = await response.text();
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Proxy fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch URL' });
  }
});

// Serve static files from dist
app.use(express.static(DIST_DIR));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  const indexPath = join(DIST_DIR, 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
