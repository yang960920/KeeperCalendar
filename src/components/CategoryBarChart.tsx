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
import { getCategoryStats } from "@/lib/statistics";

interface CategoryBarChartProps {
    year?: string;
    month?: string;
    tasks?: Task[];
}

export const CategoryBarChart = ({ year, month, tasks: tasksProp }: CategoryBarChartProps) => {
    const storeTasks = useStore(useTaskStore, (state) => state.tasks) || [];
    const tasks = tasksProp ?? storeTasks;

    const data = useMemo(() => {
        return getCategoryStats(tasks, year, month).slice(0, 5); // 상위 5개만 표시
    }, [tasks, year, month]);

    if (data.length === 0) {
        return (
            <div className="w-full h-[300px] flex items-center justify-center bg-card text-muted-foreground rounded-xl border">
                카테고리 데이터가 없습니다.
            </div>
        );
    }

    return (
        <div className="w-full p-4 bg-card text-card-foreground rounded-xl border shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-center sm:text-left">
                {month ? `${month}월` : year ? `${year}년` : ''} 카테고리별 달성률 (Top 5)
            </h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{
                            top: 0,
                            right: 20,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                        <XAxis
                            type="number"
                            domain={[0, 100]}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `${val}%`}
                            tick={{ fill: "#a1a1aa", fontSize: 12 }}
                        />
                        <YAxis
                            type="category"
                            dataKey="category"
                            tickLine={false}
                            axisLine={false}
                            width={70}
                            tick={{ fill: "#a1a1aa", fontSize: 12 }}
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
                        <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={24}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill="#39d353"
                                    opacity={1 - index * 0.15} // 순위별로 점점 연하게
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
