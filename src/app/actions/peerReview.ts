"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * 미평가 프로젝트 목록 조회
 * 조건: 프로젝트 endDate 경과 + 5일 이내 + 해당 사용자가 참여 + 미평가
 */
export async function getPendingReviews(userId: string) {
    try {
        const now = new Date();
        const fiveDaysAgo = new Date(now);
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        // 종료된 프로젝트 중 5일 이내 & 사용자가 참여자인 프로젝트
        const projects = await prisma.project.findMany({
            where: {
                endDate: {
                    gte: fiveDaysAgo,
                    lte: now,
                },
                participants: {
                    some: { id: userId },
                },
            },
            include: {
                participants: true,
                peerReviews: {
                    where: { reviewerId: userId },
                },
            },
        });

        // 아직 평가하지 않은 동료가 있는 프로젝트만 필터
        const pendingProjects = projects.filter(p => {
            const otherParticipants = p.participants.filter(u => u.id !== userId);
            const reviewedIds = p.peerReviews.map(r => r.revieweeId);
            return otherParticipants.some(u => !reviewedIds.includes(u.id));
        }).map(p => ({
            projectId: p.id,
            projectName: p.name,
            endDate: p.endDate.toISOString(),
            participants: p.participants
                .filter(u => u.id !== userId)
                .map(u => ({
                    id: u.id,
                    name: u.name,
                    reviewed: p.peerReviews.some(r => r.revieweeId === u.id),
                })),
        }));

        return { success: true, data: pendingProjects };
    } catch (error) {
        console.error("Failed to get pending reviews:", error);
        return { success: false, error: "피어 리뷰 목록을 불러오는 중 오류가 발생했습니다." };
    }
}

/**
 * 피어 리뷰 제출
 */
export async function submitReview(
    projectId: string,
    reviewerId: string,
    reviews: { revieweeId: string; score: number }[]
) {
    try {
        // 유효성 검사
        for (const r of reviews) {
            if (r.score < 1 || r.score > 5) {
                return { success: false, error: "별점은 1~5 사이여야 합니다." };
            }
            if (r.revieweeId === reviewerId) {
                return { success: false, error: "자기 자신은 평가할 수 없습니다." };
            }
        }

        // upsert로 중복 방지
        for (const r of reviews) {
            await prisma.peerReview.upsert({
                where: {
                    projectId_reviewerId_revieweeId: {
                        projectId,
                        reviewerId,
                        revieweeId: r.revieweeId,
                    },
                },
                update: { score: r.score },
                create: {
                    projectId,
                    reviewerId,
                    revieweeId: r.revieweeId,
                    score: r.score,
                },
            });
        }

        revalidatePath("/");
        return { success: true, message: "피어 리뷰가 제출되었습니다." };
    } catch (error) {
        console.error("Failed to submit review:", error);
        return { success: false, error: "피어 리뷰 제출에 실패했습니다." };
    }
}

/**
 * 프로젝트별 평가 결과 요약 (Admin용)
 */
export async function getProjectReviewSummary(projectId: string) {
    try {
        const reviews = await prisma.peerReview.findMany({
            where: { projectId },
            include: {
                reviewer: true,
                reviewee: true,
            },
        });

        // 받은 평가 기준으로 평균 점수 계산
        const scoreMap: Record<string, { name: string; scores: number[] }> = {};
        for (const r of reviews) {
            if (!scoreMap[r.revieweeId]) {
                scoreMap[r.revieweeId] = { name: r.reviewee.name, scores: [] };
            }
            scoreMap[r.revieweeId].scores.push(r.score);
        }

        const summary = Object.entries(scoreMap).map(([userId, { name, scores }]) => ({
            userId,
            name,
            avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
            reviewCount: scores.length,
        }));

        return { success: true, data: summary };
    } catch (error) {
        console.error("Failed to get review summary:", error);
        return { success: false, error: "리뷰 요약을 불러오는 중 오류가 발생했습니다." };
    }
}
