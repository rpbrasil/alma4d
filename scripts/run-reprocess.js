require('ts-node').register({ transpileOnly: true });
require('dotenv').config();
require('./reprocess-pagarme-webhooks.ts');
