"use client";

import React, { useEffect, useState, useMemo } from "react";
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

interface MonthlyData {
    month: string;
    label: string;
    total: number;
    done: number;
    rate: number;
}

interface DeptMonthlyChartProps {
    data: MonthlyData[];
    departmentFilter: string;
}

export const DeptMonthlyChart = ({ data, departmentFilter }: DeptMonthlyChartProps) => {
    if (data.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                해당 조건의 월별 데이터가 없습니다.
            </div>
        );
    }

    const title = departmentFilter === "all"
        ? "전체 부서 월별 달성률"
        : `${departmentFilter} 월별 달성률`;

    return (
        <div className="w-full h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                        <XAxis
                            dataKey="label"
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
                            cursor={{ fill: "rgba(255,255,255,0.05)" }}
                            contentStyle={{
                                backgroundColor: "#18181b",
                                borderColor: "#3f3f46",
                                borderRadius: "8px",
                                color: "#fff",
                            }}
                            formatter={((value: any, name: string) => {
                                if (name === "rate") return [`${value}%`, "달성률"];
                                return [value, name];
                            }) as any}
                        />
                        <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={40}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        entry.rate >= 80
                                            ? "#22c55e"
                                            : entry.rate >= 50
                                                ? "#eab308"
                                                : "#ef4444"
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
