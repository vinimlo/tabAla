/**
 * Re-export the shared links store for backward compatibility.
 * The actual implementation is now in @/lib/stores/links.ts
 */

export { linksStore, linksByCollection, linksStats } from '@/lib/stores/links';
