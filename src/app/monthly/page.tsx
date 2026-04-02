"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
    Target,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    Minus,
    TrendingUp,
    TrendingDown,
    CalendarDays,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Award,
    Shield,
    Loader2,
    X,
} from "lucide-react";
import { MonthlyBarChart } from "@/components/MonthlyBarChart";
import { MonthlyLineChart } from "@/components/MonthlyLineChart";
import { CategoryBarChart } from "@/components/CategoryBarChart";
import { TaskForm } from "@/components/TaskForm";
import { MonthlyTaskList } from "@/components/MonthlyTaskList";
import { MonthlySummaryWidget } from "@/components/MonthlySummaryWidget";
import { AIChatAssistant } from "@/components/AIChatAssistant";
import { useTaskStore } from "@/store/useTaskStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    getMonthlyGoals,
    createMonthlyGoal,
    updateMonthlyGoal,
    deleteMonthlyGoal,
    getWeeklySummary,
    getMonthComparison,
} from "@/app/actions/monthly-journal";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface GoalData {
    id: string;
    title: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    isCompleted: boolean;
}

interface WeekData {
    weekNum: number;
    period: string;
    total: number;
    completed: number;
    delayed: number;
    rate: number;
    topTasks: { title: string; project: string; status: string; priority: string }[];
}

interface ComparisonData {
    current: { total: number; completed: number; delayed: number; inProgress: number; rate: number; totalContribution: number; timelinessRate: number; year: number; month: number };
    previous: { total: number; completed: number; delayed: number; inProgress: number; rate: number; totalContribution: number; timelinessRate: number; year: number; month: number };
    diff: { total: number; completed: number; rate: number; delayed: number; contribution: number; timeliness: number };
}

// ─── 차이 표시 유틸 ──────────────────────────────────────────────────────────

function DiffBadge({ value, suffix = "", inverse = false }: { value: number; suffix?: string; inverse?: boolean }) {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;

    if (value === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> 동일</span>;

    return (
        <span className={`text-xs font-medium flex items-center gap-0.5 ${isPositive ? "text-emerald-500" : isNegative ? "text-red-400" : "text-muted-foreground"}`}>
            {value > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {value > 0 ? "+" : ""}{value}{suffix}
        </span>
    );
}

// ─── 월간 목표 위젯 ──────────────────────────────────────────────────────────

function MonthlyGoalsWidget({
    userId, year, month,
}: { userId: string; year: number; month: number }) {
    const [goals, setGoals] = useState<GoalData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newTarget, setNewTarget] = useState("100");
    const [newUnit, setNewUnit] = useState("%");

    const loadGoals = useCallback(async () => {
        setIsLoading(true);
        const res = await getMonthlyGoals(userId, year, month);
        if (res.success) setGoals(res.data as GoalData[]);
        setIsLoading(false);
    }, [userId, year, month]);

    useEffect(() => { loadGoals(); }, [loadGoals]);

    const handleAdd = async () => {
        if (!newTitle.trim()) return;
        const res = await createMonthlyGoal({
            userId, year, month,
            title: newTitle,
            targetValue: parseInt(newTarget) || 100,
            unit: newUnit,
        });
        if (res.success) {
            setNewTitle(""); setNewTarget("100"); setNewUnit("%");
            setShowAddDialog(false);
            loadGoals();
        }
    };

    const handleUpdateValue = async (goalId: string, currentValue: number, targetValue: number) => {
        const isCompleted = currentValue >= targetValue;
        await updateMonthlyGoal(goalId, { currentValue, isCompleted });
        loadGoals();
    };

    const handleDelete = async (goalId: string) => {
        await deleteMonthlyGoal(goalId);
        loadGoals();
    };

    const completedCount = goals.filter((g) => g.isCompleted).length;
    const overallRate = goals.length > 0
        ? Math.round(goals.reduce((sum, g) => sum + Math.min(100, (g.currentValue / g.targetValue) * 100), 0) / goals.length)
        : 0;

    return (
        <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-sm">월간 목표</h3>
                    {goals.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                            ({completedCount}/{goals.length} 달성 · {overallRate}%)
                        </span>
                    )}
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <Plus className="h-3 w-3" /> 목표 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xs">
                        <DialogHeader>
                            <DialogTitle className="text-sm">새 월간 목표</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 mt-2">
                            <Input
                                placeholder="목표 이름 (예: 업무 완료율 80% 이상)"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="text-sm h-8"
                            />
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="목표치"
                                    value={newTarget}
                                    onChange={(e) => setNewTarget(e.target.value)}
                                    className="text-sm h-8 w-20"
                                />
                                <Select value={newUnit} onValueChange={setNewUnit}>
                                    <SelectTrigger className="h-8 w-20 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="%">%</SelectItem>
                                        <SelectItem value="건">건</SelectItem>
                                        <SelectItem value="점">점</SelectItem>
                                        <SelectItem value="시간">시간</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleAdd} disabled={!newTitle.trim()} className="w-full h-8 text-xs">
                                추가
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : goals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                    설정된 목표가 없습니다. 목표를 추가해보세요.
                </p>
            ) : (
                <div className="space-y-3">
                    {goals.map((goal) => {
                        const progress = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                        return (
                            <div key={goal.id} className={`p-3 rounded-lg border ${goal.isCompleted ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/30"}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-xs font-medium ${goal.isCompleted ? "text-emerald-500 line-through" : ""}`}>
                                        {goal.isCompleted && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                                        {goal.title}
                                    </span>
                                    <button onClick={() => handleDelete(goal.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${goal.isCompleted ? "bg-emerald-500" : progress >= 80 ? "bg-primary" : progress >= 50 ? "bg-amber-400" : "bg-muted-foreground/30"}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground w-16 text-right">
                                        {goal.currentValue}/{goal.targetValue}{goal.unit}
                                    </span>
                                </div>
                                {/* 수치 조정 */}
                                <div className="flex items-center gap-1.5 mt-2">
                                    <input
                                        type="range"
                                        min={0}
                                        max={goal.targetValue}
                                        value={goal.currentValue}
                                        onChange={(e) => handleUpdateValue(goal.id, parseInt(e.target.value), goal.targetValue)}
                                        className="flex-1 h-1 accent-primary cursor-pointer"
                                    />
                                    <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{progress}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── 주간 요약 위젯 ──────────────────────────────────────────────────────────

function WeeklySummaryWidget({
    userId, year, month,
}: { userId: string; year: number; month: number }) {
    const [weeks, setWeeks] = useState<WeekData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            const res = await getWeeklySummary(userId, year, month);
            if (res.success) setWeeks(res.data as WeekData[]);
            setIsLoading(false);
        })();
    }, [userId, year, month]);

    if (isLoading) return (
        <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm">주간 요약</h3>
            </div>
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        </div>
    );

    return (
        <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm">주간 요약</h3>
            </div>

            {weeks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">해당 월의 업무 데이터가 없습니다.</p>
            ) : (
                <div className="space-y-2">
                    {weeks.map((w) => (
                        <div key={w.weekNum} className="border rounded-lg overflow-hidden">
                            <button
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
                                onClick={() => setExpandedWeek(expandedWeek === w.weekNum ? null : w.weekNum)}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-primary">{w.weekNum}주차</span>
                                    <span className="text-[10px] text-muted-foreground">{w.period}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {w.delayed > 0 && (
                                        <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                                            <AlertTriangle className="h-2.5 w-2.5" /> 지연 {w.delayed}
                                        </span>
                                    )}
                                    <span className={`text-xs font-bold ${w.rate >= 80 ? "text-emerald-500" : w.rate >= 50 ? "text-amber-400" : "text-muted-foreground"}`}>
                                        {w.completed}/{w.total} ({w.rate}%)
                                    </span>
                                    {expandedWeek === w.weekNum ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                                </div>
                            </button>

                            {expandedWeek === w.weekNum && w.topTasks.length > 0 && (
                                <div className="px-3 pb-2.5 border-t">
                                    <div className="mt-2 space-y-1">
                                        {w.topTasks.map((t, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[11px]">
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === "완료" ? "bg-emerald-500" : t.status === "진행중" ? "bg-blue-400" : "bg-muted-foreground/40"}`} />
                                                <span className="flex-1 truncate">{t.title}</span>
                                                <span className="text-muted-foreground flex-shrink-0">{t.project}</span>
                                                <span className={`flex-shrink-0 ${t.status === "완료" ? "text-emerald-500" : t.status === "진행중" ? "text-blue-400" : "text-muted-foreground"}`}>
                                                    {t.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── 월간 비교 위젯 ──────────────────────────────────────────────────────────

function MonthComparisonWidget({
    userId, year, month,
}: { userId: string; year: number; month: number }) {
    const [data, setData] = useState<ComparisonData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            const res = await getMonthComparison(userId, year, month);
            if (res.success && res.data) setData(res.data as ComparisonData);
            setIsLoading(false);
        })();
    }, [userId, year, month]);

    if (isLoading) return (
        <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm">전월 비교</h3>
            </div>
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        </div>
    );

    if (!data) return null;

    const items = [
        { label: "총 업무", icon: CalendarDays, current: data.current.total, prev: data.previous.total, diff: data.diff.total, suffix: "건" },
        { label: "완료", icon: CheckCircle2, current: data.current.completed, prev: data.previous.completed, diff: data.diff.completed, suffix: "건" },
        { label: "달성률", icon: Award, current: data.current.rate, prev: data.previous.rate, diff: data.diff.rate, suffix: "%" },
        { label: "지연", icon: AlertTriangle, current: data.current.delayed, prev: data.previous.delayed, diff: data.diff.delayed, suffix: "건", inverse: true },
        { label: "기여도", icon: TrendingUp, current: data.current.totalContribution, prev: data.previous.totalContribution, diff: data.diff.contribution, suffix: "점" },
        { label: "기한 준수", icon: Shield, current: data.current.timelinessRate, prev: data.previous.timelinessRate, diff: data.diff.timeliness, suffix: "%" },
    ];

    const prevLabel = `${data.previous.month}월`;
    const curLabel = `${data.current.month}월`;

    return (
        <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm">전월 비교</h3>
                <span className="text-[10px] text-muted-foreground">({prevLabel} vs {curLabel})</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="p-2.5 rounded-lg bg-muted/30 border">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="text-lg font-bold">{item.current}<span className="text-[10px] text-muted-foreground ml-0.5">{item.suffix}</span></div>
                                    <div className="text-[10px] text-muted-foreground">전월 {item.prev}{item.suffix}</div>
                                </div>
                                <DiffBadge value={item.diff} suffix={item.suffix} inverse={item.inverse} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function Home() {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(String(Math.max(2026, currentDate.getFullYear())));
    const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));

    const user = useStore(useAuthStore, (s) => s.user);
    const tasks = useStore(useTaskStore, (state) => state.tasks) || [];
    const targetPrefix = `${selectedYear}-${selectedMonth.padStart(2, "0")}`;
    const currentMonthTasks = tasks.filter(t => t.date.startsWith(targetPrefix));

    const yearNum = parseInt(selectedYear);
    const monthNum = parseInt(selectedMonth);

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            <header className="border-b py-4 px-6 md:px-12 mb-6 shadow-sm flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-primary">Keeper Calendar</h1>
                <div className="flex gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="연도" />
                        </SelectTrigger>
                        <SelectContent>
                            {[2026, 2027, 2028, 2029, 2030].map(year => (
                                <SelectItem key={year} value={String(year)}>{year}년</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[90px]">
                            <SelectValue placeholder="월" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <SelectItem key={month} value={String(month)}>{month}월</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </header>

            <main className="container mx-auto px-4 md:px-12 space-y-8 max-w-7xl">
                {/* 상단: 월간 통계 요약 위젯 */}
                <section>
                    <MonthlySummaryWidget
                        year={selectedYear}
                        month={selectedMonth}
                        tasks={currentMonthTasks}
                    />
                </section>

                {/* 월간 목표 + 전월 비교 */}
                {user && (
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <MonthlyGoalsWidget userId={user.id} year={yearNum} month={monthNum} />
                        <MonthComparisonWidget userId={user.id} year={yearNum} month={monthNum} />
                    </section>
                )}

                {/* 주간 요약 */}
                {user && (
                    <section>
                        <WeeklySummaryWidget userId={user.id} year={yearNum} month={monthNum} />
                    </section>
                )}

                {/* 차트 그리드 영역 */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="col-span-1">
                        <MonthlyBarChart year={selectedYear} />
                    </div>
                    <div className="col-span-1">
                        <MonthlyLineChart year={selectedYear} />
                    </div>
                    <div className="col-span-1">
                        <CategoryBarChart year={selectedYear} month={selectedMonth} />
                    </div>
                </section>

                {/* 해당 월의 리스트 영역 */}
                <section className="pt-8 mb-8">
                    <h2 className="text-xl font-semibold mb-4">{selectedMonth}월 업무 일지</h2>
                    <MonthlyTaskList year={selectedYear} month={selectedMonth} />
                </section>
            </main>

            {/* AI Chat Assistant */}
            <AIChatAssistant />

            {/* Floating Action Button for Task Form */}
            <TaskForm />
        </div>
    );
}
