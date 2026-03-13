require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function test() {
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const name of models) {
        try {
            console.log(`Testing ${name}...`);
            const model = genAI.getGenerativeModel({ model: name });
            const r = await model.generateContent('Reply "OK"');
            console.log(`✅ ${name}: ${r.response.text().trim()}`);
            return;
        } catch (e) {
            console.log(`❌ ${name}: ${e.status || e.code || ''} - ${(e.message || '').substring(0, 60)}`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    console.log('All models failed');
}

test();
