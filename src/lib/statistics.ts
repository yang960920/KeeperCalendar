import { Task } from '@/store/useTaskStore';

export interface DailyStat {
    date: string;       // YYYY-MM-DD
    totalPlanned: number;
    totalDone: number;
    rate: number;       // 0 ~ 100
    score: number;      // 0 ~ 4 (Heatmap color)
}

export interface MonthlyStat {
    month: string;      // YYYY-MM
    totalPlanned: number;
    totalDone: number;
    rate: number;
}

export interface CategoryStat {
    category: string;
    totalPlanned: number;
    totalDone: number;
    rate: number;
}

/**
 * 히트맵 점수 (0~4) 계산
 * @param rate 0~100 사이의 달성률
 */
export const calculateScore = (rate: number): number => {
    if (rate === 0) return 0;
    if (rate < 30) return 1;
    if (rate < 60) return 2;
    if (rate < 90) return 3;
    return 4;
};

/**
 * Task 배열을 받아 날짜별(YYYY-MM-DD) 통계 객체를 반환합니다.
 */
export const getDailyStats = (tasks: Task[]): Record<string, DailyStat> => {
    const stats: Record<string, DailyStat> = {};

    tasks.forEach((task) => {
        if (!stats[task.date]) {
            stats[task.date] = {
                date: task.date,
                totalPlanned: 0,
                totalDone: 0,
                rate: 0,
                score: 0,
            };
        }
        stats[task.date].totalPlanned += task.planned;
        stats[task.date].totalDone += task.done;
    });

    // Calculate rate and score
    Object.values(stats).forEach((stat) => {
        stat.rate = stat.totalPlanned > 0 ? Math.round((stat.totalDone / stat.totalPlanned) * 100) : 0;
        // ensure rate doesn't exceed 100% just in case over-achievement
        if (stat.rate > 100) stat.rate = 100;
        stat.score = calculateScore(stat.rate);
    });

    return stats;
};

/**
 * Task 배열을 받아 월별(YYYY-MM) 통계 배열을 반환합니다. (차트용)
 * 특정 연도(year)가 주어지면 해당 연도의 데이터만 반환합니다.
 */
export const getMonthlyStats = (tasks: Task[], year?: string): MonthlyStat[] => {
    const stats: Record<string, MonthlyStat> = {};

    let filteredTasks = tasks;
    if (year) {
        filteredTasks = tasks.filter((t) => t.date.startsWith(year));
    }

    filteredTasks.forEach((task) => {
        const month = task.date.substring(0, 7); // 'YYYY-MM'
        if (!stats[month]) {
            stats[month] = {
                month,
                totalPlanned: 0,
                totalDone: 0,
                rate: 0,
            };
        }
        stats[month].totalPlanned += task.planned;
        stats[month].totalDone += task.done;
    });

    return Object.values(stats)
        .map((stat) => ({
            ...stat,
            rate: stat.totalPlanned > 0 ? Math.round((stat.totalDone / stat.totalPlanned) * 100) : 0,
        }))
        .sort((a, b) => a.month.localeCompare(b.month)); // sort by month ascending
};

/**
 * Task 배열을 받아 특정 기간(연/월)의 카테고리별 통계를 반환합니다.
 */
export const getCategoryStats = (tasks: Task[], year?: string, month?: string): CategoryStat[] => {
    const stats: Record<string, CategoryStat> = {};

    let filteredTasks = tasks;
    if (year && month) {
        const prefix = `${year}-${month.padStart(2, '0')}`;
        filteredTasks = tasks.filter(t => t.date.startsWith(prefix));
    } else if (year) {
        filteredTasks = tasks.filter(t => t.date.startsWith(year));
    }

    filteredTasks.forEach((task) => {
        if (!stats[task.category]) {
            stats[task.category] = {
                category: task.category,
                totalPlanned: 0,
                totalDone: 0,
                rate: 0,
            };
        }
        stats[task.category].totalPlanned += task.planned;
        stats[task.category].totalDone += task.done;
    });

    return Object.values(stats)
        .map((stat) => ({
            ...stat,
            rate: stat.totalPlanned > 0 ? Math.round((stat.totalDone / stat.totalPlanned) * 100) : 0,
        }))
        .sort((a, b) => b.rate - a.rate); // sort by rate descending
};
