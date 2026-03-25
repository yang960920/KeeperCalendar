"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MonthlyBarChart } from "@/components/MonthlyBarChart";
import { MonthlyLineChart } from "@/components/MonthlyLineChart";
import { CategoryBarChart } from "@/components/CategoryBarChart";
import { TaskForm } from "@/components/TaskForm";
import { MonthlyTaskList } from "@/components/MonthlyTaskList";
import { MonthlySummaryWidget } from "@/components/MonthlySummaryWidget";
import { AIChatAssistant } from "@/components/AIChatAssistant";
import { useTaskStore } from "@/store/useTaskStore";
import { useStore } from "@/hooks/useStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Home() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(String(Math.max(2026, currentDate.getFullYear())));
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));

  // 상태에서 Tasks를 받아와서 현재 월의 통계로 넘김
  const tasks = useStore(useTaskStore, (state) => state.tasks) || [];
  const targetPrefix = `${selectedYear}-${selectedMonth.padStart(2, "0")}`;
  const currentMonthTasks = tasks.filter(t => t.date.startsWith(targetPrefix));

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
        {/* 상단: 월간 통계 요약 위젯 (기존 히트맵 대체) */}
        <section>
          <MonthlySummaryWidget
            year={selectedYear}
            month={selectedMonth}
            tasks={currentMonthTasks}
          />
        </section>

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
