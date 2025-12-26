import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Prioritize GOOGLE_API_KEY, fallback to others. 
  // We check process.env explicitly as a fallback for Vercel system variables.
  const apiKey = 
    env.GOOGLE_API_KEY || 
    env.VITE_GOOGLE_API_KEY || 
    env.API_KEY || 
    env.VITE_API_KEY || 
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY;

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
      'process.env.SUPABASE_KEY': JSON.stringify(env.SUPABASE_KEY || env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY),
    },
  };
})