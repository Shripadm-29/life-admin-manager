/* eslint-disable */ // deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const GENERIC_TITLE_PATTERNS = [
  /^work on task/i,
  /^make progress/i,
  /^review task/i,
  /^read document$/i,
  /^start task/i,
  /^work on/i
];
const isValidReminder = (value)=>{
  return value && typeof value.send_at === 'string' && typeof value.message === 'string';
};
const isValidPlanItem = (value)=>{
  return value && typeof value.title === 'string' && value.title.trim().length >= 8 && !GENERIC_TITLE_PATTERNS.some((pattern)=>pattern.test(value.title.trim())) && (value.description === undefined || value.description === null || typeof value.description === 'string') && (value.duration_minutes === undefined || typeof value.duration_minutes === 'number') && (value.scheduled_start === undefined || value.scheduled_start === null || typeof value.scheduled_start === 'string') && (value.scheduled_end === undefined || value.scheduled_end === null || typeof value.scheduled_end === 'string') && (value.deadline === undefined || value.deadline === null || typeof value.deadline === 'string') && Array.isArray(value.reminders) && value.reminders.every(isValidReminder);
};
const truncate = (value, limit)=>(value || '').slice(0, limit);
const parseIsoDate = (value)=>{
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const toIso = (value)=>value.toISOString();
const ensureNotBefore = (candidate, anchor)=>new Date(Math.max(candidate.getTime(), anchor.getTime()));
const getPlanAnchor = (planningContext)=>{
  const createdAt = parseIsoDate(planningContext?.task?.created_at);
  const requestedAt = parseIsoDate(planningContext?.task?.planning_requested_at);
  const now = new Date();
  let anchor = now;
  if (createdAt && requestedAt) {
    anchor = new Date(Math.max(createdAt.getTime(), requestedAt.getTime()));
  } else if (createdAt) {
    anchor = createdAt;
  } else if (requestedAt) {
    anchor = requestedAt;
  }
  return new Date(Math.max(anchor.getTime(), now.getTime() - 5 * 60 * 1000));
};
const enforcePlanTiming = (plan, planningContext)=>{
  const anchor = getPlanAnchor(planningContext);
  let rollingCursor = new Date(anchor.getTime());
  const normalizedItems = (plan?.plan || []).map((item)=>{
    const durationMinutes = Number.isFinite(item?.duration_minutes) ? Math.max(5, item.duration_minutes) : 30;
    const requestedStart = parseIsoDate(item?.scheduled_start);
    let start = requestedStart || new Date(rollingCursor.getTime());
    start = ensureNotBefore(start, rollingCursor);
    start = ensureNotBefore(start, anchor);

    const requestedEnd = parseIsoDate(item?.scheduled_end);
    let end = requestedEnd || new Date(start.getTime() + durationMinutes * 60 * 1000);
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    }

    const requestedDeadline = parseIsoDate(item?.deadline);
    let deadline = requestedDeadline || new Date(end.getTime());
    if (deadline.getTime() < end.getTime()) {
      deadline = new Date(end.getTime());
    }
    deadline = ensureNotBefore(deadline, anchor);

    const reminders = Array.isArray(item?.reminders) ? item.reminders : [];
    const normalizedReminders = reminders
      .filter((reminder)=>isValidReminder(reminder))
      .map((reminder)=>{
        const requestedReminder = parseIsoDate(reminder.send_at);
        const fallbackReminder = new Date(start.getTime() - 15 * 60 * 1000);
        const latestBeforeStart = new Date(Math.max(anchor.getTime(), start.getTime() - 60 * 1000));
        let sendAt = requestedReminder || fallbackReminder;
        sendAt = ensureNotBefore(sendAt, anchor);
        if (sendAt.getTime() > latestBeforeStart.getTime()) {
          sendAt = latestBeforeStart;
        }
        return {
          send_at: toIso(sendAt),
          message: reminder.message
        };
      });

    rollingCursor = new Date(end.getTime());
    return {
      ...item,
      duration_minutes: durationMinutes,
      scheduled_start: toIso(start),
      scheduled_end: toIso(end),
      deadline: toIso(deadline),
      reminders: normalizedReminders
    };
  });

  return {
    plan: normalizedItems
  };
};
const buildPrompt = (planningContext, random)=>{
  const task = planningContext.task || {};
  const documents = (planningContext.documents || []).map((document)=>({
      file_name: document.file_name,
      extracted_title: document.extracted_title,
      extracted_due_date: document.extracted_due_date,
      metadata: document.metadata || {},
      extracted_text: truncate(document.extracted_text, 4000)
    }));
  const calendar = planningContext.calendar || {
    connected: false,
    busy_events: [],
    free_blocks: []
  };
  const systemPrompt = [
    'You are generating an execution-ready task plan for a productivity app.',
    'Return JSON only with shape {"plan":[...]} and no markdown.',
    'Each subtask must be specific, concrete, and directly tied to the task details and any attached document content.',
    'Never return vague subtasks like "Work on task", "Make progress", or "Review task".',
    'Use document instructions, deliverables, deadlines, constraints, and extracted text when available.',
    'Use calendar free blocks to assign realistic scheduled_start and scheduled_end values.',
    'Do not schedule any subtask or reminder before the planning anchor time.',
    'Each subtask object must include title, description, duration_minutes, scheduled_start, scheduled_end, deadline, and reminders.',
    'Each reminders array should contain 0 or more reminder objects with send_at and message.',
    'Reminder messages must mention the actual subtask and align with the scheduled time and urgency.',
    'Prefer one reminder for short tasks, and one or two reminders for longer or high-priority tasks.',
    random ? 'Vary wording and scheduling choices while staying realistic and specific.' : 'Be deterministic and practical.'
  ].join(' ');
  const userPrompt = JSON.stringify({
    task,
    scheduling_anchor: {
      task_created_at: task.created_at || null,
      planning_requested_at: task.planning_requested_at || null,
      instruction: 'All scheduled_start, scheduled_end, deadline, and reminder send_at values must be on or after the later of task_created_at and planning_requested_at.'
    },
    documents,
    calendar,
    requirements: {
      schedule_within_free_blocks: true,
      do_not_create_google_calendar_events: true,
      keep_plan_execution_focused: true
    }
  });
  return {
    systemPrompt,
    userPrompt
  };
};
const fallbackPlan = (planningContext)=>{
  const task = planningContext.task || {};
  const freeBlocks = planningContext.calendar?.free_blocks || [];
  const firstBlock = freeBlocks[0];
  const anchor = getPlanAnchor(planningContext);
  const defaultStart = new Date(anchor.getTime() + 60 * 60 * 1000).toISOString();
  const start = firstBlock?.start || defaultStart;
  const end = firstBlock?.end || new Date(Date.now() + 90 * 60 * 1000).toISOString();
  return enforcePlanTiming({
    plan: [
      {
        title: `Outline the concrete deliverables for ${task.title || 'this task'}`,
        description: 'List the required outputs, missing information, and first completion milestone before starting the rest of the work.',
        duration_minutes: 30,
        scheduled_start: start,
        scheduled_end: end,
        deadline: end,
        reminders: [
          {
            send_at: new Date(new Date(start).getTime() - 15 * 60 * 1000).toISOString(),
            message: `Reminder: use this block to outline the deliverables for ${task.title || 'your task'} before you begin execution.`
          }
        ]
      }
    ]
  }, planningContext);
};
const callPlanner = async (planningContext, random)=>{
  if (!OPENAI_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  const { systemPrompt, userPrompt } = buildPrompt(planningContext, random);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: random ? 0.65 : 0.2,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      response_format: {
        type: 'json_object'
      }
    })
  });
  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed?.plan) && parsed.plan.every(isValidPlanItem)) {
      return enforcePlanTiming({
        plan: parsed.plan
      }, planningContext);
    }
  } catch  {
  // Fall back below.
  }
  return fallbackPlan(planningContext);
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }
  const { planningContext, random } = await req.json();
  if (!planningContext?.task?.title) {
    return new Response('planningContext.task.title is required', {
      status: 400,
      headers: corsHeaders
    });
  }
  try {
    const plan = await callPlanner(planningContext, random === true);
    return new Response(JSON.stringify(plan), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('ai-plan-preview failed', err);
    return new Response('Failed to generate AI task plan', {
      status: 500,
      headers: corsHeaders
    });
  }
});
