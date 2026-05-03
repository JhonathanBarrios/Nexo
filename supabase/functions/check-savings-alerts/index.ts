import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: users, error: usersError } = await supabase
      .from('user_notifications')
      .select('user_id, savings_alerts_enabled, savings_reminder_days_before')
      .eq('savings_alerts_enabled', true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with savings alerts enabled' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let alertsSent = 0;

    for (const user of users) {
      const reminderDays = user.savings_reminder_days_before || 1;

      const { data: accounts, error: accountsError } = await supabase
        .from('savings_accounts')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('is_active', true)
        .eq('is_completed', false);

      if (accountsError) throw accountsError;

      if (!accounts || accounts.length === 0) continue;

      for (const account of accounts) {
        const depositDay = account.deposit_day;
        const daysUntilDeposit = depositDay - currentDay;

        if (daysUntilDeposit > reminderDays || daysUntilDeposit < 0) continue;

        const frequencyLabel = account.frequency === 'weekly' ? 'semanal' :
          account.frequency === 'biweekly' ? 'quincenal' : 'mensual';

        const message = daysUntilDeposit === 0
          ? `Hoy es el día de tu depósito para "${account.name}" (${frequencyLabel})`
          : daysUntilDeposit === 1
          ? `Mañana es el día de tu depósito para "${account.name}" (${frequencyLabel})`
          : `En ${daysUntilDeposit} días es el día de tu depósito para "${account.name}" (${frequencyLabel})`;

        await supabase
          .channel(`user-${user.user_id}`)
          .send({
            type: 'broadcast',
            event: 'savings_reminder',
            payload: {
              account_id: account.id,
              account_name: account.name,
              deposit_day: depositDay,
              days_until_deposit: daysUntilDeposit,
              frequency: account.frequency,
              message,
            },
          });

        alertsSent++;
      }
    }

    return new Response(JSON.stringify({
      message: 'Savings alerts checked successfully',
      alertsSent,
      usersChecked: users.length,
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error checking savings alerts:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
