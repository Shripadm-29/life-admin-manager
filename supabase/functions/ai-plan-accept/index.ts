// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// No change to OPENAI usage here, but we can log if missing later if needed.
const supabase = createClient(supabaseUrl, supabaseKey);

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
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
    });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.split(' ')[1] || '';
  const { data: userData, error: userErr } = await supabase.auth.getUser(
    token,
  );
  if (userErr || !userData?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const user = userData.user;

  const body = await req.json();
  const { taskId, plan, regenerate } = body;
  if (!taskId || !Array.isArray(plan)) {
    return new Response('Invalid payload', { status: 400 });
  }

  // Validate.
  if (!plan.every(isValidPlanItem)) {
    return new Response('Invalid plan format', { status: 400 });
  }

  // Verify ownership.
  const { data: task, error: taskErr } = await supabase
    .from('tasks')
    .select('id,userId')
    .eq('id', taskId)
    .single();
  if (taskErr || !task || task.userId !== user.id) {
    return new Response('Not found', { status: 404 });
  }

  if (regenerate) {
    await supabase
      .from('taskPlanItems')
      .delete()
      .eq('taskId', taskId)
      .eq('userId', user.id);
  }

  const inserts = plan.map((item: any, idx: number) => ({
    taskId,
    userId: user.id,
    title: item.title,
    plannedFor: item.plannedFor,
    durationMinutes: item.durationMinutes,
    orderIndex: idx,
    status: 'todo',
    createdBy: 'ai',
    checklist: item.checklist,
  }));

  const { data: insertedItems, error: insErr } = await supabase
    .from('taskPlanItems')
    .insert(inserts)
    .select();

  if (insErr) {
    return new Response('Failed to insert plan items', { status: 500 });
  }

  // Create reminders one hour before each session.
  const reminders = (insertedItems || []).map((pi: any) => ({
    taskId,
    planItemId: pi.id,
    remindAt: new Date(
      new Date(pi.plannedFor).getTime() - 60 * 60 * 1000,
    ).toISOString(),
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
