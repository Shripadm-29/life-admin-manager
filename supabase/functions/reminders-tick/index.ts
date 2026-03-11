// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendReminderEmail } from '../_shared/email.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const reminderCronSecret = Deno.env.get('REMINDER_CRON_SECRET');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

const nextRemindAt = (
  remindAtIso: string,
  repeatType: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom',
  repeatIntervalDays: number | null,
  now: Date,
) => {
  let current = new Date(remindAtIso);

  if (repeatType === 'none') {
    return null;
  }

  const advance = () => {
    if (repeatType === 'daily') {
      current = addDays(current, 1);
      return;
    }
    if (repeatType === 'weekly') {
      current = addDays(current, 7);
      return;
    }
    if (repeatType === 'monthly') {
      current = addMonths(current, 1);
      return;
    }
    if (repeatType === 'custom') {
      const interval = repeatIntervalDays && repeatIntervalDays > 0
        ? repeatIntervalDays
        : 1;
      current = addDays(current, interval);
    }
  };

  advance();

  while (current <= now) {
    advance();
  }

  return current.toISOString();
};

const createNotification = async (payload: {
  user_id: string;
  reminder_id?: string | null;
  title: string;
  body: string;
}) => {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: payload.user_id,
      reminder_id: payload.reminder_id || null,
      title: payload.title,
      body: payload.body,
      is_read: false,
    });

  if (error) {
    throw error;
  }
};

const processLegacyReminders = async (now: Date) => {
  const { data: dueReminders, error: dueError } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_enabled', true)
    .lte('remind_at', now.toISOString())
    .order('remind_at', { ascending: true })
    .limit(500);

  if (dueError) {
    throw dueError;
  }

  const results: Array<{ id: string; emailSent: boolean; error?: string }> = [];
  const eligibleReminders = (dueReminders || []).filter((reminder) => {
    if (!reminder.last_triggered_at) {
      return true;
    }

    return new Date(reminder.last_triggered_at) < new Date(reminder.remind_at);
  });

  for (const reminder of eligibleReminders) {
    let emailSent = false;

    try {
      const { data: userData, error: userError } = await supabase.auth.admin
        .getUserById(reminder.user_id);

      if (userError || !userData.user?.email) {
        throw new Error('User email not found.');
      }

      await sendReminderEmail({
        to: userData.user.email,
        title: reminder.title,
        description: reminder.description,
        remindAt: reminder.remind_at,
      });
      emailSent = true;

      const notificationBody = reminder.description
        ? `${reminder.description} (Scheduled for ${new Date(reminder.remind_at).toLocaleString()})`
        : `Reminder scheduled for ${new Date(reminder.remind_at).toLocaleString()}`;

      await createNotification({
        user_id: reminder.user_id,
        reminder_id: reminder.id,
        title: reminder.title,
        body: notificationBody,
      });

      const next = nextRemindAt(
        reminder.remind_at,
        reminder.repeat_type,
        reminder.repeat_interval_days,
        now,
      );

      const updatePayload: Record<string, any> = {
        last_triggered_at: now.toISOString(),
        email_sent: emailSent,
      };

      if (next) {
        updatePayload.remind_at = next;
        updatePayload.is_enabled = true;
      } else {
        updatePayload.is_enabled = false;
      }

      const { error: updateError } = await supabase
        .from('reminders')
        .update(updatePayload)
        .eq('id', reminder.id);

      if (updateError) {
        throw updateError;
      }

      results.push({ id: reminder.id, emailSent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await supabase
        .from('reminders')
        .update({
          email_sent: false,
        })
        .eq('id', reminder.id);

      results.push({ id: reminder.id, emailSent, error: message });
    }
  }

  return results;
};

const processSubtaskReminders = async () => {
  const nowIso = new Date().toISOString();
  const { data: reminders, error } = await supabase
    .from('subtask_reminders')
    .select('*, subtasks!inner(id,title,description,task_id,user_id)')
    .eq('status', 'scheduled')
    .lte('send_at', nowIso)
    .order('send_at', { ascending: true })
    .limit(500);

  if (error) {
    throw error;
  }

  const results: Array<{ id: string; emailSent: boolean; error?: string }> = [];

  for (const reminder of reminders || []) {
    let emailSent = false;

    try {
      const userId = reminder.user_id || reminder.subtasks?.user_id;
      if (!userId) {
        throw new Error('User not found for subtask reminder.');
      }

      const { data: userData, error: userError } = await supabase.auth.admin
        .getUserById(userId);

      if (userError || !userData.user?.email) {
        throw new Error('User email not found.');
      }

      await sendReminderEmail({
        to: userData.user.email,
        title: reminder.subtasks?.title || 'Scheduled subtask reminder',
        description: reminder.message,
        remindAt: reminder.send_at,
      });
      emailSent = true;

      await createNotification({
        user_id: userId,
        title: reminder.subtasks?.title || 'Scheduled subtask reminder',
        body: reminder.message,
      });

      const { error: updateError } = await supabase
        .from('subtask_reminders')
        .update({ status: 'sent' })
        .eq('id', reminder.id);

      if (updateError) {
        throw updateError;
      }

      results.push({ id: reminder.id, emailSent: true });
    } catch (error) {
      results.push({
        id: reminder.id,
        emailSent,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...jsonHeaders,
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,x-cron-secret',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const secret = req.headers.get('x-cron-secret');
  if (!reminderCronSecret || secret !== reminderCronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const now = new Date();

  try {
    const [legacyResults, subtaskResults] = await Promise.all([
      processLegacyReminders(now),
      processSubtaskReminders(),
    ]);

    const results = [...legacyResults, ...subtaskResults];

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
