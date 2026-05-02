import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Get all users with budget alerts enabled
    const { data: users, error: usersError } = await supabase
      .from('user_notifications')
      .select('user_id, budget_alerts_enabled, alert_at_50, alert_at_80, alert_at_100')
      .eq('budget_alerts_enabled', true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with budget alerts enabled' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let alertsSent = 0;

    for (const user of users) {
      // Get budgets for this user for current period
      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('period_month', currentMonth)
        .eq('period_year', currentYear);

      if (budgetsError) throw budgetsError;

      if (!budgets || budgets.length === 0) continue;

      // Check each budget
      for (const budget of budgets) {
        // Get total spent for this category this month
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.user_id)
          .eq('category_id', budget.category_id)
          .eq('type', 'expense')
          .gte('date', new Date(currentYear, currentMonth - 1, 1).toISOString())
          .lt('date', new Date(currentYear, currentMonth, 1).toISOString());

        if (transactionsError) throw transactionsError;

        const totalSpent = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const budgetAmount = Number(budget.amount);
        const percentage = (totalSpent / budgetAmount) * 100;

        // Check thresholds and send alerts
        const alerts = [];

        if (user.alert_at_50 && percentage >= 50 && percentage < 80) {
          alerts.push({ threshold: 50, percentage, budgetAmount, totalSpent });
        }

        if (user.alert_at_80 && percentage >= 80 && percentage < 100) {
          alerts.push({ threshold: 80, percentage, budgetAmount, totalSpent });
        }

        if (user.alert_at_100 && percentage >= 100) {
          alerts.push({ threshold: 100, percentage, budgetAmount, totalSpent });
        }

        // Send alerts via Realtime
        for (const alert of alerts) {
          await supabase
            .channel(`user-${user.user_id}`)
            .send({
              type: 'broadcast',
              event: 'budget_alert',
              payload: {
                threshold: alert.threshold,
                percentage: alert.percentage,
                spent: totalSpent,
                budget: budgetAmount,
                category_id: budget.category_id,
              },
            });

          alertsSent++;
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Budget alerts checked successfully',
      alertsSent,
      usersChecked: users.length,
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error checking budget alerts:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
