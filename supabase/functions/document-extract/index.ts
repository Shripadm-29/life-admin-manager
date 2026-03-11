/* eslint-disable */
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fallbackExtraction = (fileName: string, rawText: string) => ({
  extracted_text: rawText,
  suggested_title: fileName.replace(/\.[^.]+$/, ''),
  suggested_due_date: null,
  confidence: rawText ? 0.45 : 0.2,
  metadata: {
    summary: rawText ? rawText.slice(0, 240) : `Uploaded document: ${fileName}`,
    instructions: [],
    deadlines: [],
    deliverables: [],
    constraints: [],
  },
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  const { fileName, rawText, imageUrl } = await req.json();
  if (!fileName) {
    return new Response('fileName is required', {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!OPENAI_KEY) {
    return new Response(JSON.stringify(fallbackExtraction(fileName, rawText || '')), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  const textSnippet = (rawText || '').slice(0, 10000);
  const messages: any[] = [
    {
      role: 'system',
      content: [
        'Extract task-relevant details from the provided document.',
        'Return JSON only with keys extracted_text, suggested_title, suggested_due_date, confidence, and metadata.',
        'metadata must include summary, instructions, deadlines, deliverables, and constraints arrays.',
        'If the document does not clearly imply a due date, return null for suggested_due_date.',
      ].join(' '),
    },
  ];

  if (textSnippet) {
    messages.push({
      role: 'user',
      content: `File name: ${fileName}\n\nExtracted document text:\n${textSnippet}`,
    });
  } else if (imageUrl) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: `Analyze this uploaded document image: ${fileName}` },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    });
  } else {
    return new Response(JSON.stringify(fallbackExtraction(fileName, '')), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content || '{}';

  try {
    const parsed = JSON.parse(content);
    return new Response(JSON.stringify({
      extracted_text: parsed.extracted_text || rawText || '',
      suggested_title: parsed.suggested_title || fileName.replace(/\.[^.]+$/, ''),
      suggested_due_date: parsed.suggested_due_date || null,
      confidence: parsed.confidence ?? 0.75,
      metadata: parsed.metadata || {
        summary: '',
        instructions: [],
        deadlines: [],
        deliverables: [],
        constraints: [],
      },
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    return new Response(JSON.stringify(fallbackExtraction(fileName, rawText || '')), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});