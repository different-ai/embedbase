import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const getEmbedbaseApp = async (publicApiKey: string) => {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data } = await supabase
    .from('apps')
    .select('owner, name, datasets, system_message')
    .eq('publicApiKey', publicApiKey)
    .single();

  console.log(data);
  return data;
};
