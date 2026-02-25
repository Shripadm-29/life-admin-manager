/// <reference types="vite/client" />

// Extend the Vite environment type definitions with our variables
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly OPENAI_API_KEY?: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  // add more env vars as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
