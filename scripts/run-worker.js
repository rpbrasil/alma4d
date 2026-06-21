require('ts-node').register({ transpileOnly: true });
require('dotenv').config();
require('./worker-webhook-processor.ts');
