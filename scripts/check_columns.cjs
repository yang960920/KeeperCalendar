const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    await client.connect();
    const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'User';
    `);
    console.log("Columns in NeonDB 'User' table:");
    console.table(res.rows);
    await client.end();
}

main().catch(console.error);
