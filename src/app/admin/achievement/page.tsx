"use client";

import React, { useState } from "react";
import { MonthlySummaryWidget } from "@/components/MonthlySummaryWidget";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { getExportData } from "@/app/actions/export";

export default function AdminAchievementPage() {
    const [isExporting, setIsExporting] = useState(false);

    // 현재 기준 연/월 (기본값)
    const currentYear = String(new Date().getFullYear());
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

    // 임시 더미 데이터 (추후 DB 연동 시 교체 예정)
    const mockTasks = Array.from({ length: 30 }, (_, i) => ({
        id: `mock-${i}`,
        date: `2024-03-${String(i + 1).padStart(2, "0")}`,
        title: `Dummy Task ${i + 1}`,
        category: "개발",
        planned: 10,
        done: Math.floor(Math.random() * 11),
        weight: 1,
    }));

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const result = await getExportData();

            if (!result.success || !result.data || result.data.length === 0) {
                alert(result.error || "출력할 데이터가 없습니다.");
                return;
            }

            // CSV 데이터 변환 (헤더 + 내용)
            const headers = Object.keys(result.data[0] || {}).join(",");
            const rows = result.data.map((row: any) =>
                Object.values(row).map(val => `"${val}"`).join(",")
            );

            const csvContent = [headers, ...rows].join("\n");

            // BOM 추가 (Excel 한글 깨짐 방지)
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">부서별 달성률 (Department Achievement)</h1>
                    <p className="text-zinc-400">전체 부서의 월별 목표 달성률과 주요 통계를 확인합니다.</p>
                </div>
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

            <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl">
                <MonthlySummaryWidget tasks={mockTasks} year={currentYear} month={currentMonth} />
            </div>

            {/* 추가적인 부서별 막대그래프나 선형 그래프가 들어갈 공간 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl min-h-[400px] flex items-center justify-center">
                    <p className="text-zinc-500">월별 비교 차트 렌더링 영역 (Recharts)</p>
                </div>
                <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl min-h-[400px] flex items-center justify-center">
                    <p className="text-zinc-500">부서별 비교 차트 렌더링 영역 (Recharts)</p>
                </div>
            </div>
        </div>
    );
}
