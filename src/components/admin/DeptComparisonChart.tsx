"use client";

import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList,
} from "recharts";

interface ComparisonData {
    name: string;
    total: number;
    done: number;
    rate: number;
}

interface DeptComparisonChartProps {
    data: ComparisonData[];
    departmentFilter: string;
}

export const DeptComparisonChart = ({ data, departmentFilter }: DeptComparisonChartProps) => {
    if (data.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                해당 조건의 비교 데이터가 없습니다.
            </div>
        );
    }

    const title = departmentFilter === "all"
        ? "부서별 달성률 비교"
        : `${departmentFilter} 소속 직원별 달성률`;

    const getBarColor = (rate: number) => {
        if (rate >= 80) return "#22c55e";
        if (rate >= 50) return "#3b82f6";
        if (rate >= 30) return "#eab308";
        return "#ef4444";
    };

    return (
        <div className="w-full h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 10, right: 40, left: 10, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                        <XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#a1a1aa", fontSize: 12 }}
                            domain={[0, 100]}
                            tickFormatter={(val) => `${val}%`}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#d4d4d8", fontSize: 13, fontWeight: 500 }}
                            width={80}
                        />
                        <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.05)" }}
                            contentStyle={{
                                backgroundColor: "#18181b",
                                borderColor: "#3f3f46",
                                borderRadius: "8px",
                                color: "#fff",
                            }}
                            formatter={((value: any) => [`${value}%`, "달성률"]) as any}
                        />
                        <Bar dataKey="rate" radius={[0, 6, 6, 0]} maxBarSize={28}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getBarColor(entry.rate)} />
                            ))}
                            <LabelList
                                dataKey="rate"
                                position="right"
                                formatter={((val: any) => `${val}%`) as any}
                                style={{ fill: "#d4d4d8", fontSize: 12, fontWeight: 600 }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
