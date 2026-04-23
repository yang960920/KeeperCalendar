"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface TsPrefillResult {
    issueDate?: string; // YYYY-MM-DD
    clientNameHint?: string;
    clientPerson?: string;
    items: Array<{
        type: "PRODUCT" | "FREIGHT";
        date?: string; // "M/D" 포맷
        name?: string;
        spec?: string;
        qty?: number;
        unitPrice?: number;
        supply?: number; // FREIGHT 전용
        note?: string;
    }>;
    memo?: string;
}

function buildPrompt(userText: string, today: string) {
    return `당신은 한국 ${COMPANY_NAME} 회사의 거래명세표 작성 도우미입니다.
사용자가 자연어로 간단히 설명하면, 거래명세표 행에 들어갈 구조화된 JSON 데이터를 만드세요.

오늘 날짜: ${today}

[규칙]
1. 출력은 반드시 순수 JSON만. 코드블록, 설명, 주석 없음.
2. 확신이 없는 필드는 빈 문자열/undefined 대신 생략하거나 null.
3. 금액은 숫자(쉼표·원 단위 표기 없이).
4. 날짜는 YYYY-MM-DD 형식. 사용자가 "어제"/"오늘" 등 상대 표현을 쓰면 오늘 날짜 기준으로 계산.
5. 행의 월일(date)은 "M/D" 형식(예: "3/5"). 월일이 특정되지 않으면 issueDate 와 동일하게.
6. 운송비/운반비는 type="FREIGHT", 금액을 supply에. 제품은 type="PRODUCT", qty·unitPrice 기입.
7. 제품 규격이 품명에 섞여 있으면 가능한 한 spec으로 분리. 확신 없으면 name에 통합.

[출력 JSON 스키마]
{
  "issueDate": "YYYY-MM-DD (선택)",
  "clientNameHint": "거래처 상호 힌트 (선택)",
  "clientPerson": "인수자 성명 (선택)",
  "items": [
    { "type": "PRODUCT" | "FREIGHT", "date": "M/D", "name": "...", "spec": "...", "qty": 3, "unitPrice": 2000000, "supply": 0, "note": "..." }
  ],
  "memo": "메모 (선택)"
}

[사용자 입력]
${userText}

JSON:`;
}

const COMPANY_NAME = "한미르㈜";

function extractJson(text: string): any {
    // 코드블록 제거
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    // 첫 { 부터 마지막 } 까지
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("JSON을 찾을 수 없습니다.");
    const slice = cleaned.slice(start, end + 1);
    return JSON.parse(slice);
}

async function callGemini(prompt: string): Promise<string> {
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    for (const modelName of models) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" },
                });
                const result = await model.generateContent(prompt);
                return result.response.text();
            } catch (error: any) {
                if (error?.status === 429) {
                    await new Promise((r) => setTimeout(r, 2500 * Math.pow(2, attempt)));
                    continue;
                }
                break;
            }
        }
    }
    throw new Error("AI_ALL_MODELS_FAILED");
}

export async function prefillStatement(
    rawText: string
): Promise<{ success: boolean; data?: TsPrefillResult; error?: string }> {
    try {
        if (!rawText?.trim()) return { success: false, error: "입력 텍스트가 비었습니다." };
        if (!process.env.GEMINI_API_KEY) {
            return { success: false, error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." };
        }

        const today = new Date().toISOString().slice(0, 10);
        const prompt = buildPrompt(rawText.trim(), today);
        const raw = await callGemini(prompt);
        const parsed = extractJson(raw);

        // 스키마 정규화 / 방어적 파싱
        const items = Array.isArray(parsed.items) ? parsed.items : [];
        const out: TsPrefillResult = {
            issueDate: typeof parsed.issueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.issueDate) ? parsed.issueDate : undefined,
            clientNameHint: typeof parsed.clientNameHint === "string" ? parsed.clientNameHint : undefined,
            clientPerson: typeof parsed.clientPerson === "string" ? parsed.clientPerson : undefined,
            items: items.map((it: any) => ({
                type: it.type === "FREIGHT" ? "FREIGHT" : "PRODUCT",
                date: typeof it.date === "string" ? it.date : undefined,
                name: typeof it.name === "string" ? it.name : undefined,
                spec: typeof it.spec === "string" ? it.spec : undefined,
                qty: typeof it.qty === "number" ? it.qty : (it.qty ? Number(it.qty) : undefined),
                unitPrice: typeof it.unitPrice === "number" ? it.unitPrice : (it.unitPrice ? Number(it.unitPrice) : undefined),
                supply: typeof it.supply === "number" ? it.supply : (it.supply ? Number(it.supply) : undefined),
                note: typeof it.note === "string" ? it.note : undefined,
            })).filter((it: any) => it.name || it.supply),
            memo: typeof parsed.memo === "string" ? parsed.memo : undefined,
        };

        return { success: true, data: out };
    } catch (error: any) {
        console.error("Error prefilling statement:", error);
        return { success: false, error: error?.message === "AI_ALL_MODELS_FAILED" ? "AI 호출 실패 (일시 장애)" : "AI 분석 중 오류가 발생했습니다." };
    }
}
