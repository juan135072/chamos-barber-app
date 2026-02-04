
const { createServerClient } = require('@supabase/auth-helpers-nextjs');

try {
    console.log('Testing with { req, res } object...');
    const client = createServerClient({ req: {}, res: {} });
    console.log('Success with { req, res } object');
} catch (e) {
    console.log('Failed with { req, res } object:', e.message);
}

try {
    console.log('\nTesting with (url, key, { cookies }) signature...');
    const client = createServerClient('url', 'key', { cookies: {} });
    console.log('Success with (url, key, { cookies }) signature');
} catch (e) {
    console.log('Failed with (url, key, { cookies }) signature:', e.message);
}
