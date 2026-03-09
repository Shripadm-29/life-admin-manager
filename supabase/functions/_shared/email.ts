// @ts-nocheck
import { Resend } from 'npm:resend@3.5.0';

const resendApiKey = Deno.env.get('RESEND_API_KEY');

export interface SendReminderEmailInput {
  to: string;
  title: string;
  description?: string | null;
  remindAt: string;
}

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
  const text = [
    'You have a reminder scheduled.',
    '',
    `Title: ${title}`,
    `Description: ${description || 'N/A'}`,
    `Time: ${remindAt}`,
    '',
    'Sent from Life Admin Manager',
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
