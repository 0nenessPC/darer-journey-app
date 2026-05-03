import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Save user progress to Supabase
export async function saveProgress(userId, data) {
  const { error } = await supabase.from('user_progress').upsert(
    {
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
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
export const NDA_VERSION = '1.0';

// Save a signed NDA agreement to Supabase (immutable record)
export async function saveNdaAgreement(
  userId,
  participantName,
  darerId,
  version = NDA_VERSION,
  agreementText = '',
) {
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

// Save user feedback to Supabase
export async function saveFeedback(userId, data) {
  const { error } = await supabase.from('user_feedback').insert({ user_id: userId, ...data });
  if (error) {
    console.error('Save feedback error:', error);
    return false;
  }
  return true;
}

// Save a single battle record to the normalized battles table
export async function saveBattleRecord(userId, battle) {
  const { error } = await supabase.from('battles').insert({
    user_id: userId,
    boss_id: battle.bossId || null,
    boss_name: battle.bossName || null,
    boss_desc: battle.bossDesc || null,
    outcome: battle.outcome,
    date: battle.date || new Date().toISOString(),
    suds_before: battle.suds?.before ?? null,
    suds_after: battle.suds?.after ?? null,
    prep_value: battle.prepAnswers?.value || null,
    prep_allow_summary: battle.prepAnswers?.allow || null,
    decide_selected_vals: battle.decideSelectedVals || null,
    decide_custom: battle.decideCustom || null,
    allow_fearful: battle.allowFearful || null,
    allow_likelihood: battle.allowLikelihood ?? null,
    allow_severity: battle.allowSeverity ?? null,
    allow_can_handle: battle.allowCanHandle || null,
    allow_fear_showing: battle.allowFearShowing || null,
    allow_physical_sensations: battle.allowPhysicalSensations || null,
    allow_custom_sensation: battle.allowCustomSensation || null,
    exposure_when: battle.exposureWhen || null,
    exposure_where: battle.exposureWhere || null,
    exposure_armory: battle.exposureArmory || null,
    exposure_scheduled_time: battle.exposureScheduledTime || null,
    loot_text: battle.lootText || null,
    loot_image_url: battle.lootImage || null,
    feared_happened: battle.fearedHappened || null,
    feared_severity: battle.fearedSeverity || null,
    made_it_through: battle.madeItThrough || null,
    engage_free_text: battle.engageFreeText || null,
    repeat_choice: battle.repeatChoice || null,
    xp_earned: battle.xpEarned || 0,
    coins_earned: battle.coinsEarned || 0,
    diamonds_earned: battle.diamondsEarned || 0,
    verified: battle.verified || false,
    verification_method: battle.verificationMethod || null,
    dara_letter: battle.daraLetter || null,
    is_tutorial: battle.isTutorial || false,
    battle_chat_message_count: (battle.battleMessages || []).length,
  });
  if (error) console.error('Save battle record error:', error);
  return !error;
}

// Save armory practice session to the normalized armory_practice table
export async function saveArmoryPractice(userId, practice) {
  const { error } = await supabase.from('armory_practice').insert({
    user_id: userId,
    tool_id: practice.toolId,
    tool_name: practice.toolName || null,
    duration_seconds: practice.durationSeconds || 0,
    completed: practice.completed || false,
    date: practice.date || new Date().toISOString(),
  });
  if (error) console.error('Save armory practice error:', error);
  return !error;
}

// Save values exploration data to the normalized values_data table
export async function saveValuesData(userId, values) {
  const { error } = await supabase.from('values_data').insert({
    user_id: userId,
    guide_answers: values.guideAnswers || null,
    selected_values: values.selectedValues || null,
    custom_value: values.customValue || null,
    ai_generated_values: values.aiGeneratedValues || null,
    completed_at: values.completedAt || new Date().toISOString(),
  });
  if (error) console.error('Save values data error:', error);
  return !error;
}
