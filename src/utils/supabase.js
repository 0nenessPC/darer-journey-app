import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Save user progress to Supabase
export async function saveProgress(userId, data) {
  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) console.error('Save progress error:', error);
  return !error;
}

// Load user progress from Supabase
export async function loadProgress(userId) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    console.error('Load progress error:', error);
    return null;
  }
  return data;
}
