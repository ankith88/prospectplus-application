/**
 * Pluggable Search Service for Prospect+ Universal Lookup
 * Supports:
 * - Native Firestore + SearchKeywords & Fuzzy Scoring (Default)
 * - Typesense / Algolia Full-Text Engine (Pluggable via env vars)
 */

import { generateSearchKeywords, scoreSearchResult } from './search-utils';

export interface SearchOptions {
  query: string;
  searchType?: string;
  limit?: number;
}

export class SearchService {
  /**
   * Check if an external search provider is configured
   */
  static isExternalProviderConfigured(): boolean {
    return Boolean(
      (process.env.TYPESENSE_API_KEY && process.env.TYPESENSE_HOST) ||
      (process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_SEARCH_KEY)
    );
  }

  /**
   * Main search method
   */
  static async search(options: SearchOptions) {
    const { query } = options;

    if (!query || query.trim().length < 2) {
      return { groups: [], individuals: [], tickets: [] };
    }

    if (this.isExternalProviderConfigured()) {
      try {
        return await this.searchExternal(options);
      } catch (err) {
        console.warn('External search provider failed, falling back to native engine:', err);
      }
    }

    // Default: Native Firestore Engine
    return null; // Signals route handler to execute native engine
  }

  /**
   * External Full-Text Provider implementation placeholder (Typesense / Algolia)
   */
  private static async searchExternal(options: SearchOptions) {
    // If TYPESENSE_API_KEY is configured:
    if (process.env.TYPESENSE_API_KEY && process.env.TYPESENSE_HOST) {
      const host = process.env.TYPESENSE_HOST;
      const apiKey = process.env.TYPESENSE_API_KEY;
      const res = await fetch(`${host}/collections/accounts/documents/search?q=${encodeURIComponent(options.query)}&query_by=companyName,prospectPlusId,customerEmail,street`, {
        headers: { 'X-TYPESENSE-API-KEY': apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        // Transform Typesense hits to Prospect+ results format
        return {
          groups: [],
          individuals: (data.hits || []).map((h: any) => h.document),
          tickets: []
        };
      }
    }
    return null;
  }
}
