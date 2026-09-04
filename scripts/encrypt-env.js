const crypto = require('crypto');
const APP_KEY = 'base64:TJKd6dXtWpkJ1ItqhB9oNt+uKR4e9BCSMYnWtwBuN1o=';
const key = Buffer.from(APP_KEY.replace('base64:', ''), 'base64');

function laravelEncrypt(value) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(iv.toString('base64'));
  hmac.update(encrypted);
  const mac = hmac.digest('base64');
  const payload = JSON.stringify({ iv: iv.toString('base64'), value: encrypted, mac: mac });
  return Buffer.from(payload).toString('base64');
}

const envVars = [
  { key: 'POSTGRES_HOST', value: '10.0.3.2' },
  { key: 'POSTGREST_BASE_URL', value: 'http://postgrest:3000' },
  { key: 'JWT_SECRET', value: 'roIQK6URnIZDQx10Vs4qYCxnlip6yMg82VKIeKrDKxfDy6q4v+6tqkk2TAORf8uD/cqrhePRvJR1FHcI/17m3g' },
  { key: 'ENCRYPTION_KEY', value: 'roIQK6URnIZDQx10Vs4qYCxnlip6yMg82VKIeKrDKxfDy6q4v+6tqkk2TAORf8uD/cqrhePRvJR1FHcI/17m3g' },
  { key: 'CORS_ORIGINS', value: 'https://old.chamosbarber.com,https://chamosbarber.com,https://insforge.chamosbarber.com' },
  { key: 'AWS_S3_BUCKET', value: '' },
];

// Generate INSERT statements (two rows per key, matching existing pattern)
for (const ev of envVars) {
  const encrypted = laravelEncrypt(ev.value);
  const uuid = require('crypto').randomUUID();
  const now = new Date().toISOString().replace('T', ' ').split('.')[0];
  console.log(`INSERT INTO environment_variables (key, value, is_preview, created_at, updated_at, is_shown_once, is_multiline, version, is_literal, uuid, "order", is_required, is_shared, resourceable_type, resourceable_id, is_runtime, is_buildtime, comment)
  VALUES ('${ev.key}', '${encrypted}', false, '${now}', '${now}', false, false, '4.0.0-beta.474', false, '${uuid}', null, false, false, 'App\\\\Models\\\\Application', 10, true, true, null);
INSERT INTO environment_variables (key, value, is_preview, created_at, updated_at, is_shown_once, is_multiline, version, is_literal, uuid, "order", is_required, is_shared, resourceable_type, resourceable_id, is_runtime, is_buildtime, comment)
  VALUES ('${ev.key}', '${encrypted}', false, '${now}', '${now}', false, false, '4.0.0-beta.474', false, '${uuid}', null, false, false, 'App\\\\Models\\\\Application', 10, true, true, null);`);
}