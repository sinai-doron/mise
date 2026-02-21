import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  keywords?: string;
  type?: 'website' | 'article';
}

const BASE_URL = 'https://mise.app';

export const SEO: React.FC<SEOProps> = ({
  title = 'Mise - Recipe Manager',
  description = 'Manage your recipes, plan meals, and create shopping lists with Mise.',
  canonical = '',
  ogImage = '/og-image.svg',
  keywords = 'recipe manager, meal planning, shopping list, cooking',
  type = 'website',
}) => {
  const fullTitle = title.includes('Mise') ? title : `${title} | Mise`;
  const fullUrl = `${BASE_URL}${canonical}`;
  const fullImageUrl = ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tag
    const setMetaTag = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Helper to update or create link tag
    const setLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    // Primary Meta Tags
    setMetaTag('title', fullTitle);
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);
    setLinkTag('canonical', fullUrl);

    // Open Graph / Facebook
    setMetaTag('og:type', type, true);
    setMetaTag('og:url', fullUrl, true);
    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', fullImageUrl, true);

    // Twitter
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:url', fullUrl);
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', fullImageUrl);
  }, [fullTitle, description, keywords, fullUrl, fullImageUrl, type]);

  return null;
};
