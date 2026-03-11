"use client";

import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPendingReviews, submitReview } from "@/app/actions/peerReview";

interface PendingProject {
    projectId: string;
    projectName: string;
    endDate: string;
    participants: {
        id: string;
        name: string;
        reviewed: boolean;
    }[];
}

interface PeerReviewDialogProps {
    userId: string;
}

export default function PeerReviewDialog({ userId }: PeerReviewDialogProps) {
    const [open, setOpen] = useState(false);
    const [projects, setProjects] = useState<PendingProject[]>([]);
    const [currentProject, setCurrentProject] = useState<PendingProject | null>(null);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!userId) return;
        async function check() {
            const res = await getPendingReviews(userId);
            if (res.success && res.data && res.data.length > 0) {
                setProjects(res.data);
                setCurrentProject(res.data[0]);
                // 초기 별점 3
                const init: Record<string, number> = {};
                res.data[0].participants.forEach(p => {
                    if (!p.reviewed) init[p.id] = 3;
                });
                setScores(init);
                setOpen(true);
            }
        }
        check();
    }, [userId]);

    const handleScoreChange = (userId: string, score: number) => {
        setScores(prev => ({ ...prev, [userId]: score }));
    };

    const handleSubmit = async () => {
        if (!currentProject) return;
        setSubmitting(true);

        const reviews = Object.entries(scores).map(([revieweeId, score]) => ({
            revieweeId,
            score,
        }));

        const res = await submitReview(currentProject.projectId, userId, reviews);
        setSubmitting(false);

        if (res.success) {
            // 다음 미평가 프로젝트가 있나 확인
            const remaining = projects.filter(p => p.projectId !== currentProject.projectId);
            if (remaining.length > 0) {
                setProjects(remaining);
                setCurrentProject(remaining[0]);
                const init: Record<string, number> = {};
                remaining[0].participants.forEach(p => {
                    if (!p.reviewed) init[p.id] = 3;
                });
                setScores(init);
            } else {
                setOpen(false);
            }
        } else {
            alert(res.error || "제출 실패");
        }
    };

    if (!currentProject) return null;

    const unreviewedParticipants = currentProject.participants.filter(p => !p.reviewed);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        ⭐ 피어 리뷰 — {currentProject.projectName}
                    </DialogTitle>
                </DialogHeader>

                <p className="text-sm text-zinc-400 mb-4">
                    프로젝트가 종료되었습니다. 함께한 동료를 평가해주세요.
                    <br />
                    <span className="text-xs text-zinc-500">
                        (종료 후 5일 이내, 미평가 시 기본 3점 적용)
                    </span>
                </p>

                <div className="space-y-4">
                    {unreviewedParticipants.map((participant) => (
                        <div
                            key={participant.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-zinc-700"
                        >
                            <span className="text-sm font-medium text-white">
                                {participant.name}
                            </span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleScoreChange(participant.id, star)}
                                        className={`text-xl transition-colors ${star <= (scores[participant.id] || 3)
                                                ? "text-yellow-400"
                                                : "text-zinc-600"
                                            }`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={submitting}
                    >
                        나중에
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-yellow-600 hover:bg-yellow-700"
                    >
                        {submitting ? "제출 중..." : "평가 제출"}
                    </Button>
                </div>

                {projects.length > 1 && (
                    <p className="text-xs text-zinc-500 text-center mt-2">
                        미평가 프로젝트 {projects.length}건 중 1번째
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
