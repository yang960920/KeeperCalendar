require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function main() {
    console.log('API Key:', (process.env.GEMINI_API_KEY || '').substring(0, 15) + '...');

    // 사용 가능한 모델 먼저 확인
    console.log('\n=== 사용 가능한 모델 목록 ===');
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
        );
        const data = await response.json();
        if (data.models) {
            const flashModels = data.models
                .filter(m => m.name.includes('flash') || m.name.includes('gemini'))
                .map(m => `${m.name} (${m.displayName})`);
            flashModels.forEach(m => console.log('  ', m));
        } else {
            console.log('모델 목록 조회 실패:', JSON.stringify(data).substring(0, 200));
        }
    } catch (e) {
        console.log('목록 조회 에러:', e.message);
    }

    // 각 모델 테스트
    console.log('\n=== 모델 테스트 ===');
    const models = [
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-pro',
    ];

    for (const name of models) {
        console.log(`\n${name}...`);
        try {
            const model = genAI.getGenerativeModel({ model: name });
            const result = await model.generateContent('Just reply "OK"');
            console.log(`  ✅ 성공: ${result.response.text().trim().substring(0, 30)}`);
            break;
        } catch (e) {
            console.log(`  ❌ ${e.status || ''} ${(e.message || '').substring(0, 100)}`);
        }
        // Rate limit 방지 대기
        await new Promise(r => setTimeout(r, 2000));
    }
}

main();
