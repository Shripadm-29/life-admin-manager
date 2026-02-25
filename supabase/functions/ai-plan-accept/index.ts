// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// no change to OPENAI usage here, but we can log if missing later if needed
const supabase = createClient(supabaseUrl, supabaseKey);

function isValidPlanItem(obj: any) {
  return (
    obj &&
    typeof obj.planned_for === 'string' &&
    typeof obj.duration_minutes === 'number' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.checklist)
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
    });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.split(' ')[1] || '';
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const user = userData.user;

  const body = await req.json();
  const { task_id, plan, regenerate } = body;
  if (!task_id || !Array.isArray(plan)) {
    return new Response('Invalid payload', { status: 400 });
  }

  // validate
  if (!plan.every(isValidPlanItem)) {
    return new Response('Invalid plan format', { status: 400 });
  }

  // verify ownership
  const { data: task, error: taskErr } = await supabase
    .from('tasks')
    .select('id,user_id')
    .eq('id', task_id)
    .single();
  if (taskErr || !task || task.user_id !== user.id) {
    return new Response('Not found', { status: 404 });
  }

  if (regenerate) {
    await supabase
      .from('task_plan_items')
      .delete()
      .eq('task_id', task_id)
      .eq('user_id', user.id);
  }

  const inserts = plan.map((item: any, idx: number) => ({
    task_id,
    user_id: user.id,
    title: item.title,
    planned_for: item.planned_for,
    duration_minutes: item.duration_minutes,
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
    return new Response('Failed to insert plan items', { status: 500 });
  }

  // create reminders one hour before each session
  const reminders = (insertedItems || []).map((pi: any) => ({
    task_id,
    plan_item_id: pi.id,
    remind_at: new Date(new Date(pi.planned_for).getTime() - 60 * 60 * 1000).toISOString(),
  }));
  if (reminders.length) {
    await supabase.from('reminders').insert(reminders);
  }

  return new Response(JSON.stringify({ insertedItems }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
