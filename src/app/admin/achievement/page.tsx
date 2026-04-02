"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Download, TrendingUp, TrendingDown, ChevronUp, ChevronDown, Minus,
    BarChart3, CheckCircle2, AlertTriangle, Clock, Award, Users,
    Shield, Zap, Loader2, FileText, ChevronRight,
} from "lucide-react";
import { getExportData } from "@/app/actions/export";
import { getDepartments } from "@/app/actions/employee";
import { getAchievementData, getKpiDashboard } from "@/app/actions/achievement";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeptMonthlyChart } from "@/components/admin/DeptMonthlyChart";
import { DeptComparisonChart } from "@/components/admin/DeptComparisonChart";
import { MemberContributionTable } from "@/components/admin/MemberContributionTable";

// ─── 차이 배지 ───────────────────────────────────────────────────────────────

function DiffBadge({ value, suffix = "", inverse = false }: { value: number; suffix?: string; inverse?: boolean }) {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;
    if (value === 0) return <span className="text-[10px] text-zinc-500 flex items-center gap-0.5"><Minus className="h-2.5 w-2.5" />동일</span>;
    return (
        <span className={`text-[10px] font-medium flex items-center gap-0.5 ${isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-zinc-500"}`}>
            {value > 0 ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            {value > 0 ? "+" : ""}{value}{suffix}
        </span>
    );
}

// ─── 우선순위 색상 ───────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
    "긴급": "text-red-400 bg-red-400/10",
    "높음": "text-orange-400 bg-orange-400/10",
    "보통": "text-blue-400 bg-blue-400/10",
    "낮음": "text-zinc-400 bg-zinc-400/10",
};

// ─── KPI 카드 ────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, suffix, diff, diffSuffix, inverse, color }: {
    icon: any; label: string; value: number; suffix: string;
    diff?: number; diffSuffix?: string; inverse?: boolean; color: string;
}) {
    return (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${color}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs text-zinc-400">{label}</span>
            </div>
            <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-white">{value}<span className="text-sm text-zinc-500 ml-0.5">{suffix}</span></span>
                {diff !== undefined && <DiffBadge value={diff} suffix={diffSuffix || suffix} inverse={inverse} />}
            </div>
        </div>
    );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function AdminAchievementPage() {
    const [isExporting, setIsExporting] = useState(false);
    const [departmentFilter, setDepartmentFilter] = useState<string>("all");
    const [departments, setDepartments] = useState<any[]>([]);

    // 기간 필터
    const now = new Date();
    const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

    // 차트 데이터
    const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
    const [departmentStats, setDepartmentStats] = useState<any[]>([]);
    const [memberStats, setMemberStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // KPI 데이터
    const [kpiData, setKpiData] = useState<any>(null);
    const [kpiLoading, setKpiLoading] = useState(true);

    // 탭
    const [activeTab, setActiveTab] = useState<"overview" | "delay" | "priority">("overview");

    // 부서 목록 로드
    useEffect(() => {
        getDepartments().then(res => {
            if (res.success && res.data) setDepartments(res.data);
        });
    }, []);

    // 차트 데이터 로드
    useEffect(() => {
        (async () => {
            setLoading(true);
            const res = await getAchievementData(departmentFilter);
            if (res.success && res.data) {
                setMonthlyStats(res.data.monthlyStats);
                setDepartmentStats(res.data.departmentStats);
                setMemberStats(res.data.memberStats);
            }
            setLoading(false);
        })();
    }, [departmentFilter]);

    // KPI 데이터 로드
    useEffect(() => {
        (async () => {
            setKpiLoading(true);
            const res = await getKpiDashboard(yearMonth);
            if (res.success && res.data) setKpiData(res.data);
            setKpiLoading(false);
        })();
    }, [yearMonth]);

    // 기간 옵션 생성
    const periodOptions = useMemo(() => {
        const options = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
            options.push({ value: val, label });
        }
        return options;
    }, []);

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const result = await getExportData();
            if (!result.success || !result.data || result.data.length === 0) {
                alert(result.error || "출력할 데이터가 없습니다.");
                return;
            }
            const headers = Object.keys(result.data[0] || {}).join(",");
            const rows = result.data.map((row: any) => Object.values(row).map(val => `"${val}"`).join(","));
            const csvContent = [headers, ...rows].join("\n");
            const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `department_achievement_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch {
            alert("다운로드 중 오류가 발생했습니다.");
        } finally {
            setIsExporting(false);
        }
    };

    const comparisonData = departmentFilter === "all" ? departmentStats : memberStats;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* 헤더 */}
            <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">성과 대시보드</h1>
                    <p className="text-sm text-zinc-400">KPI 분석, 부서별 달성률, 지연 관리를 통합 제공합니다.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={yearMonth} onValueChange={setYearMonth}>
                        <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 text-white text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                            {periodOptions.map(o => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 text-white text-xs">
                            <SelectValue placeholder="부서 선택" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                            <SelectItem value="all">전체 부서</SelectItem>
                            {departments.map((dep) => (
                                <SelectItem key={dep.id} value={dep.name}>{dep.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        {isExporting ? "추출 중..." : "CSV"}
                    </Button>
                </div>
            </div>

            {/* KPI 카드 그리드 */}
            {kpiLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 h-24 animate-pulse" />
                    ))}
                </div>
            ) : kpiData && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <KpiCard icon={BarChart3} label="총 업무" value={kpiData.kpi.total} suffix="건" diff={kpiData.diff.total} diffSuffix="건" color="bg-blue-500/10 text-blue-400" />
                    <KpiCard icon={CheckCircle2} label="완료" value={kpiData.kpi.completed} suffix="건" diff={kpiData.diff.completed} diffSuffix="건" color="bg-emerald-500/10 text-emerald-400" />
                    <KpiCard icon={Award} label="달성률" value={kpiData.kpi.rate} suffix="%" diff={kpiData.diff.rate} diffSuffix="%p" color="bg-indigo-500/10 text-indigo-400" />
                    <KpiCard icon={AlertTriangle} label="지연" value={kpiData.kpi.delayed} suffix="건" diff={kpiData.diff.delayed} diffSuffix="건" inverse color="bg-red-500/10 text-red-400" />
                    <KpiCard icon={TrendingUp} label="기여도" value={kpiData.kpi.totalContribution} suffix="점" diff={kpiData.diff.contribution} diffSuffix="점" color="bg-amber-500/10 text-amber-400" />
                    <KpiCard icon={Shield} label="기한 준수율" value={kpiData.kpi.timelinessRate} suffix="%" color="bg-purple-500/10 text-purple-400" />
                </div>
            )}

            {/* 자동 요약 */}
            {kpiData?.summary && kpiData.summary.length > 0 && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-indigo-400" />
                        <span className="text-xs font-semibold text-indigo-400">자동 분석 요약</span>
                    </div>
                    <div className="space-y-1">
                        {kpiData.summary.map((line: string, i: number) => (
                            <p key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                                <ChevronRight className="h-3 w-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                                {line}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* 탭 네비게이션 */}
            <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 w-fit">
                {[
                    { key: "overview" as const, label: "종합 분석", icon: BarChart3 },
                    { key: "delay" as const, label: "지연 관리", icon: AlertTriangle },
                    { key: "priority" as const, label: "우선순위 분석", icon: Zap },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            activeTab === tab.key
                                ? "bg-indigo-600/20 text-indigo-400"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                    >
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 탭 콘텐츠 */}
            {activeTab === "overview" && (
                <>
                    {/* 차트 영역 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl min-h-[400px]">
                            {loading ? (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />데이터 로딩 중...
                                </div>
                            ) : (
                                <DeptMonthlyChart data={monthlyStats} departmentFilter={departmentFilter} />
                            )}
                        </div>
                        <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl min-h-[400px]">
                            {loading ? (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />데이터 로딩 중...
                                </div>
                            ) : (
                                <DeptComparisonChart data={comparisonData} departmentFilter={departmentFilter} />
                            )}
                        </div>
                    </div>

                    {/* Top 기여자 + Top 부서 */}
                    {kpiData && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top 5 기여자 */}
                            <div className="bg-zinc-900/40 p-5 border border-zinc-800 rounded-xl">
                                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                    <Award className="h-4 w-4 text-amber-400" /> Top 5 기여자
                                </h3>
                                <div className="space-y-2">
                                    {kpiData.topContributors.map((c: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50">
                                            <span className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-zinc-500"}`}>
                                                {i + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-white">{c.name}</div>
                                                <div className="text-[10px] text-zinc-500">{c.dept}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-amber-400">{c.contribution}점</div>
                                                <div className="text-[10px] text-zinc-500">{c.completed}/{c.total} ({c.rate}%)</div>
                                            </div>
                                        </div>
                                    ))}
                                    {kpiData.topContributors.length === 0 && (
                                        <p className="text-xs text-zinc-500 text-center py-4">데이터 없음</p>
                                    )}
                                </div>
                            </div>

                            {/* Top 5 부서 */}
                            <div className="bg-zinc-900/40 p-5 border border-zinc-800 rounded-xl">
                                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-400" /> 부서별 달성률 랭킹
                                </h3>
                                <div className="space-y-2">
                                    {kpiData.topDepartments.map((d: any, i: number) => (
                                        <div key={i} className="p-2 rounded-lg bg-zinc-800/50">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-white">{d.name}</span>
                                                <span className={`text-xs font-bold ${d.rate >= 80 ? "text-emerald-400" : d.rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                                                    {d.rate}%
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${d.rate >= 80 ? "bg-emerald-500" : d.rate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                                                        style={{ width: `${d.rate}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-zinc-500 w-14 text-right">{d.done}/{d.total}건</span>
                                            </div>
                                        </div>
                                    ))}
                                    {kpiData.topDepartments.length === 0 && (
                                        <p className="text-xs text-zinc-500 text-center py-4">데이터 없음</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 복합 성과표 */}
                    <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl">
                        {loading ? (
                            <div className="w-full flex items-center justify-center text-zinc-500 py-12">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />데이터 로딩 중...
                            </div>
                        ) : (
                            <MemberContributionTable
                                data={departmentFilter === "all" ? memberStats : memberStats}
                                departmentFilter={departmentFilter}
                            />
                        )}
                    </div>
                </>
            )}

            {activeTab === "delay" && kpiData && (
                <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        지연 업무 상세 ({kpiData.delayedTasks.length}건)
                    </h3>
                    {kpiData.delayedTasks.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm text-zinc-400">지연된 업무가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-zinc-400 border-b border-zinc-700">
                                        <th className="text-left py-2 px-3">업무</th>
                                        <th className="text-left py-2 px-3">담당자</th>
                                        <th className="text-left py-2 px-3">부서</th>
                                        <th className="text-center py-2 px-3">우선순위</th>
                                        <th className="text-center py-2 px-3">마감일</th>
                                        <th className="text-center py-2 px-3">지연일</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {kpiData.delayedTasks.map((t: any, i: number) => (
                                        <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                            <td className="py-2.5 px-3 text-white font-medium max-w-[200px] truncate">{t.title}</td>
                                            <td className="py-2.5 px-3 text-zinc-300">{t.assignees}</td>
                                            <td className="py-2.5 px-3 text-zinc-400">{t.department}</td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[t.priority] || "text-zinc-400 bg-zinc-400/10"}`}>
                                                    {t.priority}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-zinc-400">{t.dueDate}</td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className={`font-bold ${t.delayDays >= 7 ? "text-red-400" : t.delayDays >= 3 ? "text-orange-400" : "text-amber-400"}`}>
                                                    D+{t.delayDays}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "priority" && kpiData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpiData.priorityStats.map((p: any) => {
                        const colors = PRIORITY_COLORS[p.priority] || "text-zinc-400 bg-zinc-400/10";
                        return (
                            <div key={p.priority} className="bg-zinc-900/40 p-5 border border-zinc-800 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`px-2.5 py-1 rounded text-xs font-semibold ${colors}`}>
                                        {p.priority}
                                    </span>
                                    <span className="text-lg font-bold text-white">{p.total}<span className="text-xs text-zinc-500">건</span></span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-zinc-400">완료</span>
                                        <span className="text-emerald-400 font-medium">{p.done}건 ({p.rate}%)</span>
                                    </div>
                                    <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${p.rate >= 80 ? "bg-emerald-500" : p.rate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                                            style={{ width: `${p.rate}%` }}
                                        />
                                    </div>
                                    {p.delayed > 0 && (
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-zinc-400">지연</span>
                                            <span className="text-red-400 font-medium">{p.delayed}건</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {kpiData.priorityStats.length === 0 && (
                        <div className="col-span-full text-center py-12 text-zinc-500 text-sm">
                            해당 기간에 데이터가 없습니다.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
