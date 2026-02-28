# life-admin-manager

Figma Screens:
https://www.figma.com/make/fUs0WP42uVXNU4H2XLZkuO/Life-Admin-Manager-UI-Design?t=Pnmo3AeH35fMncva-1&preview-route=%2Flogin

To run the app locally:

1. run command on terminal: npm install
2. run command on terminal: npm run dev

## Supabase setup for profile pictures

Profile photos are uploaded to Supabase Storage bucket `avatars`, and the public URL is saved to auth user metadata (`avatar_url`).

1. Open your Supabase project SQL Editor.
2. Run the SQL script in `supabase/setup-avatars-storage.sql`.
3. Confirm a bucket named `avatars` exists in Storage.

If this setup is missing, avatar uploads will fail even though login/signup still works.

## Reminders system setup

The reminders feature uses Supabase tables + a secure Edge Function that sends reminder emails through Resend.

1. Run SQL migration:
	- `supabase/migrations/20260227_reminders_notifications.sql`
2. Deploy function:
	- `supabase/functions/reminders-tick/index.ts`
3. Set Edge Function secrets in Supabase:
	- `RESEND_API_KEY`
	- `REMINDER_CRON_SECRET`
	- optional: `REMINDER_EMAIL_FROM` (defaults to `onboarding@resend.dev` sender)

### Trigger cron locally/manual test

Use a secure POST request to the Edge Function:

`curl -X POST "https://<project-ref>.supabase.co/functions/v1/reminders-tick" -H "x-cron-secret: <your-secret>"`

For local Supabase functions, replace URL with your local function URL and use the same header.

### Enable automatic scheduler (every minute)

Recommended (Dashboard):

1. Open Supabase Dashboard -> Edge Functions -> reminders-tick.
2. Click Schedules -> Create schedule.
3. Cron expression: `* * * * *`
4. Method: `POST`
5. Path: `/functions/v1/reminders-tick`
6. Add header:
	 - `x-cron-secret: <your REMINDER_CRON_SECRET>`

SQL fallback (if you prefer SQL Editor):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
	'reminders-tick-every-minute',
	'* * * * *',
	$$
	select net.http_post(
		url := 'https://<project-ref>.supabase.co/functions/v1/reminders-tick',
		headers := jsonb_build_object(
			'Content-Type', 'application/json',
			'x-cron-secret', '<your REMINDER_CRON_SECRET>'
		),
		body := '{}'::jsonb
	);
	$$
);
```

To remove the SQL schedule later:

```sql
select cron.unschedule('reminders-tick-every-minute');
```