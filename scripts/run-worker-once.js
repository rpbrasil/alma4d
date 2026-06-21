require('dotenv').config();
if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
}
process.env.RUN_ONCE = process.env.RUN_ONCE || '1';
console.log('SUPABASE_URL=', process.env.SUPABASE_URL ? '[SET]' : '[MISSING]');
console.log('RUN_ONCE=', process.env.RUN_ONCE);
require('../dist/scripts/worker-webhook-processor.js');
