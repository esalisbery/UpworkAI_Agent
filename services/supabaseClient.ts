import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise fall back to the provided credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://metdvnyunifmqzpvxnet.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_--0z-tZ_jlGivcqRX3a-aw_a4TvlwSi';

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing. Persistence will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to check duplicate job descriptions
export const checkDuplicateJob = async (jobDescription: string): Promise<boolean> => {
    // Basic check: match the first 100 characters to verify uniqueness
    const snippet = jobDescription.substring(0, 100);
    
    // Sanitize snippet for SQL LIKE query to prevent syntax errors with special chars like ' or %
    // Note: Supabase JS handles parameter injection, but we need to be careful with the string literal in ilike
    const { data, error } = await supabase
        .from('proposals')
        .select('id')
        .ilike('job_description', `${snippet}%`)
        .limit(1);
    
    if (error) {
        console.error("Error checking duplicates", error);
        return false;
    }
    return !!data && data.length > 0;
};