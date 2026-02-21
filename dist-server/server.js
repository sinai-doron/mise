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
    }
    else {
        // Use default credentials in Cloud Run
        initializeApp();
    }
}
const db = getFirestore();
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
function isCrawler(userAgent) {
    if (!userAgent)
        return false;
    return CRAWLER_USER_AGENTS.some((crawler) => userAgent.toLowerCase().includes(crawler.toLowerCase()));
}
// Escape HTML special characters
function escapeHtml(text) {
    if (!text)
        return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
// Generate OG meta tags for a recipe
function generateOgTags(recipe) {
    const title = escapeHtml(recipe.title);
    const description = escapeHtml(recipe.description);
    const image = recipe.image || '';
    const siteName = 'Mise - Recipe Manager';
    return `
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:site_name" content="${siteName}" />
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ''}

    <!-- Recipe-specific -->
    <meta name="description" content="${description}" />
    <title>${title} | Mise</title>
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
            }
            else if (recipe) {
                // Read the index.html template
                const indexPath = join(DIST_DIR, 'index.html');
                let html = readFileSync(indexPath, 'utf-8');
                // Generate and inject OG tags
                const ogTags = generateOgTags(recipe);
                // Inject OG tags before </head>
                html = html.replace('</head>', `${ogTags}\n  </head>`);
                // Update the title
                html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(recipe.title)} | Mise</title>`);
                res.send(html);
                return;
            }
        }
        // Recipe not found or deleted - serve default HTML for SPA to handle
        const indexPath = join(DIST_DIR, 'index.html');
        const html = readFileSync(indexPath, 'utf-8');
        res.send(html);
    }
    catch (error) {
        console.error('Error fetching shared recipe:', error);
        // On error, still serve the SPA
        const indexPath = join(DIST_DIR, 'index.html');
        const html = readFileSync(indexPath, 'utf-8');
        res.send(html);
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
