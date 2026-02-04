
const authHelpers = require('@supabase/auth-helpers-nextjs');
console.log('Is createPagesServerClient exported?', typeof authHelpers.createPagesServerClient);
console.log('Is createServerClient exported?', typeof authHelpers.createServerClient);
console.log('All keys:', Object.keys(authHelpers));
