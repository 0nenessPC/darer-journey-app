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

// NDA Agreement version constant — bump this to re-prompt all users
export const NDA_VERSION = "1.0";

// Save a signed NDA agreement to Supabase (immutable record)
export async function saveNdaAgreement(userId, participantName, darerId, version = NDA_VERSION, agreementText = "") {
  const { data, error } = await supabase
    .from('nda_agreements')
    .insert({
      user_id: userId,
      agreement_version: version,
      agreement_text: agreementText,
      ip_address: null, // Client-side IP capture is unreliable; server would be needed
      signed_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      participant_name: participantName,
      darer_id: darerId,
    })
    .select()
    .single();
  if (error) {
    console.error('Save NDA agreement error:', error);
    return null;
  }
  return data;
}

// Check if a user has already agreed to the current NDA version
export async function checkNdaAgreed(userId, version = NDA_VERSION) {
  const { data, error } = await supabase
    .from('nda_agreements')
    .select('id, signed_at, participant_name')
    .eq('user_id', userId)
    .eq('agreement_version', version)
    .order('signed_at', { ascending: false })
    .limit(1);
  if (error) {
    console.error('Check NDA agreement error:', error);
    return false;
  }
  return data && data.length > 0;
}
