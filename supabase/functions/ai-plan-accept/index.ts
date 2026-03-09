// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isValidPlanItem = (obj: any) => {
  return (
    obj &&
    typeof obj.plannedFor === 'string' &&
    typeof obj.durationMinutes === 'number' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.checklist)
  );
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization') || '';
  const projectUrl = new URL(req.url).origin;
  const supabase = createClient(projectUrl, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    const reason = userErr?.message || 'No authenticated user in request';
    return new Response(`Unauthorized: ${reason}`, {
      status: 401,
      headers: corsHeaders,
    });
  }
  const user = userData.user;

  const body = await req.json();
  const { taskId, plan, regenerate } = body;
  if (!taskId || !Array.isArray(plan)) {
    return new Response('Invalid payload', { status: 400, headers: corsHeaders });
  }

  // Validate.
  if (!plan.every(isValidPlanItem)) {
    return new Response('Invalid plan format', { status: 400, headers: corsHeaders });
  }

  // Verify ownership.
  const { data: task, error: taskErr } = await supabase
    .from('tasks')
    .select('id,user_id')
    .eq('id', taskId)
    .single();
  if (taskErr || !task || task.user_id !== user.id) {
    return new Response('Not found', { status: 404, headers: corsHeaders });
  }

  if (regenerate) {
    await supabase
      .from('task_plan_items')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', user.id);
  }

  const inserts = plan.map((item: any, idx: number) => ({
    task_id: taskId,
    user_id: user.id,
    title: item.title,
    planned_for: item.plannedFor,
    duration_minutes: item.durationMinutes,
    order_index: idx,
    status: 'todo',
    created_by: 'ai',
    checklist: item.checklist,
  }));

  const { data: insertedItems, error: insErr } = await supabase
    .from('task_plan_items')
    .insert(inserts)
    .select();

  if (insErr) {
    return new Response('Failed to insert plan items', {
      status: 500,
      headers: corsHeaders,
    });
  }

  // Create reminders one hour before each session.
  const reminders = (insertedItems || []).map((pi: any) => ({
    task_id: taskId,
    plan_item_id: pi.id,
    remind_at: new Date(
      new Date(pi.planned_for).getTime() - 60 * 60 * 1000,
    ).toISOString(),
  }));
  if (reminders.length) {
    await supabase.from('reminders').insert(reminders);
  }

  return new Response(JSON.stringify({ insertedItems }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
});
