"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { getExportData } from "@/app/actions/export";
import { getDepartments } from "@/app/actions/employee";
import { getAchievementData } from "@/app/actions/achievement";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeptMonthlyChart } from "@/components/admin/DeptMonthlyChart";
import { DeptComparisonChart } from "@/components/admin/DeptComparisonChart";

export default function AdminAchievementPage() {
    const [isExporting, setIsExporting] = useState(false);
    const [departmentFilter, setDepartmentFilter] = useState<string>("all");
    const [departments, setDepartments] = useState<any[]>([]);

    // 차트 데이터
    const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
    const [departmentStats, setDepartmentStats] = useState<any[]>([]);
    const [memberStats, setMemberStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 부서 목록 로드
    useEffect(() => {
        async function loadDepartments() {
            const res = await getDepartments();
            if (res.success && res.data) {
                setDepartments(res.data);
            }
        }
        loadDepartments();
    }, []);

    // 차트 데이터 로드 (부서 필터 변경 시 갱신)
    useEffect(() => {
        async function loadChartData() {
            setLoading(true);
            const res = await getAchievementData(departmentFilter);
            if (res.success && res.data) {
                setMonthlyStats(res.data.monthlyStats);
                setDepartmentStats(res.data.departmentStats);
                setMemberStats(res.data.memberStats);
            }
            setLoading(false);
        }
        loadChartData();
    }, [departmentFilter]);

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const result = await getExportData();

            if (!result.success || !result.data || result.data.length === 0) {
                alert(result.error || "출력할 데이터가 없습니다.");
                return;
            }

            const headers = Object.keys(result.data[0] || {}).join(",");
            const rows = result.data.map((row: any) =>
                Object.values(row).map(val => `"${val}"`).join(",")
            );
            const csvContent = [headers, ...rows].join("\n");
            const bom = "\uFEFF";
            const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `department_achievement_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export error:", error);
            alert("다운로드 중 오류가 발생했습니다.");
        } finally {
            setIsExporting(false);
        }
    };

    // 우측 차트: 전체 부서 모드 → 부서별 비교, 특정 부서 모드 → 인원별 비교
    const comparisonData = departmentFilter === "all" ? departmentStats : memberStats;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">부서별 달성률 (Department Achievement)</h1>
                    <p className="text-zinc-400">전체 부서의 월별 목표 달성률과 주요 통계를 확인합니다.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
                            <SelectValue placeholder="부서 선택" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                            <SelectItem value="all">전체 부서</SelectItem>
                            {departments.map((dep) => (
                                <SelectItem key={dep.id} value={dep.name}>
                                    {dep.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        variant="outline"
                        className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {isExporting ? "추출 중..." : "엑셀 다운로드 (CSV)"}
                    </Button>
                </div>
            </div>

            {/* 차트 영역 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl min-h-[400px]">
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                                데이터 로딩 중...
                            </div>
                        </div>
                    ) : (
                        <DeptMonthlyChart data={monthlyStats} departmentFilter={departmentFilter} />
                    )}
                </div>
                <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl min-h-[400px]">
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                                데이터 로딩 중...
                            </div>
                        </div>
                    ) : (
                        <DeptComparisonChart data={comparisonData} departmentFilter={departmentFilter} />
                    )}
                </div>
            </div>
        </div>
    );
}

