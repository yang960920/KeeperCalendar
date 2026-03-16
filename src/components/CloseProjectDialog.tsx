"use client";

import React, { useState, useMemo } from "react";
import { XCircle, Upload, FileText, CheckCircle2, PauseCircle, Ban, Loader2, Download } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { useProjectStore, Project } from "@/store/useProjectStore";
import { useStore } from "@/hooks/useStore";
import { closeProject } from "@/app/actions/project";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type CloseStatus = "COMPLETED" | "ON_HOLD" | "CANCELLED";

const CLOSE_OPTIONS: { value: CloseStatus; label: string; icon: React.ReactNode; reason: string }[] = [
    { value: "COMPLETED", label: "정상 완료", icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, reason: "정상 완료" },
    { value: "ON_HOLD", label: "보류", icon: <PauseCircle className="h-4 w-4 text-amber-500" />, reason: "보류" },
    { value: "CANCELLED", label: "취소", icon: <Ban className="h-4 w-4 text-red-500" />, reason: "취소" },
];

interface CloseProjectDialogProps {
    projectId: string;
    projectTitle: string;
    userId: string;
}

export function CloseProjectDialog({ projectId, projectTitle, userId }: CloseProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<CloseStatus>("COMPLETED");
    const [summary, setSummary] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");

    const tasks = useStore(useTaskStore, (s) => s.tasks) || [];
    const updateProject = useProjectStore((s) => s.updateProject);

    // 프로젝트 업무 통계 자동 집계
    const stats = useMemo(() => {
        const projectTasks = tasks.filter(t => t.projectId === projectId);
        const completed = projectTasks.filter(t => t.done >= t.planned && t.planned > 0);
        const delayed = projectTasks.filter(t => {
            if (!t.endDate) return false;
            const isCompleted = t.done >= t.planned && t.planned > 0;
            return new Date(t.endDate) < new Date() && !isCompleted;
        });

        const assigneeSet = new Set<string>();
        projectTasks.forEach(t => {
            if (t.assigneeName) assigneeSet.add(t.assigneeName);
            t.assigneeNames?.forEach(n => assigneeSet.add(n));
        });

        return {
            total: projectTasks.length,
            completed: completed.length,
            delayed: delayed.length,
            inProgress: projectTasks.length - completed.length,
            completionRate: projectTasks.length > 0 ? Math.round((completed.length / projectTasks.length) * 100) : 0,
            participants: assigneeSet.size,
        };
    }, [tasks, projectId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            if (f.size > 10 * 1024 * 1024) {
                alert("파일 크기는 10MB 이하만 가능합니다.");
                return;
            }
            setFile(f);
        }
    };

    const handleSubmit = async () => {
        if (!summary.trim()) {
            alert("종료 요약을 입력해주세요.");
            return;
        }

        setIsSubmitting(true);

        try {
            let reportUrl: string | undefined;
            let reportName: string | undefined;

            // 파일 업로드 (Vercel Blob)
            if (file) {
                setUploadProgress("파일 업로드 중...");
                const res = await fetch(`/api/upload?filename=reports/${projectId}/${file.name}`, {
                    method: "POST",
                    body: file,
                });
                if (!res.ok) throw new Error("파일 업로드 실패");
                const blob = await res.json();
                reportUrl = blob.url;
                reportName = file.name;
            }

            setUploadProgress("프로젝트 종료 처리 중...");

            const closeReason = CLOSE_OPTIONS.find(o => o.value === status)?.reason || status;

            const result = await closeProject({
                projectId,
                userId,
                status,
                closeReason,
                closeSummary: summary,
                closeReportUrl: reportUrl,
                closeReportName: reportName,
            });

            if (result.success) {
                // Zustand 스토어 업데이트
                updateProject(projectId, {
                    status,
                    closedAt: new Date().toISOString(),
                    closeReason,
                    closeSummary: summary,
                    closeReportUrl: reportUrl,
                    closeReportName: reportName,
                });

                setOpen(false);
                alert("프로젝트가 종료되었습니다.");
                window.location.reload();
            } else {
                alert(result.error || "프로젝트 종료에 실패했습니다.");
            }
        } catch (error) {
            console.error("프로젝트 종료 실패:", error);
            alert("프로젝트 종료 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
            setUploadProgress("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5">
                    <XCircle className="h-3.5 w-3.5" />
                    프로젝트 종료
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-destructive" />
                        프로젝트 종료
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* 프로젝트명 */}
                    <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">프로젝트</p>
                        <p className="font-semibold">{projectTitle}</p>
                    </div>

                    {/* 자동 통계 */}
                    <div className="bg-muted/30 rounded-lg p-3 border">
                        <p className="text-xs text-muted-foreground font-medium mb-2">📊 자동 집계 현황</p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-lg font-bold">{stats.total}</p>
                                <p className="text-[10px] text-muted-foreground">총 업무</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-emerald-500">{stats.completionRate}%</p>
                                <p className="text-[10px] text-muted-foreground">완료율</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-red-500">{stats.delayed}</p>
                                <p className="text-[10px] text-muted-foreground">지연</p>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground text-center">
                            완료 {stats.completed}건 / 진행중 {stats.inProgress}건 · 참여자 {stats.participants}명
                        </div>
                    </div>

                    {/* 종료 사유 */}
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">종료 사유</label>
                        <Select value={status} onValueChange={(v) => setStatus(v as CloseStatus)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CLOSE_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        <span className="flex items-center gap-2">
                                            {o.icon} {o.label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 종료 요약 */}
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">종료 요약 <span className="text-red-500">*</span></label>
                        <Textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="프로젝트 성과, 주요 결과물, 특이사항 등을 작성해주세요..."
                            rows={4}
                            className="resize-none"
                        />
                    </div>

                    {/* 파일 첨부 */}
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">보고서 첨부 (선택)</label>
                        <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                            {file ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        <span className="truncate max-w-[200px]">{file.name}</span>
                                        <span className="text-muted-foreground text-xs">
                                            ({(file.size / 1024 / 1024).toFixed(1)}MB)
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setFile(null)}
                                        className="text-muted-foreground text-xs"
                                    >
                                        제거
                                    </Button>
                                </div>
                            ) : (
                                <label className="cursor-pointer block">
                                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                                    <p className="text-xs text-muted-foreground">
                                        파일을 선택하세요 (최대 10MB)
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        PDF, DOC, HWP, PPT, 이미지 등
                                    </p>
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        accept=".pdf,.doc,.docx,.hwp,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* 경고 */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                        <p className="text-xs text-red-500 font-medium">⚠️ 주의사항</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            종료된 프로젝트는 더 이상 업무를 추가하거나 수정할 수 없습니다.
                        </p>
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                            취소
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !summary.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    {uploadProgress || "처리 중..."}
                                </>
                            ) : (
                                "프로젝트 종료"
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// 종료된 프로젝트 배너 컴포넌트
export function ClosedProjectBanner({ project }: { project: Project }) {
    if (!project.status || project.status === "ACTIVE") return null;

    const statusConfig: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
        COMPLETED: { label: "정상 완료", bg: "bg-emerald-500/10 border-emerald-500/30", icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
        ON_HOLD: { label: "보류", bg: "bg-amber-500/10 border-amber-500/30", icon: <PauseCircle className="h-4 w-4 text-amber-500" /> },
        CANCELLED: { label: "취소", bg: "bg-red-500/10 border-red-500/30", icon: <Ban className="h-4 w-4 text-red-500" /> },
    };

    const config = statusConfig[project.status] || statusConfig.COMPLETED;

    return (
        <div className={`${config.bg} border rounded-lg p-4 mb-4`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {config.icon}
                    <span className="font-semibold text-sm">프로젝트 {config.label}</span>
                    {project.closedAt && (
                        <span className="text-xs text-muted-foreground">
                            · {new Date(project.closedAt).toLocaleDateString("ko-KR")}
                        </span>
                    )}
                </div>
                {project.closeReportUrl && (
                    <a
                        href={project.closeReportUrl}
                        download={project.closeReportName || "report"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                    >
                        <Download className="h-3.5 w-3.5" />
                        {project.closeReportName || "보고서 다운로드"}
                    </a>
                )}
            </div>
            {project.closeSummary && (
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{project.closeSummary}</p>
            )}
        </div>
    );
}
