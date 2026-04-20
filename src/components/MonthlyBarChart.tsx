"use client";

import React, { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { useStore } from "@/hooks/useStore";
import { getMonthlyStats } from "@/lib/statistics";
import { useTheme } from "next-themes";

interface MonthlyBarChartProps {
    year?: string;
    tasks?: Task[];
}

export const MonthlyBarChart = ({ year, tasks: tasksProp }: MonthlyBarChartProps) => {
    const { resolvedTheme } = useTheme();
    const storeTasks = useStore(useTaskStore, (state) => state.tasks) || [];
    const tasks = tasksProp ?? storeTasks;

    const data = useMemo(() => {
        return getMonthlyStats(tasks, year);
    }, [tasks, year]);

    const primaryColor =
        resolvedTheme === "dark" ? "hsl(var(--primary))" : "hsl(var(--primary))";

    // 만약 데이터가 없으면 안내 문구 표시
    if (data.length === 0) {
        return (
            <div className="w-full h-[300px] flex items-center justify-center bg-card text-muted-foreground rounded-xl border">
                월별 데이터가 없습니다. Task를 추가해보세요.
            </div>
        );
    }

    return (
        <div className="w-full p-4 bg-card text-card-foreground rounded-xl border shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-center sm:text-left">
                {year ? `${year}년` : '월별'} 달성률 (막대)
            </h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 10,
                            left: -20,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#a1a1aa", fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#a1a1aa", fontSize: 12 }}
                            domain={[0, 100]}
                            tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip
                            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                                color: "hsl(var(--foreground))",
                            }}
                            formatter={(value, name) => {
                                if (name === "rate") return [`${value}%`, "달성률"];
                                return [value, name];
                            }}
                        />
                        <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        entry.rate >= 80
                                            ? "#39d353"
                                            : entry.rate >= 50
                                                ? "#2ea043"
                                                : "#1a7f37"
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
