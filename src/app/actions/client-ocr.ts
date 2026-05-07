"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { isValidBrn, normalizeBrn, formatBrn } from "@/lib/brn";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export type OcrMode = "biz" | "card";

export interface ClientOcrResult {
    name?: string;
    bizNo?: string;
    ceoName?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    brnValid?: boolean; // mode=biz 일 때만 의미 있음
    confidence: "high" | "low";
    warnings: string[];
}

const BIZ_PROMPT = `당신은 한국 사업자등록증 사진을 분석해 핵심 정보를 추출하는 OCR 도우미입니다.

[규칙]
1. 출력은 반드시 순수 JSON. 코드블록·설명·주석 금지.
2. 글자가 흐려서 100% 확신할 수 없는 필드는 빈 문자열("") 또는 null로 비워두세요. 추측 금지.
3. 사업자번호는 "XXX-XX-XXXXX" 형식의 10자리 숫자(하이픈 포함)로.
4. 상호는 "법인명(단체명)" 또는 "상호" 항목의 값. 영문 표기가 함께 있어도 한글만.
5. 대표자는 "성명(대표자)" 항목.
6. 주소는 "사업장 소재지" 또는 "사업장 주소".
7. 사업자등록증으로 보이지 않으면 모든 필드를 null로 두고 confidence를 "low"로.

[출력 JSON 스키마]
{
  "name": "상호 (필수)",
  "bizNo": "XXX-XX-XXXXX",
  "ceoName": "대표자",
  "address": "사업장 소재지",
  "confidence": "high" | "low"
}

JSON:`;

const CARD_PROMPT = `당신은 한국 비즈니스 명함 사진을 분석해 핵심 정보를 추출하는 OCR 도우미입니다.

[규칙]
1. 출력은 반드시 순수 JSON. 코드블록·설명·주석 금지.
2. 글자가 흐려서 100% 확신할 수 없는 필드는 빈 문자열("") 또는 null로 비워두세요. 추측 금지.
3. 회사명(name)은 명함에 가장 크게 적힌 회사·기관명. 한글 표기 우선.
4. 담당자(contactName)는 명함의 사람 이름. 직책은 제외.
5. 이메일·전화는 명함에 적힌 그대로. 전화번호는 "010-0000-0000" 형식이면 하이픈 유지.
6. 주소가 적혀 있으면 추출.
7. 명함으로 보이지 않으면 모든 필드를 null로 두고 confidence를 "low"로.

[출력 JSON 스키마]
{
  "name": "회사명",
  "contactName": "담당자 이름",
  "email": "이메일",
  "phone": "전화번호",
  "address": "주소 (선택)",
  "confidence": "high" | "low"
}

JSON:`;

function extractJson(text: string): any {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("JSON_NOT_FOUND");
    return JSON.parse(cleaned.slice(start, end + 1));
}

async function callGeminiVision(prompt: string, base64Image: string, mimeType: string): Promise<string> {
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    for (const modelName of models) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" },
                });
                const result = await model.generateContent([
                    { text: prompt },
                    { inlineData: { data: base64Image, mimeType } },
                ]);
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

function str(v: any): string | undefined {
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    return s ? s : undefined;
}

export async function ocrClientFromImage(
    mode: OcrMode,
    base64Image: string,
    mimeType: string
): Promise<{ success: boolean; data?: ClientOcrResult; error?: string }> {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return { success: false, error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." };
        }
        if (!base64Image) return { success: false, error: "파일 데이터가 비어있습니다." };
        // 사업자등록증은 PDF가 기본, 명함은 이미지 — 둘 다 허용
        const allowedMimes = [
            "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
            "application/pdf",
        ];
        if (!allowedMimes.includes(mimeType)) {
            return { success: false, error: `지원하지 않는 파일 형식: ${mimeType}` };
        }

        const prompt = mode === "biz" ? BIZ_PROMPT : CARD_PROMPT;
        const raw = await callGeminiVision(prompt, base64Image, mimeType);
        const parsed = extractJson(raw);

        const warnings: string[] = [];
        let confidence: "high" | "low" = parsed.confidence === "high" ? "high" : "low";

        const result: ClientOcrResult = {
            name: str(parsed.name),
            bizNo: undefined,
            ceoName: str(parsed.ceoName),
            contactName: str(parsed.contactName),
            email: str(parsed.email),
            phone: str(parsed.phone),
            address: str(parsed.address),
            confidence,
            warnings,
        };

        if (mode === "biz") {
            const rawBrn = str(parsed.bizNo);
            if (rawBrn) {
                const digits = normalizeBrn(rawBrn);
                if (digits.length === 10) {
                    const valid = isValidBrn(digits);
                    result.bizNo = formatBrn(digits);
                    result.brnValid = valid;
                    if (!valid) {
                        warnings.push("사업자번호 검증에 실패했습니다. 직접 확인하고 고쳐주세요.");
                        confidence = "low";
                    }
                } else {
                    warnings.push("사업자번호가 10자리가 아닙니다. 직접 확인하고 고쳐주세요.");
                    result.bizNo = rawBrn;
                    confidence = "low";
                }
            } else {
                warnings.push("사업자번호를 인식하지 못했습니다. 직접 입력해주세요.");
                confidence = "low";
            }
            if (!result.name) {
                warnings.push("상호를 인식하지 못했습니다. 직접 입력해주세요.");
                confidence = "low";
            }
        } else {
            // 명함 모드: 부분 인식이라도 폼은 열림 — 사용자가 직접 보완. 안내만 띄움
            const missing: string[] = [];
            if (!result.name) missing.push("회사명");
            if (!result.contactName) missing.push("담당자");
            if (missing.length > 0) {
                warnings.push(`${missing.join("·")}을(를) 인식하지 못했습니다. 직접 입력해주세요.`);
                confidence = "low";
            }
        }

        result.confidence = confidence;
        result.warnings = warnings;

        // 이미지는 메모리에서만 다루고 디스크/DB에 저장하지 않음 (개인정보 최소 수집)
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Error OCR client image:", error);
        const msg =
            error?.message === "AI_ALL_MODELS_FAILED"
                ? "AI 호출 실패 (일시 장애). 잠시 후 다시 시도해주세요."
                : error?.message === "JSON_NOT_FOUND"
                    ? "AI 응답을 해석하지 못했습니다. 다시 촬영해주세요."
                    : "이미지 분석 중 오류가 발생했습니다.";
        return { success: false, error: msg };
    }
}
