const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
(async () => {
  const { data, error } = await s.from('profiles').select('id, email, role, full_name, employee_code, auth_user_id');
  if (error) { console.log('error:', error); return; }
  console.log(JSON.stringify(data, null, 2));
})();
