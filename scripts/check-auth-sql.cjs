const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Try to query auth.users table directly via API
  // The service_role key should be able to access auth schema
  const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('.supabase.co', '.supabase.co/auth/v1/');
  
  // Try different endpoints
  const endpoints = [
    'admin/users?filter%5Bemail%5D=admin%40test.vn',
    'admin/users',
    // Try to access raw user info from GoTrue
  ];
  
  for (const ep of endpoints) {
    try {
      const resp = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL.replace('.supabase.co', '.supabase.co/auth/v1/' + ep), {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });
      const text = await resp.text();
      console.log(ep, '->', resp.status, text.length > 300 ? text.substring(0, 300) + '...' : text);
    } catch(e) {
      console.log(ep, '-> ERROR:', e.message);
    }
  }
  
  // Try to access auth.users via PostgREST by specifying schema
  try {
    const resp = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Accept': 'application/json',
        'Accept-Profile': 'auth'
      }
    });
    const text = await resp.text();
    console.log('rest/v1 root:', resp.status, text.length > 200 ? text.substring(0, 200) + '...' : text);
  } catch(e) {
    console.log('rest/v1 root error:', e.message);
  }
})();
