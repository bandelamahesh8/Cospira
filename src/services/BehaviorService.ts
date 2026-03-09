import { supabase } from '@/integrations/supabase/client';

export class BehaviorService {
  static async submitReport(
    reporterId: string,
    reportedId: string,
    category: string,
    description: string
  ) {
    // 1. Submit Report
    const { error } = await supabase.from('player_reports').insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      category,
      description,
    });

    if (error) throw error;

    // 2. Trigger Auto-Analysis (Simulated Elite AI)
    // In a real system, this is a background job.
    // Here, we check if the reported user has a spike in reports.
    await this.checkAutoPenalty(reportedId);

    return true;
  }

  private static async checkAutoPenalty(userId: string) {
    // Count reports in last 24h
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { count, error } = await supabase
      .from('player_reports')
      .select('*', { count: 'exact', head: true })
      .eq('reported_id', userId)
      .gt('created_at', yesterday.toISOString());

    if (error || count === null) return;

    // Strict Threshold: 5 Reports in 24h = -10 Score
    if (count >= 5) {
      // Apply Penalty (Idempotency needed in real world, simplistic here)
      await supabase.rpc('decrement_behavior_score', { user_id: userId, amount: 10 });
    }
  }
}
