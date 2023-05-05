import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const getApiKey = async (owner) => {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: apiKey } = await supabase
    .from('api-keys')
    .select('api_key')
    .eq('user_id', owner)
    .single();

  return apiKey.api_key;
};
