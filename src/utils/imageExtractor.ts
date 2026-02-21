/**
 * Utility for extracting images from URLs (YouTube videos, web pages)
 */

export interface ExtractionResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^&]+)/,
    // Short URL: https://youtu.be/VIDEO_ID
    /youtu\.be\/([^?&]+)/,
    // Embed URL: https://www.youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([^?&]+)/,
    // Shorts URL: https://www.youtube.com/shorts/VIDEO_ID
    /youtube\.com\/shorts\/([^?&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get YouTube thumbnail URL for a video ID
 * Returns the highest quality available thumbnail
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  // maxresdefault is highest quality but not always available
  // hqdefault is always available
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

/**
 * Extract image from a YouTube URL
 */
export function extractYouTubeImage(url: string): ExtractionResult {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return {
      success: false,
      error: 'Could not extract video ID from YouTube URL',
    };
  }

  return {
    success: true,
    imageUrl: getYouTubeThumbnailUrl(videoId),
  };
}

/**
 * Extract the first Open Graph or meta image from HTML content
 */
function extractImageFromHtml(html: string, baseUrl: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Try Open Graph image first
  const ogImage = doc.querySelector('meta[property="og:image"]');
  if (ogImage) {
    const content = ogImage.getAttribute('content');
    if (content) return resolveUrl(content, baseUrl);
  }

  // Try Twitter card image
  const twitterImage = doc.querySelector('meta[name="twitter:image"]');
  if (twitterImage) {
    const content = twitterImage.getAttribute('content');
    if (content) return resolveUrl(content, baseUrl);
  }

  // Try schema.org image
  const schemaImage = doc.querySelector('meta[itemprop="image"]');
  if (schemaImage) {
    const content = schemaImage.getAttribute('content');
    if (content) return resolveUrl(content, baseUrl);
  }

  // Try finding a large image in the content
  const images = doc.querySelectorAll('img[src]');
  for (const img of images) {
    const src = img.getAttribute('src');
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');

    // Skip small images, icons, tracking pixels
    if (width && parseInt(width) < 200) continue;
    if (height && parseInt(height) < 200) continue;
    if (src && !src.includes('icon') && !src.includes('logo') && !src.includes('avatar')) {
      return resolveUrl(src, baseUrl);
    }
  }

  return null;
}

/**
 * Resolve relative URLs to absolute
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * Fetch URL content via backend proxy to avoid CORS issues
 * Falls back to public proxies if backend is unavailable
 */
async function fetchWithProxy(url: string): Promise<string | null> {
  // Try our backend proxy first
  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, {
      headers: { Accept: 'text/html' },
    });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Backend proxy not available, try fallbacks
  }

  // Fallback to public proxies (for development without server)
  const fallbackProxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];

  for (const proxyFn of fallbackProxies) {
    try {
      const proxyUrl = proxyFn(url);
      const response = await fetch(proxyUrl, {
        headers: { Accept: 'text/html' },
      });
      if (response.ok) {
        return await response.text();
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Extract image from a web page URL using backend proxy
 */
export async function extractWebPageImage(url: string): Promise<ExtractionResult> {
  const html = await fetchWithProxy(url);

  if (html) {
    const imageUrl = extractImageFromHtml(html, url);
    if (imageUrl) {
      return {
        success: true,
        imageUrl,
      };
    }
  }

  return {
    success: false,
    error: 'Could not extract image from this URL. Try pasting the image URL directly.',
  };
}

/**
 * Main function to extract image from any URL
 */
export async function extractImageFromUrl(url: string): Promise<ExtractionResult> {
  if (!url.trim()) {
    return { success: false, error: 'Please enter a URL' };
  }

  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  // Check if it's a YouTube URL
  if (isYouTubeUrl(normalizedUrl)) {
    return extractYouTubeImage(normalizedUrl);
  }

  // Try to extract from web page
  return extractWebPageImage(normalizedUrl);
}
