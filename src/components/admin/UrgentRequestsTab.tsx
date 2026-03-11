"use client";

import React, { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
    getUrgentRequests,
    adminApproveUrgent,
    adminRejectUrgent,
} from "@/app/actions/urgent";

interface UrgentTask {
    id: string;
    title: string;
    urgencyStatus: string;
    createdAt: string;
    assignee?: { name: string; department?: { name: string } } | null;
    assignees?: { name: string }[];
    project?: { name: string } | null;
    attachments?: { id: string; name: string; url: string }[];
}

export default function UrgentRequestsTab() {
    const [pendingTasks, setPendingTasks] = useState<UrgentTask[]>([]);
    const [approvedTasks, setApprovedTasks] = useState<UrgentTask[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const [pending, approved] = await Promise.all([
            getUrgentRequests("PENDING_ADMIN"),
            getUrgentRequests("APPROVED"),
        ]);
        if (pending.success) setPendingTasks(pending.data as any ?? []);
        if (approved.success) setApprovedTasks((approved.data as any ?? []).filter((t: any) => t.status === "DONE"));
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleApprove = async (taskId: string) => {
        const res = await adminApproveUrgent(taskId);
        if (res.success) {
            alert(res.message);
            loadData();
        }
    };

    const handleReject = async (taskId: string) => {
        if (!confirm("이 긴급 요청을 거절하시겠습니까?")) return;
        const res = await adminRejectUrgent(taskId);
        if (res.success) {
            alert(res.message);
            loadData();
        }
    };

    if (loading) return <div className="text-center py-8 text-zinc-500">로딩 중...</div>;

    return (
        <div className="space-y-8">
            {/* 미처리 긴급 요청 */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    🚨 긴급 요청 (승인 대기)
                    {pendingTasks.length > 0 && (
                        <Badge variant="destructive">{pendingTasks.length}</Badge>
                    )}
                </h3>

                {pendingTasks.length === 0 ? (
                    <p className="text-zinc-500 text-sm py-4">대기 중인 긴급 요청이 없습니다.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>업무명</TableHead>
                                <TableHead>요청자</TableHead>
                                <TableHead>부서</TableHead>
                                <TableHead>프로젝트</TableHead>
                                <TableHead>요청일</TableHead>
                                <TableHead className="text-center">처리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingTasks.map((task) => (
                                <TableRow key={task.id}>
                                    <TableCell className="font-medium text-white">{task.title}</TableCell>
                                    <TableCell>{task.assignee?.name || "미할당"}</TableCell>
                                    <TableCell>{task.assignee?.department?.name || "-"}</TableCell>
                                    <TableCell>{task.project?.name || "-"}</TableCell>
                                    <TableCell>{format(new Date(task.createdAt), "MM.dd HH:mm")}</TableCell>
                                    <TableCell className="text-center space-x-2">
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => handleApprove(task.id)}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            수락
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleReject(task.id)}
                                        >
                                            거절
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* 완료된 긴급 업무 (사후 검증) */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                    ✅ 완료된 긴급 업무 (사후 검증)
                </h3>

                {approvedTasks.length === 0 ? (
                    <p className="text-zinc-500 text-sm py-4">완료된 긴급 업무가 없습니다.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>업무명</TableHead>
                                <TableHead>담당자</TableHead>
                                <TableHead>프로젝트</TableHead>
                                <TableHead>첨부파일</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {approvedTasks.map((task) => (
                                <TableRow key={task.id}>
                                    <TableCell className="font-medium text-white">{task.title}</TableCell>
                                    <TableCell>{task.assignee?.name || "미할당"}</TableCell>
                                    <TableCell>{task.project?.name || "-"}</TableCell>
                                    <TableCell>
                                        {task.attachments && task.attachments.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {task.attachments.map((att) => (
                                                    <a
                                                        key={att.id}
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-blue-400 hover:text-blue-300 text-sm underline"
                                                    >
                                                        📎 {att.name}
                                                    </a>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-zinc-500 text-sm">없음</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
