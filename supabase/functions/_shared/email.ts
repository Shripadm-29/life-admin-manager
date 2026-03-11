// @ts-nocheck
import { Resend } from 'npm:resend@3.5.0';

const resendApiKey = Deno.env.get('RESEND_API_KEY');

export interface SendReminderEmailInput {
  to: string;
  title: string;
  description?: string | null;
  remindAt: string;
}

const formatReminderTime = (remindAt: string) => {
  const parsed = new Date(remindAt);
  if (Number.isNaN(parsed.getTime())) {
    return remindAt;
  }

  const date = parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const time = parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${date} at ${time}`;
};

export const sendReminderEmail = async ({
  to,
  title,
  description,
  remindAt,
}: SendReminderEmailInput) => {
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const resend = new Resend(resendApiKey);

  const subject = `Reminder: ${title}`;
  const formattedTime = formatReminderTime(remindAt);
  const text = [
    'Hi,',
    '',
    'This is a reminder for an upcoming task.',
    '',
    `Task: ${title}`,
    `Description: ${description || 'N/A'}`,
    `Scheduled Time: ${formattedTime}`,
    '',
    "Make sure to complete it on time. You're making progress toward finishing your main task.",
    '',
    'Good luck!',
    '',
    '- Life Admin Manager',
    '',
  ].join('\n');

  const from = Deno.env.get('REMINDER_EMAIL_FROM') || 'Life Admin Manager <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    text,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send reminder email.');
  }
};
