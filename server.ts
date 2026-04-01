import express from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = express();
app.use(express.json({ limit: '100kb' }));
const PORT = process.env.PORT || 8080;
const DIST_DIR = join(process.cwd(), 'dist');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
  const siteName = 'Duckbook - Recipe Manager';
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
          `<title>${escapeHtml(recipe.title)} | Duckbook</title>`
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
          `<title>${escapeHtml(title)} | Duckbook</title>`
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

// Handle shopping list invite link requests
app.get('/shopping/join/:inviteCode', async (req, res) => {
  const { inviteCode } = req.params;

  try {
    const snapshot = await db.collection('shoppingLists')
      .where('inviteCode', '==', inviteCode)
      .where('inviteEnabled', '==', true)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const list = snapshot.docs[0].data();

      const indexPath = join(DIST_DIR, 'index.html');
      let html = readFileSync(indexPath, 'utf-8');

      const ownerName = list.ownerName || 'Someone';
      const title = `Join "${list.name}" on Duckbook`;
      const description = `${ownerName} invited you to collaborate on their shopping list "${list.name}".`;

      const ogTags = generateOgTags({
        title,
        description,
        url: `https://getprepd.app/shopping/join/${inviteCode}`,
        type: 'website',
      });

      html = html.replace('</head>', `${ogTags}\n  </head>`);
      html = html.replace(
        /<title>.*?<\/title>/,
        `<title>${escapeHtml(title)} | Duckbook</title>`
      );

      res.send(html);
      return;
    }

    // Invite not found or disabled - serve default HTML for SPA to handle
    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error fetching shopping list invite:', error);
    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    res.send(html);
  }
});

// --- AI Recipe Import utilities ---

function escapeForJSON(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, (char) =>
      '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
    );
}

function sanitizeModelJSON(text: string): string {
  return text
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2028\u2029]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

const CONVERSION_PROMPT = `You are a recipe data converter. Convert the provided recipe into the exact JSON format specified below.

## Output Format

\`\`\`json
{
  "title": "Recipe Name",
  "description": "Brief 1-2 sentence description",
  "aboutDish": "Optional longer description about the dish's origin, history, or what makes it special",
  "image": "",
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "easy|medium|hard",
  "defaultServings": 4,
  "category": "Main Dishes|Appetizers|Desserts|Soups|Salads|Breakfast|Beverages|Side Dishes|Snacks",
  "tags": ["tag1", "tag2"],
  "author": "Optional author name",
  "sourceUrl": "URL where recipe was found (if provided)",
  "rating": 4.5,
  "nutrition": {
    "calories": 350,
    "protein": 25,
    "carbs": 30,
    "fat": 15
  },
  "chefTip": "Optional professional tip for best results",
  "language": "en|he",
  "ingredients": [
    {
      "id": "ing-1",
      "name": "ingredient name",
      "quantity": 2,
      "unit": "cups|tbsp|tsp|g|kg|ml|l|oz|lb|pieces|cloves|whole",
      "category": "produce|dairy|meat|pantry|frozen|bakery|spices|other",
      "notes": "optional notes like 'diced' or 'room temperature'"
    }
  ],
  "steps": [
    {
      "id": "step-1",
      "order": 1,
      "description": "Step instruction text",
      "timer": 300,
      "tips": "Optional tip for this step"
    }
  ]
}
\`\`\`

## Category Mapping for Ingredients
- **produce**: fruits, vegetables, fresh herbs, garlic, onions, potatoes
- **dairy**: milk, cheese, butter, eggs, cream, yogurt
- **meat**: beef, chicken, pork, fish, seafood, lamb
- **bakery**: bread, tortillas, pita, buns, pastry
- **frozen**: frozen vegetables, ice cream, frozen fruits
- **pantry**: pasta, rice, flour, sugar, canned goods, oils, vinegar, sauces
- **spices**: salt, pepper, cumin, paprika, dried herbs, spice blends
- **other**: anything that doesn't fit above

## Rules
1. Generate unique IDs for ingredients (ing-1, ing-2...) and steps (step-1, step-2...)
2. Timer is in SECONDS (5 minutes = 300 seconds). Only add timer if step involves waiting/cooking time
3. Times (prepTime, cookTime) are in MINUTES
4. Quantity must be a number (use 0.5 for "half", 0.25 for "quarter")
5. Keep step descriptions clear and actionable
6. Use "en" for English recipes, "he" for Hebrew recipes
7. Estimate nutrition if not provided (per serving)
8. Tags should be lowercase, no spaces (use hyphens if needed)
9. Difficulty: easy (under 30 min, simple techniques), medium (30-60 min or moderate skill), hard (60+ min or advanced techniques)

## Recipe to Convert

Note: The recipe text below has special characters pre-escaped for JSON (e.g., quotes as \\", backslashes as \\\\, newlines as \\n). Use these escaped values directly in your JSON string fields.

`;

function extractTextFromHtml(html: string): string {
  let text = html;
  // Remove script, style, nav, header, footer, aside tags and their contents
  text = text.replace(/<(script|style|nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code)))
    .replace(/&\w+;/g, ' ');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  // Truncate to 10,000 chars
  if (text.length > 10000) {
    text = text.substring(0, 10000);
  }
  return text;
}

function extractImageFromHtml(html: string, url?: string): string | null {
  // Try og:image
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogMatch) return ogMatch[1];

  // Try twitter:image
  const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  if (twMatch) return twMatch[1];

  // Try itemprop="image"
  const itemMatch = html.match(/<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/i);
  if (itemMatch) return itemMatch[1];

  // YouTube thumbnail extraction
  if (url) {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
  }

  return null;
}

// Simple in-memory rate limiter: 10 req/min per IP
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

// POST /api/import-recipe — server-side AI recipe conversion via Gemini
app.post('/api/import-recipe', async (req, res) => {
  if (!GEMINI_API_KEY) {
    res.status(503).json({ error: 'AI import not configured', code: 'NO_API_KEY' });
    return;
  }

  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
    return;
  }

  const { text, url, keepNote } = req.body;
  if (!text && !url && !keepNote) {
    res.status(400).json({ error: 'Provide one of: text, url, or keepNote' });
    return;
  }

  let recipeText = '';
  let sourceUrl: string | undefined;
  let extractedImageUrl: string | null = null;

  try {
    if (text) {
      recipeText = typeof text === 'string' ? text : '';
    } else if (url) {
      if (typeof url !== 'string' || !isValidExternalUrl(url)) {
        res.status(400).json({ error: 'Invalid URL' });
        return;
      }
      sourceUrl = url;

      // Fetch HTML (reuse proxy fetch pattern)
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
        res.status(400).json({ error: 'Could not fetch URL' });
        return;
      }

      const html = await response.text();
      recipeText = extractTextFromHtml(html);
      extractedImageUrl = extractImageFromHtml(html, url);

      if (recipeText.length < 100) {
        res.status(400).json({ error: 'Could not extract enough content from URL' });
        return;
      }
    } else if (keepNote) {
      const title = typeof keepNote.title === 'string' ? keepNote.title : '';
      const content = typeof keepNote.content === 'string' ? keepNote.content : '';
      recipeText = `Title: ${title}\n\nContent:\n${content}`;
    }

    if (!recipeText.trim()) {
      res.status(400).json({ error: 'No recipe content provided' });
      return;
    }

    // Build prompt
    let prompt = CONVERSION_PROMPT;
    if (sourceUrl) {
      prompt += `Source URL: ${sourceUrl}\n\n`;
    }
    prompt += escapeForJSON(recipeText);
    prompt += '\n\n---\n\nOutput ONLY the JSON object, no additional text or markdown code blocks.';
    if (sourceUrl) {
      prompt += `\n\nIMPORTANT: Include "sourceUrl": "${sourceUrl}" in your JSON output.`;
    }

    // Call Gemini API
    const geminiController = new AbortController();
    const geminiTimeout = setTimeout(() => geminiController.abort(), 30000);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }),
        signal: geminiController.signal,
      }
    );
    clearTimeout(geminiTimeout);

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text().catch(() => '');
      console.error('Gemini API error:', geminiRes.status, errBody);
      res.status(502).json({ error: 'AI service error' });
      return;
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      res.status(422).json({ error: 'AI returned empty response' });
      return;
    }

    // Parse and validate
    let cleanJson = sanitizeModelJSON(rawText.trim());
    // Strip markdown fences if present
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    else if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
    cleanJson = cleanJson.trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      res.status(422).json({ error: 'AI returned invalid JSON' });
      return;
    }

    if (!parsed.title || !Array.isArray(parsed.ingredients) || !Array.isArray(parsed.steps)) {
      res.status(422).json({ error: 'AI output missing required fields (title, ingredients, steps)' });
      return;
    }

    // Inject extracted image/sourceUrl if AI didn't provide them
    if (!parsed.image && extractedImageUrl) {
      parsed.image = extractedImageUrl;
    }
    if (!parsed.sourceUrl && sourceUrl) {
      parsed.sourceUrl = sourceUrl;
    }

    const responsePayload: { recipe: typeof parsed; imageUrl?: string } = { recipe: parsed };
    if (extractedImageUrl) {
      responsePayload.imageUrl = extractedImageUrl;
    }

    res.json(responsePayload);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      res.status(504).json({ error: 'Request timed out' });
      return;
    }
    console.error('Import recipe error:', err);
    res.status(500).json({ error: 'Internal server error' });
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
