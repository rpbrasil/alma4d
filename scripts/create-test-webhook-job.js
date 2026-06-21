require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
    try {
        const event = {
            provider: 'pagarme',
            event_hash: 'test-hash-' + Date.now(),
            raw_event: { provider: 'pagarme', eventType: 'order.paid', test: true, ts: new Date().toISOString() },
            status: 'pending',
            attempts: 0,
            scheduled_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('webhook_jobs')
            .insert([event])
            .select();

        if (error) {
            console.error('INSERT ERROR', error);
            process.exit(1);
        }

        console.log('Inserted job:', data);
    } catch (e) {
        console.error('EX', e);
        process.exit(1);
    }
})();
