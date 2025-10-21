/**
 * Language utilities for handling language-aware navigation
 */

/**
 * Get the current language from the URL path
 */
export function getLangFromPath(pathname: string): 'en' | 'he' {
  const langMatch = pathname.match(/^\/(he|en)(\/|$)/);
  return langMatch && (langMatch[1] === 'he' || langMatch[1] === 'en') 
    ? langMatch[1] as 'en' | 'he'
    : 'en';
}

/**
 * Create a language-aware path
 */
export function createLangPath(path: string, lang: 'en' | 'he'): string {
  // Remove any existing language prefix
  const cleanPath = path.replace(/^\/(he|en)(\/|$)/, '/');
  // Add new language prefix
  return `/${lang}${cleanPath === '/' ? '' : cleanPath}`;
}

/**
 * Switch language by updating the URL
 */
export function switchLanguage(currentPath: string, newLang: 'en' | 'he'): string {
  return createLangPath(currentPath, newLang);
}

/**
 * Get clean path without language prefix
 */
export function getCleanPath(pathname: string): string {
  return pathname.replace(/^\/(he|en)(\/|$)/, '/');
}

