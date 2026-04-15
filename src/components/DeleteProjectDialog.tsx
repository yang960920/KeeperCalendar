"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { deleteProject } from "@/app/actions/project";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteProjectDialogProps {
    projectId: string;
    projectTitle: string;
}

export function DeleteProjectDialog({ projectId, projectTitle }: DeleteProjectDialogProps) {
    const router = useRouter();
    const removeFromStore = useProjectStore((s) => s.deleteProject);
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = confirmText.trim() === projectTitle.trim() && !isSubmitting;

    const handleDelete = async () => {
        if (!canSubmit) return;
        setIsSubmitting(true);
        try {
            const res = await deleteProject({ projectId });
            if (res.success) {
                removeFromStore(projectId);
                setOpen(false);
                router.push("/projects");
            } else {
                alert(res.error || "삭제에 실패했습니다.");
            }
        } catch (err) {
            console.error(err);
            alert("서버 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmText(""); }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    삭제
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-500">
                        <AlertTriangle className="h-5 w-5" />
                        프로젝트 삭제
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 py-2 text-sm">
                    <p className="text-muted-foreground">
                        이 작업은 되돌릴 수 없습니다. 프로젝트가 <span className="font-semibold text-foreground">완전히 삭제</span>되며, 관련 활동 로그·보고서·리뷰도 함께 제거됩니다.
                    </p>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                        <p className="font-semibold">삭제 조건</p>
                        <ul className="list-disc list-inside space-y-0.5">
                            <li>생성 후 24시간 이내만 삭제 가능</li>
                            <li>등록된 업무가 없어야 함 (있으면 서버에서 거절)</li>
                            <li>책임자만 삭제 가능</li>
                        </ul>
                    </div>
                    <div className="space-y-1.5 pt-1">
                        <Label htmlFor="confirm-delete" className="text-xs">
                            확인을 위해 프로젝트 이름(<span className="font-mono text-foreground">{projectTitle}</span>)을 입력해주세요.
                        </Label>
                        <Input
                            id="confirm-delete"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={projectTitle}
                            autoComplete="off"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        취소
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!canSubmit}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> 삭제 중...</>
                        ) : (
                            <><Trash2 className="h-4 w-4 mr-1" /> 삭제</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
