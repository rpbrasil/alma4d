require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const contratoId = '573591bc-93ff-4b68-ac98-bd8303a05300'; // from sample

(async () => {
    try {
        const now = Date.now();
        const orderId = `ord-test-${now}`;
        const evtId = `evt-test-${now}`;

        const rawEvent = {
            id: evtId,
            type: 'order.paid',
            data: {
                id: orderId,
                status: 'paid',
                metadata: {
                    contrato_id: contratoId,
                    user_id: null,
                    cupom_codigo: null,
                },
                amount: 10000,
            },
        };

        const payload = {
            provider: 'pagarme',
            event_hash: 'test-hash-contrato-' + now,
            event_id: evtId,
            order_id: orderId,
            contrato_id: contratoId,
            raw_event: rawEvent,
            status: 'pending',
            attempts: 0,
            scheduled_at: new Date().toISOString(),
        };

        const { data, error } = await supabase.from('webhook_jobs').insert([payload]).select();
        if (error) {
            console.error('INSERT ERROR', error);
            process.exit(1);
        }
        console.log('Inserted job:', data[0]);
    } catch (e) {
        console.error('EX', e);
        process.exit(1);
    }
})();
