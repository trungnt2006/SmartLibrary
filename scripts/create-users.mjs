import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "admin@ltest.app", password: "Test@123", metadata: { role: "admin", full_name: "Admin Hệ Thống" } },
  { email: "lib1@ltest.app", password: "Test@123", metadata: { role: "librarian", full_name: "Nguyễn Văn A" } },
  { email: "lib2@ltest.app", password: "Test@123", metadata: { role: "librarian", full_name: "Trần Thị B" } },
  { email: "rd1@ltest.app", password: "Test@123", metadata: { role: "reader", full_name: "Lê Văn A" } },
  { email: "rd2@ltest.app", password: "Test@123", metadata: { role: "reader", full_name: "Phạm Thị B" } },
  { email: "rd3@ltest.app", password: "Test@123", metadata: { role: "reader", full_name: "Hoàng Văn C" } },
  { email: "rd4@ltest.app", password: "Test@123", metadata: { role: "reader", full_name: "Đỗ Thị D" } },
  { email: "rd5@ltest.app", password: "Test@123", metadata: { role: "reader", full_name: "Ngô Văn E" } },
];

async function main() {
  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: u.metadata,
    });
    if (error) {
      console.error(`FAIL: ${u.email} —`, JSON.stringify(error));
    } else {
      console.log(`OK:   ${u.email} (id: ${data.user.id})`);
    }
  }
}

main();
