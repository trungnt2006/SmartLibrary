const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await s.auth.signInWithPassword({ email: 'admin@test.vn', password: 'Test@123' });
  console.log('signIn admin@test.vn:', error ? 'FAIL: ' + error.message : 'OK: ' + data.user.id);
  
  const { data: d2, error: e2 } = await s.auth.signInWithPassword({ email: 'debug@test.vn', password: 'Test@123' });
  console.log('signIn debug@test.vn:', e2 ? 'FAIL: ' + e2.message : 'OK: ' + d2.user.id);
  
  const { data: d3, error: e3 } = await s.auth.signInWithPassword({ email: 'reader1@test.vn', password: 'Test@123' });
  console.log('signIn reader1@test.vn:', e3 ? 'FAIL: ' + e3.message : 'OK: ' + d3.user.id);
})();
