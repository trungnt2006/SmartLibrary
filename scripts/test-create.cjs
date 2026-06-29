const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

(async () => {
  // Test 1: Without user_metadata
  const r1 = await s.auth.admin.createUser({ email: 'test1@test.vn', password: 'Test@123', email_confirm: true });
  console.log('Test1 (no meta):', r1.error ? 'FAIL: ' + r1.error.message : 'OK: ' + r1.data.user.id);
  
  // Test 2: With user_metadata
  const r2 = await s.auth.admin.createUser({ email: 'test2@test.vn', password: 'Test@123', email_confirm: true, user_metadata: { role: 'reader', full_name: 'Test User' } });
  console.log('Test2 (with meta):', r2.error ? 'FAIL: ' + r2.error.message : 'OK: ' + r2.data.user.id);
  
  // Test 3: With minimal meta
  const r3 = await s.auth.admin.createUser({ email: 'test3@test.vn', password: 'Test@123', email_confirm: true, user_metadata: { role: 'reader' } });
  console.log('Test3 (min meta):', r3.error ? 'FAIL: ' + r3.error.message : 'OK: ' + r3.data.user.id);
  
  // Test 4: admin@test.vn without meta
  const r4 = await s.auth.admin.createUser({ email: 'admin@test.vn', password: 'Test@123', email_confirm: true });
  console.log('Test4 (admin@test.vn, no meta):', r4.error ? 'FAIL: ' + r4.error.message : 'OK: ' + r4.data.user.id);
  
  // Test 5: admin@test.vn with meta
  const r5 = await s.auth.admin.createUser({ email: 'admin2@test.vn', password: 'Test@123', email_confirm: true, user_metadata: { role: 'admin', full_name: 'Admin Hệ Thống' } });
  console.log('Test5 (admin2@test.vn, with meta):', r5.error ? 'FAIL: ' + r5.error.message : 'OK: ' + r5.data.user.id);
  
  // Clean up test1, test2, test3
  if (!r1.error) { await s.auth.admin.deleteUser(r1.data.user.id); console.log('cleaned test1'); }
  if (!r2.error) { await s.auth.admin.deleteUser(r2.data.user.id); console.log('cleaned test2'); }
  if (!r3.error) { await s.auth.admin.deleteUser(r3.data.user.id); console.log('cleaned test3'); }
  if (!r5.error) { await s.auth.admin.deleteUser(r5.data.user.id); console.log('cleaned admin2'); }
})();
