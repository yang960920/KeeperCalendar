const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    await client.connect();

    const departments = ['대표이사 (CEO)', '경영지원본부', 'R&D센터', '사업총괄본부'];

    console.log("Seeding departments directly to:", process.env.DATABASE_URL.split('@')[1]);

    for (const name of departments) {
        // Use raw SQL to insert, ignore if exists
        const res = await client.query(
            `INSERT INTO "Department" ("id", "name", "createdAt", "updatedAt") 
           VALUES (gen_random_uuid(), $1, NOW(), NOW())
           ON CONFLICT ("name") DO NOTHING`,
            [name]
        );
        if (res.rowCount > 0) {
            console.log(`Inserted: ${name}`);
        } else {
            console.log(`Already exists: ${name}`);
        }
    }

    console.log('Departments seeded successfully.');
    await client.end();
}

main().catch(console.error);
