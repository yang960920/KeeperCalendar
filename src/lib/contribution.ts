/**
 * 공헌도 자동 산출 유틸리티
 * 
 * 모든 계산은 기존 DB 필드(기간, subTask 수, 담당자 수, 완료일)만 사용합니다.
 * 직원에게는 비공개, 관리자 대시보드에서만 확인 가능합니다.
 */

interface ContributionInput {
    /** 업무 시작일 */
    startDate: Date;
    /** 업무 종료일 (마감일) */
    endDate: Date | null;
    /** 실제 완료 처리된 시간 */
    completedAt: Date | null;
    /** 하위 업무 수 */
    subTaskCount: number;
    /** 담당자 수 (복수 담당자 포함) */
    assigneeCount: number;
    /** 긴급 승인 여부 (Admin 승인 완료) */
    isUrgentApproved?: boolean;
}

interface ContributionBreakdown {
    baseScore: number;
    complexityMultiplier: number;
    timelinessMultiplier: number;
    urgencyMultiplier: number;
    assigneeCount: number;
    total: number;
}

/** 두 날짜 사이의 일수 차이 (endDate - startDate) */
function diffDays(start: Date, end: Date): number {
    const msPerDay = 86400000;
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(0, 0, 0, 0);
    return Math.round((e.getTime() - s.getTime()) / msPerDay);
}

/**
 * 공헌도 산출 내역을 반환합니다.
 * 내부 관리용 — 직원에게 노출하지 않습니다.
 */
export function getContributionBreakdown(input: ContributionInput): ContributionBreakdown {
    // 1. 기간 기반 baseScore
    const durationDays = input.endDate
        ? diffDays(input.startDate, input.endDate)
        : 0;
    let baseScore = durationDays <= 2 ? 10 : durationDays <= 7 ? 20 : 30;

    // ⚡ 긴급 승인 업무: baseScore 최소 20점 보장
    if (input.isUrgentApproved && baseScore < 20) {
        baseScore = 20;
    }

    // 2. 복잡도 가중치 (subTask 수 기반)
    const n = input.subTaskCount;
    const complexityMultiplier = n === 0 ? 1.0 : n <= 3 ? 1.3 : n <= 6 ? 1.6 : 2.0;

    // 3. 기한 준수 보너스 (endDate vs completedAt) + 소요율 상한선
    let timelinessMultiplier = 1.0;
    if (input.endDate && input.completedAt) {
        const diff = diffDays(input.completedAt, input.endDate);
        if (diff >= 3) timelinessMultiplier = 1.3;       // 3일+ 전 완료
        else if (diff >= 1) timelinessMultiplier = 1.1;   // 1~2일 전 완료
        else if (diff >= 0) timelinessMultiplier = 1.0;   // 당일 완료
        else if (diff >= -3) timelinessMultiplier = 0.8;  // 1~3일 초과
        else timelinessMultiplier = 0.5;                   // 4일+ 초과

        // 소요율 상한선 (악용 방지)
        if (durationDays > 0 && timelinessMultiplier > 1.0) {
            const actualDays = diffDays(input.startDate, input.completedAt);
            const usageRatio = actualDays / durationDays;
            if (usageRatio < 0.3) {
                timelinessMultiplier = 1.0;
            }
        }
    }

    // 4. 긴급 가중치
    const urgencyMultiplier = input.isUrgentApproved ? 2.0 : 1.0;

    // 5. 담당자 균등 분배
    const assigneeCount = Math.max(input.assigneeCount, 1);

    const total = Math.round(
        (baseScore * complexityMultiplier * timelinessMultiplier * urgencyMultiplier) / assigneeCount
    );

    return {
        baseScore,
        complexityMultiplier,
        timelinessMultiplier,
        urgencyMultiplier,
        assigneeCount,
        total,
    };
}

/**
 * 공헌도 최종 점수를 반환합니다.
 */
export function calculateContribution(input: ContributionInput): number {
    return getContributionBreakdown(input).total;
}
