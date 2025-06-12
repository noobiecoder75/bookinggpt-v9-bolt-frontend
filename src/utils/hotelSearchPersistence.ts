import { supabase } from '../lib/supabase';

export interface HotelSearchSession {
  id: string;
  quote_id: string;
  session_key: string;
  search_criteria: any;
  search_results: any[];
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export class HotelSearchPersistence {
  /**
   * Clean up expired search sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('hotel_search_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Error cleaning up expired sessions:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} expired hotel search sessions`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error in cleanup function:', error);
      return 0;
    }
  }

  /**
   * Get all search sessions for a quote
   */
  static async getSessionsForQuote(quoteId: string): Promise<HotelSearchSession[]> {
    try {
      const { data, error } = await supabase
        .from('hotel_search_sessions')
        .select('*')
        .eq('quote_id', quoteId)
        .gt('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions for quote:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSessionsForQuote:', error);
      return [];
    }
  }

  /**
   * Delete all search sessions for a quote
   */
  static async clearSessionsForQuote(quoteId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('hotel_search_sessions')
        .delete()
        .eq('quote_id', quoteId);

      if (error) {
        console.error('Error clearing sessions for quote:', error);
        return false;
      }

      console.log(`Cleared all search sessions for quote ${quoteId}`);
      return true;
    } catch (error) {
      console.error('Error in clearSessionsForQuote:', error);
      return false;
    }
  }

  /**
   * Initialize cleanup on app startup (optional)
   */
  static initializeCleanup() {
    // Clean up expired sessions when the utility is first imported
    this.cleanupExpiredSessions();

    // Set up periodic cleanup every hour
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.cleanupExpiredSessions();
      }, 60 * 60 * 1000); // 1 hour
    }
  }
}

// Initialize cleanup when this module is imported
HotelSearchPersistence.initializeCleanup();