"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface TaskContext {
    title: string;
    date: string;
    endDate?: string;
    category: string;
    planned: number;
    done: number;
    projectName?: string;
    assigneeName?: string;
    subTasks?: { title: string; isCompleted: boolean; status?: string }[];
}

type PresetType = "weekly_report" | "deadline_alert" | "delayed_tasks" | "task_summary" | "free";

const SYSTEM_PROMPT = `당신은 "Keeper" 업무 관리 어시스턴트입니다.
사용자의 업무 데이터를 분석하여 인사이트, 보고서, 알림을 제공합니다.

규칙:
- 항상 한국어로 답변합니다.
- 마크다운 형식으로 깔끔하게 정리합니다.
- 업무 데이터 기반으로 구체적이고 실용적인 답변을 합니다.
- 간결하면서도 핵심을 잘 전달합니다.
- 이모지를 적절히 사용하여 가독성을 높입니다.`;

function buildPresetPrompt(preset: PresetType, customPrompt?: string): string {
    switch (preset) {
        case "weekly_report":
            return `아래 업무 데이터를 기반으로 **주간 업무 보고서**를 작성해주세요.

포함할 내용:
1. 📊 이번 주 업무 요약 (완료/진행중/예정 건수)
2. ✅ 완료된 주요 업무
3. 🔄 진행 중인 업무와 진행률
4. 📅 다음 주 예정 업무
5. 💡 특이사항 및 건의사항

보고서 형태로 깔끔하게 정리해주세요.`;

        case "deadline_alert":
            return `아래 업무 데이터에서 **마감 임박 업무**(3일 이내)를 분석해주세요.

포함할 내용:
1. ⏰ 마감 임박 업무 목록 (날짜순)
2. 🔴 긴급도 평가
3. 📋 우선순위 제안
4. 💡 효율적 처리 방안`;

        case "delayed_tasks":
            return `아래 업무 데이터에서 **지연된 업무**(마감일 초과 & 미완료)를 분석해주세요.

포함할 내용:
1. ⚠️ 지연 업무 목록 (지연 일수 포함)
2. 📊 지연 원인 분석 (가능한 범위)
3. 🔧 대응 방안 제안
4. 📅 새로운 마감일 제안`;

        case "task_summary":
            return `아래 업무 데이터를 기반으로 **전체 업무 현황을 정리**해주세요.

포함할 내용:
1. 📊 전체 현황 (완료율, 총 업무 수)
2. 📁 카테고리/프로젝트별 분류
3. 👥 담당자별 업무 분포
4. 📈 주요 성과 및 개선점
5. 💡 업무 효율화 제안`;

        case "free":
            return customPrompt || "업무에 대해 질문해주세요.";

        default:
            return customPrompt || "";
    }
}

function formatTasksForContext(tasks: TaskContext[]): string {
    if (tasks.length === 0) return "업무 데이터가 없습니다.";

    const today = new Date().toISOString().split("T")[0];
    const lines = tasks.map((t, i) => {
        const isCompleted = t.done >= t.planned && t.planned > 0;
        const isDelayed = t.endDate && t.endDate < today && !isCompleted;
        const status = isCompleted ? "✅완료" : isDelayed ? "⚠️지연" : "🔄진행중";
        const project = t.projectName ? `[${t.projectName}]` : "[개인]";
        const assignee = t.assigneeName ? `담당:${t.assigneeName}` : "";
        const subInfo = t.subTasks && t.subTasks.length > 0
            ? ` (하위: ${t.subTasks.filter(s => s.isCompleted).length}/${t.subTasks.length})`
            : "";

        return `${i + 1}. ${status} ${project} ${t.title} | ${t.category} | 시작:${t.date} | 마감:${t.endDate || "미정"} | 계획:${t.planned} 완료:${t.done} ${assignee}${subInfo}`;
    });

    return `=== 업무 데이터 (총 ${tasks.length}건, 오늘: ${today}) ===\n${lines.join("\n")}`;
}

async function callWithRetry(prompt: string, retries = 3): Promise<string> {
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    for (const modelName of models) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                return result.response.text();
            } catch (error: any) {
                const status = error?.status || error?.code;
                console.error(`AI attempt ${attempt + 1}/${retries} (${modelName}) failed:`, status, error?.message?.substring(0, 100));

                if (status === 429) {
                    const waitMs = Math.min(5000 * Math.pow(2, attempt), 30000);
                    console.log(`Rate limited. Waiting ${waitMs}ms...`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }

                break;
            }
        }
    }

    throw new Error("ALL_MODELS_FAILED");
}

export async function askAI(
    preset: PresetType,
    tasks: TaskContext[],
    customPrompt?: string
): Promise<{ success: boolean; message: string; error?: string }> {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return { success: false, message: "", error: "AI API 키가 설정되지 않았습니다." };
        }

        const taskContext = formatTasksForContext(tasks);
        const userPrompt = buildPresetPrompt(preset, customPrompt);
        const fullPrompt = `${SYSTEM_PROMPT}\n\n${taskContext}\n\n---\n\n${userPrompt}`;

        const text = await callWithRetry(fullPrompt);

        return { success: true, message: text };
    } catch (error: any) {
        console.error("AI 최종 실패:", error?.message);

        if (error?.message === "ALL_MODELS_FAILED") {
            return {
                success: false,
                message: "",
                error: "AI 서비스가 일시적으로 사용량이 초과되었습니다. 1분 후 다시 시도해주세요.",
            };
        }

        return {
            success: false,
            message: "",
            error: `AI 오류: ${error?.message || "알 수 없는 오류"}. 다시 시도해주세요.`,
        };
    }
}
