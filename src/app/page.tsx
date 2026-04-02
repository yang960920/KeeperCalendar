"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Settings2, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { getWidgetLayout, saveWidgetLayout } from "@/app/actions/settings";
import { AIChatAssistant } from "@/components/AIChatAssistant";

// ─── 위젯 레지스트리 ──────────────────────────────────────────────────────────

import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { MailWidget } from "@/components/dashboard/MailWidget";
import { LoginHistoryWidget } from "@/components/dashboard/LoginHistoryWidget";
import { AppGrid } from "@/components/dashboard/AppGrid";
import { TaskStatusWidget } from "@/components/dashboard/TaskStatusWidget";
import { WorkClockWidget } from "@/components/dashboard/WorkClockWidget";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { TodayTaskWidget } from "@/components/dashboard/TodayTaskWidget";
import { ActivityFeedWidget } from "@/components/dashboard/ActivityFeedWidget";

interface WidgetDef {
    id: string;
    label: string;
    component: React.ComponentType;
    defaultHeight: string;
}

const WIDGET_REGISTRY: WidgetDef[] = [
    { id: "profile",       label: "프로필",       component: UserProfileCard,    defaultHeight: "h-[220px]" },
    { id: "mail",          label: "알림",         component: MailWidget,         defaultHeight: "h-[220px]" },
    { id: "loginHistory",  label: "접속 기록",    component: LoginHistoryWidget,  defaultHeight: "h-[220px]" },
    { id: "appGrid",       label: "앱 바로가기",  component: AppGrid,            defaultHeight: "h-[320px]" },
    { id: "taskStatus",    label: "업무 현황",    component: TaskStatusWidget,    defaultHeight: "h-[320px]" },
    { id: "workClock",     label: "근무 체크",    component: WorkClockWidget,     defaultHeight: "h-[320px]" },
    { id: "miniCalendar",  label: "미니 캘린더",  component: MiniCalendar,        defaultHeight: "h-[320px]" },
    { id: "todayTask",     label: "오늘 할 일",   component: TodayTaskWidget,     defaultHeight: "h-[320px]" },
    { id: "activityFeed",  label: "활동 피드",    component: ActivityFeedWidget,  defaultHeight: "h-[320px]" },
];

const DEFAULT_WIDGETS = WIDGET_REGISTRY.map((w) => ({ id: w.id, visible: true }));

// 레이아웃 타입: 3열, 2열, 1열
const LAYOUT_OPTIONS = [
    { id: "3col", label: "3열", cols: "lg:grid-cols-3", icon: "▐▐▐" },
    { id: "2col", label: "2열", cols: "lg:grid-cols-2", icon: "▐ ▐" },
    { id: "1col", label: "1열", cols: "lg:grid-cols-1", icon: " ▐ " },
] as const;

type WidgetConfig = { id: string; visible: boolean };
type LayoutConfig = { layoutType: string; widgets: WidgetConfig[] };

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function OfficeDashboard() {
    const user = useAuthStore((s) => s.user);
    const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
    const [layoutType, setLayoutType] = useState("3col");
    const [editMode, setEditMode] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

    // DB에서 설정 로드
    useEffect(() => {
        if (!user) return;
        getWidgetLayout(user.id).then((res) => {
            if (res.success && res.data) {
                const saved = res.data as LayoutConfig;
                // 새로 추가된 위젯이 있으면 끝에 붙이기
                const savedIds = new Set(saved.widgets.map((w) => w.id));
                const merged = [
                    ...saved.widgets.filter((w) => WIDGET_REGISTRY.some((r) => r.id === w.id)),
                    ...DEFAULT_WIDGETS.filter((w) => !savedIds.has(w.id)),
                ];
                setWidgets(merged);
                setLayoutType(saved.layoutType || "3col");
            }
            setLoaded(true);
        });
    }, [user]);

    // 저장
    const handleSave = useCallback(async () => {
        if (!user) return;
        setSaving(true);
        await saveWidgetLayout(user.id, { layoutType, widgets });
        setSaving(false);
        setEditMode(false);
    }, [user, layoutType, widgets]);

    // 드래그 앤 드롭으로 위젯 순서 변경
    const handleDragEnd = () => {
        if (dragIdx === null || dragOverIdx === null || dragIdx === dragOverIdx) {
            setDragIdx(null);
            setDragOverIdx(null);
            return;
        }
        setWidgets((prev) => {
            const next = [...prev];
            const [moved] = next.splice(dragIdx, 1);
            next.splice(dragOverIdx, 0, moved);
            return next;
        });
        setDragIdx(null);
        setDragOverIdx(null);
    };

    // 위젯 순서 이동
    const moveWidget = (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= widgets.length) return;
        setWidgets((prev) => {
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    // 위젯 표시/숨김 토글
    const toggleVisible = (id: string) => {
        setWidgets((prev) =>
            prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
        );
    };

    // 현재 레이아웃의 cols 클래스
    const layoutCols = LAYOUT_OPTIONS.find((l) => l.id === layoutType)?.cols || "lg:grid-cols-3";

    // 표시할 위젯 목록
    const visibleWidgets = widgets
        .filter((w) => w.visible)
        .map((w) => WIDGET_REGISTRY.find((r) => r.id === w.id)!)
        .filter(Boolean);

    if (!loaded) return null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b py-4 px-6 md:px-8 shadow-sm flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-primary">
                        {editMode ? "오피스 홈 편집" : "오피스 홈"}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {editMode ? "위젯 배치와 레이아웃을 설정합니다" : "Keeper Office Dashboard"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {editMode ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    // 취소: DB에서 다시 로드
                                    setEditMode(false);
                                    if (user) {
                                        getWidgetLayout(user.id).then((res) => {
                                            if (res.success && res.data) {
                                                const saved = res.data as LayoutConfig;
                                                const savedIds = new Set(saved.widgets.map((w) => w.id));
                                                setWidgets([
                                                    ...saved.widgets.filter((w) => WIDGET_REGISTRY.some((r) => r.id === w.id)),
                                                    ...DEFAULT_WIDGETS.filter((w) => !savedIds.has(w.id)),
                                                ]);
                                                setLayoutType(saved.layoutType || "3col");
                                            } else {
                                                setWidgets(DEFAULT_WIDGETS);
                                                setLayoutType("3col");
                                            }
                                        });
                                    }
                                }}
                                className="gap-1.5"
                            >
                                <X className="h-4 w-4" /> 취소
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                                <Check className="h-4 w-4" />
                                {saving ? "저장 중..." : "저장"}
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
                            <Settings2 className="h-4 w-4" /> 편집
                        </Button>
                    )}
                </div>
            </header>

            {/* 편집 모드: 설정 패널 */}
            {editMode && (
                <div className="border-b bg-muted/30 px-6 md:px-8 py-4">
                    <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-6">
                        {/* 레이아웃 선택 */}
                        <div className="shrink-0">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">레이아웃</p>
                            <div className="flex gap-2">
                                {LAYOUT_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setLayoutType(opt.id)}
                                        className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-lg border-2 transition-all text-xs font-medium ${
                                            layoutType === opt.id
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-muted hover:border-muted-foreground/30 text-muted-foreground"
                                        }`}
                                    >
                                        <span className="font-mono text-base tracking-widest">{opt.icon}</span>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 위젯 순서 + 표시/숨김 */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">위젯 배치</p>
                            <div className="space-y-1 max-h-[280px] overflow-y-auto">
                                {widgets.map((w, idx) => {
                                    const def = WIDGET_REGISTRY.find((r) => r.id === w.id);
                                    if (!def) return null;
                                    return (
                                        <div
                                            key={w.id}
                                            draggable
                                            onDragStart={() => setDragIdx(idx)}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                                            onDragEnd={handleDragEnd}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                                w.visible
                                                    ? "bg-card border-border"
                                                    : "bg-muted/20 border-transparent opacity-50"
                                            } ${dragIdx === idx ? "opacity-40" : ""} ${
                                                dragOverIdx === idx && dragIdx !== null && dragIdx !== idx
                                                    ? "border-primary border-dashed"
                                                    : ""
                                            }`}
                                        >
                                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
                                            <span className="text-sm font-medium flex-1 truncate">{def.label}</span>

                                            {/* 위/아래 이동 */}
                                            <button
                                                onClick={() => moveWidget(idx, -1)}
                                                disabled={idx === 0}
                                                className="p-1 rounded hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed"
                                            >
                                                <ChevronUp className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => moveWidget(idx, 1)}
                                                disabled={idx === widgets.length - 1}
                                                className="p-1 rounded hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed"
                                            >
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            </button>

                                            {/* 표시/숨김 */}
                                            <button
                                                onClick={() => toggleVisible(w.id)}
                                                className={`p-1 rounded transition-colors ${
                                                    w.visible ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
                                                }`}
                                            >
                                                {w.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <main className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
                <div className={`grid grid-cols-1 md:grid-cols-2 ${layoutCols} gap-4 lg:gap-5`}>
                    {visibleWidgets.map((def) => (
                        <div key={def.id} className={def.defaultHeight}>
                            <def.component />
                        </div>
                    ))}
                </div>
            </main>

            <AIChatAssistant />
        </div>
    );
}
