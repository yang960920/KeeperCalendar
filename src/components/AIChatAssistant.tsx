"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, FileText, Clock, AlertTriangle, BarChart3, Loader2 } from "lucide-react";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useStore } from "@/hooks/useStore";
import { askAI } from "@/app/actions/ai-chat";
import { Button } from "@/components/ui/button";

type PresetType = "weekly_report" | "deadline_alert" | "delayed_tasks" | "task_summary" | "free";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

const PRESETS: { key: PresetType; label: string; icon: React.ReactNode; description: string }[] = [
    { key: "weekly_report", label: "주간보고", icon: <FileText className="h-4 w-4" />, description: "이번 주 업무 보고서 생성" },
    { key: "deadline_alert", label: "마감 임박", icon: <Clock className="h-4 w-4" />, description: "3일 내 마감 업무 분석" },
    { key: "delayed_tasks", label: "지연 업무", icon: <AlertTriangle className="h-4 w-4" />, description: "마감 초과 업무 분석" },
    { key: "task_summary", label: "업무 정리", icon: <BarChart3 className="h-4 w-4" />, description: "전체 업무 현황 요약" },
];

interface AIChatAssistantProps {
    projectId?: string; // 특정 프로젝트 컨텍스트
}

export const AIChatAssistant = ({ projectId }: AIChatAssistantProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const tasks = useStore(useTaskStore, (s) => s.tasks) || [];
    const projects = useStore(useProjectStore, (s) => s.projects) || [];

    // 스크롤 자동 이동
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 패널 열릴 때 환영 메시지
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: "assistant",
                content: "안녕하세요! 🤖 **Keeper AI 어시스턴트**입니다.\n\n아래 버튼을 클릭하거나 자유롭게 질문해주세요!",
                timestamp: new Date(),
            }]);
        }
    }, [isOpen]);

    // 업무 데이터를 AI 컨텍스트로 변환
    const getTaskContext = useCallback(() => {
        let filteredTasks = tasks;
        if (projectId) {
            filteredTasks = tasks.filter(t => t.projectId === projectId);
        }

        return filteredTasks.map(t => {
            const project = projects.find(p => p.id === t.projectId);
            return {
                title: t.title,
                date: t.date,
                endDate: t.endDate,
                category: t.category,
                planned: t.planned,
                done: t.done,
                projectName: project?.title,
                assigneeName: t.assigneeName || t.assigneeNames?.join(", "),
                subTasks: t.subTasks?.map(st => ({
                    title: st.title,
                    isCompleted: st.isCompleted,
                    status: st.status,
                })),
            };
        });
    }, [tasks, projects, projectId]);

    const sendMessage = async (preset: PresetType, customPrompt?: string) => {
        const userMsg = preset === "free"
            ? customPrompt || ""
            : PRESETS.find(p => p.key === preset)?.label || "";

        if (!userMsg.trim()) return;

        // 사용자 메시지 추가
        setMessages(prev => [...prev, {
            role: "user",
            content: preset === "free" ? userMsg : `📋 ${userMsg} 분석 요청`,
            timestamp: new Date(),
        }]);

        setIsLoading(true);
        setInput("");

        try {
            const taskContext = getTaskContext();
            const result = await askAI(preset, taskContext, customPrompt);

            setMessages(prev => [...prev, {
                role: "assistant",
                content: result.success ? result.message : `❌ ${result.error}`,
                timestamp: new Date(),
            }]);
        } catch {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "❌ 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                timestamp: new Date(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            sendMessage("free", input.trim());
        }
    };

    // 마크다운 간이 렌더링
    const renderMarkdown = (text: string) => {
        return text
            .split("\n")
            .map((line, i) => {
                // 볼드
                line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                // 이탤릭
                line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
                // 인라인 코드
                line = line.replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>');

                // 제목
                if (line.startsWith("### ")) return <h4 key={i} className="font-bold text-sm mt-3 mb-1" dangerouslySetInnerHTML={{ __html: line.slice(4) }} />;
                if (line.startsWith("## ")) return <h3 key={i} className="font-bold text-base mt-3 mb-1" dangerouslySetInnerHTML={{ __html: line.slice(3) }} />;
                if (line.startsWith("# ")) return <h2 key={i} className="font-bold text-lg mt-3 mb-1" dangerouslySetInnerHTML={{ __html: line.slice(2) }} />;

                // 리스트
                if (line.match(/^\d+\.\s/)) return <p key={i} className="ml-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: line }} />;
                if (line.startsWith("- ") || line.startsWith("* ")) return <p key={i} className="ml-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: `• ${line.slice(2)}` }} />;

                // 구분선
                if (line.match(/^---+$/)) return <hr key={i} className="border-border/50 my-2" />;

                // 빈 줄
                if (line.trim() === "") return <br key={i} />;

                // 일반 텍스트
                return <p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: line }} />;
            });
    };

    return (
        <>
            {/* FAB 버튼 - 오른쪽 하단 (업무 생성 버튼 위) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-24 right-8 z-50 h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${isOpen
                    ? "bg-destructive text-destructive-foreground rotate-90 scale-90"
                    : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white hover:shadow-xl hover:scale-105"
                    }`}
            >
                {isOpen ? <X className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
            </button>

            {/* 채팅 패널 */}
            {isOpen && (
                <div className="fixed bottom-40 right-8 z-50 w-[400px] max-h-[550px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
                    {/* 헤더 */}
                    <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-b px-4 py-3 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-sm">Keeper AI 어시스턴트</h3>
                            <p className="text-[10px] text-muted-foreground">Gemini 2.5 Flash · 업무 데이터 기반</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* 메시지 영역 */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[350px]">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted/70 text-foreground rounded-bl-md"
                                    }`}>
                                    {msg.role === "user" ? (
                                        <p className="text-sm">{msg.content}</p>
                                    ) : (
                                        <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                                    )}
                                    <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                                        {msg.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted/70 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                                    <span className="text-sm text-muted-foreground">분석 중...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* 프리셋 버튼 */}
                    <div className="px-4 py-2 border-t bg-muted/20">
                        <div className="grid grid-cols-4 gap-1.5">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.key}
                                    onClick={() => !isLoading && sendMessage(p.key)}
                                    disabled={isLoading}
                                    className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                                    title={p.description}
                                >
                                    <span className="text-muted-foreground group-hover:text-violet-500 transition-colors">
                                        {p.icon}
                                    </span>
                                    <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                        {p.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 입력 */}
                    <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="추가 질문을 입력하세요..."
                            disabled={isLoading}
                            className="flex-1 bg-muted/50 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition-all disabled:opacity-50"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!input.trim() || isLoading}
                            className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            )}
        </>
    );
};
