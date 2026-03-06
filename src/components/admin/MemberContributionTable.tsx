"use client";

import React, { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface MemberStat {
    name: string;
    total: number;
    done: number;
    rate: number;
    contribution: number;
    totalPlanned: number;
}

interface MemberContributionTableProps {
    data: MemberStat[];
    departmentFilter: string;
}

type SortKey = "contribution" | "rate" | "name" | "totalPlanned";

const getVolumeBadge = (totalPlanned: number) => {
    if (totalPlanned >= 71) return { label: "고밀도", color: "bg-red-500/20 text-red-400 border-red-500/30", emoji: "🔴" };
    if (totalPlanned >= 31) return { label: "다량", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", emoji: "🟠" };
    if (totalPlanned >= 11) return { label: "보통", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", emoji: "🟡" };
    return { label: "경량", color: "bg-green-500/20 text-green-400 border-green-500/30", emoji: "🟢" };
};

const getRateColor = (rate: number) => {
    if (rate >= 80) return "#22c55e";
    if (rate >= 50) return "#3b82f6";
    if (rate >= 30) return "#eab308";
    return "#ef4444";
};

export const MemberContributionTable = ({ data, departmentFilter }: MemberContributionTableProps) => {
    const [sortKey, setSortKey] = useState<SortKey>("contribution");
    const [sortAsc, setSortAsc] = useState(false);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortAsc(!sortAsc);
        } else {
            setSortKey(key);
            setSortAsc(false);
        }
    };

    const sorted = [...data].sort((a, b) => {
        const mul = sortAsc ? 1 : -1;
        if (sortKey === "name") return mul * a.name.localeCompare(b.name);
        return mul * ((a[sortKey] as number) - (b[sortKey] as number));
    });

    const title = departmentFilter === "all"
        ? "전체 직원 복합 성과표"
        : `${departmentFilter} 소속 직원 복합 성과표`;

    if (data.length === 0) {
        return (
            <div className="w-full flex items-center justify-center text-zinc-500 py-12">
                해당 조건의 데이터가 없습니다.
            </div>
        );
    }

    return (
        <div className="w-full">
            <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-900/60 hover:bg-zinc-900/60 border-zinc-800">
                            <TableHead className="text-zinc-300 w-[40px] text-center">#</TableHead>
                            <TableHead>
                                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white -ml-3 gap-1" onClick={() => handleSort("name")}>
                                    사원명 <ArrowUpDown className="h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[200px]">
                                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white -ml-3 gap-1" onClick={() => handleSort("rate")}>
                                    달성률 <ArrowUpDown className="h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-center">
                                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white gap-1" onClick={() => handleSort("contribution")}>
                                    공헌도 <ArrowUpDown className="h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-center">
                                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white gap-1" onClick={() => handleSort("totalPlanned")}>
                                    업무등급 <ArrowUpDown className="h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-center text-zinc-300">업무 현황</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sorted.map((member, idx) => {
                            const badge = getVolumeBadge(member.totalPlanned);
                            return (
                                <TableRow key={member.name} className="border-zinc-800 hover:bg-zinc-800/40">
                                    <TableCell className="text-center text-zinc-500 font-mono text-sm">
                                        {idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-white">
                                        {member.name}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${member.rate}%`,
                                                        backgroundColor: getRateColor(member.rate),
                                                    }}
                                                />
                                            </div>
                                            <span className="text-sm font-semibold text-zinc-300 w-[40px] text-right">
                                                {member.rate}%
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-lg font-bold text-white">
                                            {member.contribution}
                                        </span>
                                        <span className="text-xs text-zinc-500 ml-1">점</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                                            {badge.emoji} {badge.label}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-zinc-400">
                                        <span className="text-green-400 font-medium">{member.done}</span>
                                        <span className="mx-1">/</span>
                                        <span>{member.total}</span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
