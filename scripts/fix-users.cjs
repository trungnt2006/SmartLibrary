// Delete broken auth users via Auth Admin API using their email
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const emails = [
  'admin@test.vn', 'librarian1@test.vn', 'librarian2@test.vn',
  'reader1@test.vn', 'reader2@test.vn', 'reader3@test.vn', 
  'reader4@test.vn', 'reader5@test.vn'
];

(async () => {
  // First, get all users from Admin API
  const { data: listData, error: listError } = await s.auth.admin.listUsers();
  if (listError) { console.log('list error:', listError.message); return; }
  
  const existingByEmail = {};
  listData.users.forEach(u => { existingByEmail[u.email] = u.id; });
  
  console.log('Existing @test.vn users from API:');
  emails.forEach(e => {
    if (existingByEmail[e]) console.log('  EXISTS:', e, existingByEmail[e]);
    else console.log('  MISSING:', e, '(in profiles but not in auth.users)');
  });
  
  // Delete the ones that exist
  for (const email of emails) {
    if (existingByEmail[email]) {
      const { error } = await s.auth.admin.deleteUser(existingByEmail[email]);
      console.log('DELETE', email, error ? 'FAIL: ' + error.message : 'OK');
    }
  }
  
  // Now try to create fresh users
  console.log('\nCreating users...');
  const userDefs = [
    ['admin@test.vn', { role: 'admin', full_name: 'Admin Hệ Thống' }],
    ['librarian1@test.vn', { role: 'librarian', full_name: 'Nguyễn Văn A' }],
    ['librarian2@test.vn', { role: 'librarian', full_name: 'Trần Thị B' }],
    ['reader1@test.vn', { role: 'reader', full_name: 'Lê Văn A' }],
    ['reader2@test.vn', { role: 'reader', full_name: 'Phạm Thị B' }],
    ['reader3@test.vn', { role: 'reader', full_name: 'Hoàng Văn C' }],
    ['reader4@test.vn', { role: 'reader', full_name: 'Đỗ Thị D' }],
    ['reader5@test.vn', { role: 'reader', full_name: 'Ngô Văn E' }],
  ];
  for (const [email, meta] of userDefs) {
    const { data, error } = await s.auth.admin.createUser({ 
      email, password: 'Test@123', email_confirm: true, user_metadata: meta 
    });
    if (error) console.log('FAIL:', email, '-', error.message || JSON.stringify(error));
    else console.log('OK:', email, data.user.id);
  }
})();
