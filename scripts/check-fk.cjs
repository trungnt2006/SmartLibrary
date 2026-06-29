const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Check if we can query pg_catalog through the API
  try {
    const resp = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Accept': 'application/json'
      }
    });
    console.log('rest root status:', resp.status);
  } catch(e) {
    console.log('fetch error:', e.message);
  }
  
  // Try to query auth.users directly via REST
  try {
    const resp = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/exec', {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query: "SELECT email FROM auth.users WHERE email LIKE '%@test.vn'" })
    });
    const text = await resp.text();
    console.log('/rest/v1/exec:', resp.status, text.substring(0, 200));
  } catch(e) {
    console.log('exec error:', e.message);
  }
  
  // Try the supabase REST API for rpc
  try {
    const resp = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/pgexec', {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query_text: "SELECT current_database()" })
    });
    const text = await resp.text();
    console.log('/rest/v1/rpc/pgexec:', resp.status, text.substring(0, 200));
  } catch(e) {
    console.log('pgexec error:', e.message);
  }
})();
