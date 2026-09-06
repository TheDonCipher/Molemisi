import { readFileSync } from 'node:fs';

// Read env from apps/api/.env
const env = readFileSync('apps/api/.env', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const URL = get('SUPABASE_URL');
const KEY = get('SUPABASE_SERVICE_ROLE_KEY');

const EMAIL = 'admin@molemisi.co';
const PASSWORD = 'Admin123!';

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

// 1. Create (or get) the admin user via Supabase admin API
let res = await fetch(`${URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: 'Admin' },
  }),
});
let data = await res.json();

let userId = data?.id;
if (!userId && data?.msg?.includes('already')) {
  // Look up existing user
  const q = await fetch(`${URL}/auth/v1/admin/users?email=${encodeURIComponent(EMAIL)}`, {
    headers,
  });
  const qd = await q.json();
  userId = qd?.users?.[0]?.id;
}
if (!userId) {
  console.log('CREATE FAILED:', JSON.stringify(data).slice(0, 300));
  process.exit(1);
}
console.log('1. user id:', userId);

// 2. Upsert profile with is_admin = true
res = await fetch(`${URL}/rest/v1/profiles`, {
  method: 'POST',
  headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify({
    id: userId,
    display_name: 'Admin',
    farm_name: 'Admin Farm',
    is_admin: true,
    is_banned: false,
  }),
});
if (!res.ok) {
  const t = await res.text();
  // If upsert failed, try update instead
  const upd = await fetch(`${URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ is_admin: true }),
  });
  console.log('upsert →', res.status, t.slice(0, 120), '| update →', upd.status);
} else {
  console.log('2. profile upserted with is_admin=true');
}

// 3. Verify
const check = await fetch(
  `${URL}/rest/v1/profiles?id=eq.${userId}&select=id,display_name,is_admin,is_banned`,
  { headers },
);
console.log('3. verify:', await check.json());

// 4. Test login
const login = await fetch('http://localhost:3001/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const loginData = await login.json();
const token = loginData?.data?.token;
console.log(
  '4. login:',
  login.status,
  token ? 'TOKEN OK' : JSON.stringify(loginData).slice(0, 200),
);

// 5. Test admin endpoint with the token
if (token) {
  const adm = await fetch('http://localhost:3001/api/v1/admin/economy', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(
    '5. admin/economy:',
    adm.status,
    adm.ok ? 'ADMIN ACCESS GRANTED' : await adm.text().then((t) => t.slice(0, 200)),
  );

  const noAuth = await fetch('http://localhost:3001/api/v1/admin/economy');
  console.log('6. admin/economy without token:', noAuth.status, '(expect 401)');
}
