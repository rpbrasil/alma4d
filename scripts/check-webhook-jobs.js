require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
    try {
        const { data, error } = await supabase
            .from('webhook_jobs')
            .select('id, status, attempts, scheduled_at, created_at, updated_at')
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) {
            console.error('ERROR', error);
            process.exit(1);
        }

        const counts = data.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
        }, {});

        console.log('jobs_count:', counts);
        console.log('recent_jobs_sample:', data.slice(0, 20));
    } catch (e) {
        console.error('EX', e);
        process.exit(1);
    }
})();
