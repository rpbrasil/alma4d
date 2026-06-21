require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
    try {
        const { data, error } = await supabase
            .from('contratos')
            .select('id, status, usuario_id')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('ERROR', error);
            process.exit(1);
        }

        console.log('found contratos:', data);
    } catch (e) {
        console.error('EX', e);
        process.exit(1);
    }
})();
