const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

(async () => {
  // Direct fetch to GoTrue API
  const gotrueUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/admin/users';
  
  const body = JSON.stringify({
    email: 'admin@test.vn',
    password: 'Test@123',
    email_confirm: true
  });
  
  console.log('POST', gotrueUrl);
  console.log('Body:', body);
  
  try {
    const resp = await fetch(gotrueUrl, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const text = await resp.text();
    console.log('Status:', resp.status);
    console.log('Response:', text.length > 1000 ? text.substring(0, 1000) + '...' : text);
    console.log('Headers:', JSON.stringify([...resp.headers.entries()].filter(([k]) => k.includes('x-request-id') || k.includes('retry') || k.includes('x-timer'))));
    
    // Try to parse as JSON if possible
    try {
      const json = JSON.parse(text);
      console.log('Parsed:', JSON.stringify(json, null, 2));
    } catch(e) {}
  } catch(e) {
    console.log('Fetch error:', e);
  }
})();
