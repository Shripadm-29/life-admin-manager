// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
if (!OPENAI_KEY) {
  // If the key isn't set, any request should fail early with a helpful error.
  console.error('OPENAI_API_KEY is missing');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Very small helper to validate plan items.
const isValidPlanItem = (obj: any) => {
  return (
    obj &&
    typeof obj.plannedFor === 'string' &&
    typeof obj.durationMinutes === 'number' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.checklist)
  );
};

// Deterministic slot generator.
const generateSlots = (
  dueDateStr: string,
  now = new Date(),
): { plannedFor: string; durationMinutes: number }[] => {
  const dueDate = new Date(dueDateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  let days = Math.ceil((dueDate.getTime() - now.getTime()) / msPerDay);
  if (days < 0) {
    days = 0;
  }

  let sessionCount = 1;
  if (days <= 2) {
    sessionCount = Math.min(2, days || 1);
  } else if (days <= 6) {
    sessionCount = Math.min(4, days);
  } else if (days <= 14) {
    sessionCount = Math.min(6, days - 1);
  } else {
    sessionCount = Math.min(8, days - 1);
  }

  // Ensure at least 1 session.
  sessionCount = Math.max(1, sessionCount);

  const slots: { plannedFor: string; durationMinutes: number }[] = [];
  // Spread sessions over the available days, avoiding the due date
  // (stop one day before).
  const lastDay = new Date(dueDate.getTime() - msPerDay);
  const totalDays = Math.floor(
    (lastDay.getTime() - now.getTime()) / msPerDay,
  ) + 1;
  for (let i = 0; i < sessionCount; i++) {
    const offset = Math.floor((i * totalDays) / sessionCount);
    const dt = new Date(now.getTime() + offset * msPerDay);
    slots.push({
      plannedFor: dt.toISOString(),
      durationMinutes: 60,
    });
  }
  return slots;
};

const callLLM = async (task: any, slots: any[], random = false) => {
  const systemPrompt =
    `You are an assistant that takes a task and a list of time slots and produces a ` +
    `JSON-only array of session objects. Each object must contain "plannedFor" ` +
    `(ISO datetime), "durationMinutes" (integer), "title" (string), and ` +
    `"checklist" (array of short strings). Respond with nothing but valid JSON. ` +
    `If the input is malformed, return an empty array.`;

  let userPrompt =
    `Task title: ${task.title}\n` +
    `Category: ${task.category}\n` +
    `Notes: ${task.notes || ''}\n` +
    `Due date: ${task.due_at || task.due_date || ''}\n` +
    `Slots: ${JSON.stringify(slots)}\n\n` +
    `Generate the session list as described above.`;
  if (random) {
    userPrompt +=
      '\nPlease vary the wording of titles or checklist items so the plan differs.';
  }

  if (!OPENAI_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: random ? 0.8 : 0.3,
    }),
  });
  const json = await resp.json();
  const text = json?.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.every(isValidPlanItem)) {
      return parsed;
    }
  } catch (e) {
    // Fall through to fallback.
  }

  // Fallback titles.
  return slots.map((slot, idx) => ({
    plannedFor: slot.plannedFor,
    durationMinutes: slot.durationMinutes,
    title: `Work on ${task.title} — Part ${idx + 1}`,
    checklist: [],
  }));
};

serve(async (req) => {
  // Simple CORS support.
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
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
  const { taskId, random } = body;
  if (!taskId) {
    return new Response('taskId required', { status: 400, headers: corsHeaders });
  }

  const { data: task, error: taskErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
  if (taskErr || !task || task.user_id !== user.id) {
    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
  try {
    const dueDate = task.due_at || task.due_date;
    if (!dueDate) {
      return new Response('Task has no due date', {
        status: 400,
        headers: corsHeaders,
      });
    }
    const slots = generateSlots(dueDate, new Date());
    const plan = await callLLM(task, slots, random === true);

    return new Response(JSON.stringify({ previewPlan: plan }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('ai-plan-preview failed', err);
    return new Response('Failed to generate AI plan preview', {
      status: 500,
      headers: corsHeaders,
    });
  }
});
