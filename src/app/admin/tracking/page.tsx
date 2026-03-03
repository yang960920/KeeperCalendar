"use client";

import React, { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getTrackingData } from "@/app/actions/tracking";

export default function AdminTrackingPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const result = await getTrackingData();
            if (result.success && result.data) {
                setTasks(result.data.tasks);
                setLogs(result.data.logs);
            } else {
                console.error(result.error);
            }
            setLoading(false);
        }
        loadData();
    }, []);

    // 검색어 필터링
    const [searchTerm, setSearchTerm] = useState("");
    const filteredTasks = tasks.filter(t =>
        t.user.includes(searchTerm) ||
        t.title.includes(searchTerm) ||
        t.department.includes(searchTerm)
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">진행도 확인 및 로그 (Tracking & Logs)</h1>
                    <p className="text-zinc-400">개인/부서별 상세 진행 상황과 전체 활동 로그를 모니터링합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* 좌측: 진행도 트래킹 (2/3 영역) */}
                <div className="xl:col-span-2 space-y-4 bg-zinc-900/40 p-6 border border-zinc-800 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-white">현황 상세 (개인별/부서별)</h2>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                            <Input
                                placeholder="사용자 이름, 태스크 검색..."
                                className="pl-9 bg-zinc-800 border-zinc-700 text-sm text-white focus-visible:ring-indigo-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rounded-md border border-zinc-800 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-zinc-800/50">
                                <TableRow className="border-zinc-800 hover:bg-transparent">
                                    <TableHead className="text-zinc-400">담당자</TableHead>
                                    <TableHead className="text-zinc-400">부서</TableHead>
                                    <TableHead className="text-zinc-400">진행업무</TableHead>
                                    <TableHead className="text-zinc-400">상태</TableHead>
                                    <TableHead className="text-zinc-400">달성률</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-zinc-500 p-4">데이터를 불러오는 중입니다...</TableCell>
                                    </TableRow>
                                )}
                                {!loading && filteredTasks.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-zinc-500 p-4">조건에 맞는 검색 결과가 없습니다.</TableCell>
                                    </TableRow>
                                )}
                                {!loading && filteredTasks.map((task) => (
                                    <TableRow key={task.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                        <TableCell className="font-medium text-white">{task.user}</TableCell>
                                        <TableCell className="text-zinc-300">{task.department}</TableCell>
                                        <TableCell className="text-zinc-300 truncate max-w-[200px]">{task.title}</TableCell>
                                        <TableCell>
                                            <Badge variant={task.status === "완료" ? "default" : "secondary"}
                                                className={task.status === "완료" ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"}>
                                                {task.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-zinc-300">
                                                <div className="w-full bg-zinc-800 rounded-full h-2">
                                                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${task.progress}%` }} />
                                                </div>
                                                <span className="text-xs w-8 text-right">{task.progress}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* 우측: 활동 로그 (1/3 영역) */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 bg-zinc-800/50 border-b border-zinc-800">
                        <h2 className="text-base font-semibold text-white">활동 로그 (Activity Log)</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading && <p className="text-sm text-zinc-500 text-center">로그를 불러오는 중입니다...</p>}
                        {!loading && logs.length === 0 && <p className="text-sm text-zinc-500 text-center">기록된 활동 로그가 없습니다.</p>}
                        {!loading && logs.map((log) => (
                            <div key={log.id} className="flex gap-4 group">
                                <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20 group-hover:ring-indigo-500/40 transition-all" />
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm text-zinc-300 break-words line-clamp-2">
                                        <span className="font-medium text-emerald-400">{log.user}</span>
                                        {"님이 "}
                                        <span className="font-medium text-white">{log.action}</span>
                                        {"을(를) 수행했습니다."}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1">{log.detail}</p>
                                    <span className="block text-xs text-zinc-600 mt-2">{log.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
