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