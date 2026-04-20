"use client";

import React, { useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { useStore } from "@/hooks/useStore";
import { getMonthlyStats } from "@/lib/statistics";

interface MonthlyLineChartProps {
    year?: string;
    tasks?: Task[];
}

export const MonthlyLineChart = ({ year, tasks: tasksProp }: MonthlyLineChartProps) => {
    const storeTasks = useStore(useTaskStore, (state) => state.tasks) || [];
    const tasks = tasksProp ?? storeTasks;

    const data = useMemo(() => {
        return getMonthlyStats(tasks, year);
    }, [tasks, year]);

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
                {year ? `${year}년` : '월별'} 달성률 추이 (선)
            </h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
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
                        {/* 목표선 (Optional: 80%) */}
                        <ReferenceLine
                            y={80}
                            stroke="#a1a1aa"
                            strokeDasharray="3 3"
                            label={{
                                position: "insideTopLeft",
                                value: "목표 (80%)",
                                fill: "#a1a1aa",
                                fontSize: 12,
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="rate"
                            stroke="#39d353"
                            strokeWidth={3}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
