// Creates 8 test auth users via Supabase Admin API
// Usage: node --env-file=.env.local scripts/create-users-v2.cjs
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const users = [
  { email: 'admin@ltest.app', password: 'Test@123', email_confirm: true, user_metadata: { role: 'admin', full_name: 'Admin Hệ Thống' } },
  { email: 'lib1@ltest.app', password: 'Test@123', email_confirm: true, user_metadata: { role: 'librarian', full_name: 'Nguyễn Văn A' } },
  { email: 'lib2@ltest.app', password: 'Test@123', email_confirm: true, user_metadata: { role: 'librarian', full_name: 'Trần Thị B' } },
  { email: 'rd1@ltest.app', password: 'Test@123', email_confirm: true, user_metadata: { role: 'reader', full_name: 'Lê Văn A' } },
  { email: 'rd2@ltest.app', password: 'Test@123', email_confirm: true, user_metadata: { role: 'reader', full_name: 'Phạm Thị B' } },
  { email: 'rd3@ltest.app', password: 'Test@123', email_confirm: true, user_metadata: { role: 'reader', full_name: 'Hoàng Văn C' } },
  { email: 'rd4@ltest.app', password: 'Test@123', email_confirm: true, user_metadata: { role: 'reader', full_name: 'Đỗ Thị D' } },
  { email: 'rd5@ltest.app', password: 'Test@123', email_confirm: true, user_metadata: { role: 'reader', full_name: 'Ngô Văn E' } },
];

(async () => {
  let ok = 0, fail = 0;
  for (const u of users) {
    const { data, error } = await s.auth.admin.createUser(u);
    if (error) {
      console.log('FAIL:', u.email, '-', error.message || JSON.stringify(error));
      fail++;
    } else {
      console.log('OK:', u.email, data.user.id);
      ok++;
    }
  }
  console.log(`\nDone: ${ok} succeeded, ${fail} failed`);
  if (fail > 0) process.exit(1);
})();
