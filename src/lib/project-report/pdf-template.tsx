import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { s, colors, gradeColors } from "./pdf-styles";
import type { ProjectReportData } from "./data-collector";

interface Props {
    data: ProjectReportData;
    insight: string;
}

const Footer = ({ name }: { name: string }) => (
    <View style={s.footer} fixed>
        <Text>HanmirWorks -- {name} 성과 보고서</Text>
        <Text>본 보고서는 시스템에서 자동 생성되었습니다.</Text>
    </View>
);

// ── P1: 커버 + 개요 ──
const CoverPage = ({ data }: { data: ProjectReportData }) => (
    <Page size="A4" style={s.page}>
        <View style={s.header}>
            <View>
                <Text style={s.headerTitle}>{data.project.name}</Text>
                <Text style={s.headerSub}>프로젝트 성과 보고서</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
                <Text style={s.headerSub}>생성: {new Date().toISOString().slice(0, 10)}</Text>
                <Text style={s.headerSub}>카테고리: {data.project.category}</Text>
            </View>
        </View>

        {/* 프로젝트 기본 정보 */}
        <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11 }}>
                기간: {data.project.startDate} ~ {data.project.endDate} ({data.project.durationDays}일)
            </Text>
            <Text style={{ fontSize: 11, marginTop: 3 }}>
                생성자: {data.project.creator.name} ({data.project.creator.department})
            </Text>
            <Text style={{ fontSize: 11, marginTop: 3 }}>
                참여자: {data.participants.map(p => p.name).join(", ")} ({data.participants.length}명)
            </Text>
            {data.project.description && (
                <Text style={{ fontSize: 10, color: colors.gray500, marginTop: 4 }}>
                    {data.project.description}
                </Text>
            )}
        </View>

        {/* KPI 카드 */}
        <View style={s.kpiRow}>
            <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>총 업무</Text>
                <Text style={s.kpiValue}>{data.taskStats.total}</Text>
                <Text style={s.kpiSub}>완료 {data.taskStats.completed} / 진행 {data.taskStats.inProgress} / 대기 {data.taskStats.todo}</Text>
            </View>
            <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>완료율</Text>
                <Text style={[s.kpiValue, { color: colors.success }]}>{data.taskStats.completionRate}%</Text>
            </View>
            <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>기한 준수율</Text>
                <Text style={[s.kpiValue, { color: colors.primary }]}>{data.taskStats.onTimeRate}%</Text>
            </View>
            <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>총 공헌도</Text>
                <Text style={[s.kpiValue, { color: colors.purple }]}>{data.taskStats.totalContribution}</Text>
            </View>
        </View>

        {/* 일정 준수 */}
        {data.taskStats.delayed > 0 && (
            <View style={{ backgroundColor: colors.dangerLight, padding: 10, borderRadius: 4, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: colors.danger, fontWeight: 700 }}>
                    [!] 지연 업무 {data.taskStats.delayed}건 발생
                </Text>
            </View>
        )}

        <Footer name={data.project.name} />
    </Page>
);

// ── P2: 업무 달성 현황 ──
const TaskStatsPage = ({ data }: { data: ProjectReportData }) => (
    <Page size="A4" style={s.page}>
        <View style={s.header}>
            <Text style={s.headerTitle}>업무 달성 현황</Text>
            <Text style={s.headerSub}>{data.project.name}</Text>
        </View>

        {/* 우선순위별 완료율 */}
        <Text style={s.section}>[Priority] 우선순위별 완료율</Text>
        {data.taskStats.byPriority.map((p, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 5, gap: 6 }}>
                <Text style={{ fontSize: 10, width: 40 }}>{p.priority}</Text>
                <View style={[s.barBg, { flex: 1 }]}>
                    <View style={[s.barFill, {
                        width: `${p.rate}%`,
                        backgroundColor: p.rate >= 80 ? colors.success : p.rate >= 50 ? colors.warning : colors.danger,
                    }]} />
                </View>
                <Text style={{ fontSize: 10, width: 55, textAlign: "right" }}>{p.completed}/{p.total} ({p.rate}%)</Text>
            </View>
        ))}

        {/* 지연 업무 테이블 */}
        {data.delayedTasks.length > 0 && (
            <>
                <Text style={[s.section, { marginTop: 18 }]}>[Delayed] 지연 업무 상세</Text>
                <View style={s.tHead}>
                    <Text style={[s.tCell, { flex: 3 }]}>업무명</Text>
                    <Text style={[s.tCell, { flex: 1.5 }]}>담당자</Text>
                    <Text style={[s.tCell, { flex: 1, textAlign: "center" }]}>마감일</Text>
                    <Text style={[s.tCell, { flex: 0.8, textAlign: "center" }]}>지연</Text>
                </View>
                {data.delayedTasks.map((t, i) => (
                    <View key={i} style={[s.tRow, { backgroundColor: i % 2 === 0 ? undefined : colors.gray50 }]}>
                        <Text style={[s.tCell, { flex: 3, color: colors.danger }]}>{t.title}</Text>
                        <Text style={[s.tCell, { flex: 1.5 }]}>{t.assignee}</Text>
                        <Text style={[s.tCell, { flex: 1, textAlign: "center" }]}>{t.dueDate}</Text>
                        <Text style={[s.tCell, { flex: 0.8, textAlign: "center", color: colors.danger }]}>{t.delayDays}일</Text>
                    </View>
                ))}
            </>
        )}

        <Footer name={data.project.name} />
    </Page>
);

// ── P3: 참여자 성과표 ──
const MemberPage = ({ data }: { data: ProjectReportData }) => (
    <Page size="A4" style={s.page}>
        <View style={s.header}>
            <Text style={s.headerTitle}>참여자 성과</Text>
            <Text style={s.headerSub}>{data.project.name}</Text>
        </View>

        <Text style={s.section}>[Performance] 개인별 성과</Text>
        <View style={s.tHead}>
            <Text style={[s.tCell, { flex: 0.4, textAlign: "center" }]}>#</Text>
            <Text style={[s.tCell, { flex: 1.5 }]}>이름</Text>
            <Text style={[s.tCell, { flex: 1.2 }]}>부서</Text>
            <Text style={[s.tCell, { flex: 0.8, textAlign: "center" }]}>업무</Text>
            <Text style={[s.tCell, { flex: 0.8, textAlign: "center" }]}>완료</Text>
            <Text style={[s.tCell, { flex: 0.8, textAlign: "center" }]}>완료율</Text>
            <Text style={[s.tCell, { flex: 0.8, textAlign: "center" }]}>기한준수</Text>
            <Text style={[s.tCell, { flex: 0.8, textAlign: "center" }]}>공헌도</Text>
        </View>
        {data.memberPerformance.map((m, i) => (
            <View key={i} style={[s.tRow, { backgroundColor: i % 2 === 0 ? undefined : colors.gray50 }]}>
                <Text style={[s.tCell, { flex: 0.4, textAlign: "center", color: colors.primary }]}>{m.contributionRank}</Text>
                <Text style={[s.tCell, { flex: 1.5, fontWeight: i === 0 ? 700 : 400 }]}>{m.name}</Text>
                <Text style={[s.tCell, { flex: 1.2, color: colors.gray500 }]}>{m.department}</Text>
                <Text style={[s.tCell, { flex: 0.8, textAlign: "center" }]}>{m.totalTasks}</Text>
                <Text style={[s.tCell, { flex: 0.8, textAlign: "center" }]}>{m.completedTasks}</Text>
                <Text style={[s.tCell, { flex: 0.8, textAlign: "center" }]}>{m.completionRate}%</Text>
                <Text style={[s.tCell, { flex: 0.8, textAlign: "center" }]}>{m.onTimeRate}%</Text>
                <Text style={[s.tCell, { flex: 0.8, textAlign: "center", fontWeight: 700 }]}>{m.totalContribution}</Text>
            </View>
        ))}

        {/* 공헌도 바 차트 */}
        <Text style={[s.section, { marginTop: 18 }]}>[Chart] 공헌도 비교</Text>
        {data.memberPerformance.map((m, i) => {
            const maxC = data.memberPerformance[0]?.totalContribution || 1;
            const pct = Math.round((m.totalContribution / maxC) * 100);
            return (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 5, gap: 6 }}>
                    <Text style={{ fontSize: 10, width: 55 }}>{m.name}</Text>
                    <View style={[s.barBg, { flex: 1 }]}>
                        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={{ fontSize: 10, width: 40, textAlign: "right" }}>{m.totalContribution}점</Text>
                </View>
            );
        })}

        <Footer name={data.project.name} />
    </Page>
);

// ── P4: 피어 리뷰 + 종합등급 ──
const ReviewPage = ({ data }: { data: ProjectReportData }) => (
    <Page size="A4" style={s.page}>
        <View style={s.header}>
            <Text style={s.headerTitle}>피어 리뷰 & 종합 등급</Text>
            <Text style={s.headerSub}>{data.project.name}</Text>
        </View>

        {/* 피어 리뷰 점수 */}
        <Text style={s.section}>[Review] 피어 리뷰 결과 (참여율 {data.peerReview.participationRate}%)</Text>
        <View style={s.tHead}>
            <Text style={[s.tCell, { flex: 1.5 }]}>이름</Text>
            <Text style={[s.tCell, { flex: 1, textAlign: "center" }]}>평균 점수</Text>
            <Text style={[s.tCell, { flex: 1, textAlign: "center" }]}>리뷰 수</Text>
            <Text style={[s.tCell, { flex: 2 }]}>평가</Text>
        </View>
        {data.peerReview.memberScores.map((m, i) => (
            <View key={i} style={s.tRow}>
                <Text style={[s.tCell, { flex: 1.5 }]}>{m.name}</Text>
                <Text style={[s.tCell, { flex: 1, textAlign: "center", fontWeight: 700, color: m.avgScore >= 4 ? colors.success : m.avgScore >= 3 ? colors.warning : colors.danger }]}>
                    {m.avgScore}/5.0
                </Text>
                <Text style={[s.tCell, { flex: 1, textAlign: "center" }]}>{m.reviewCount}건</Text>
                <View style={[s.barBg, { flex: 2 }]}>
                    <View style={[s.barFill, { width: `${(m.avgScore / 5) * 100}%`, backgroundColor: m.avgScore >= 4 ? colors.success : m.avgScore >= 3 ? colors.warning : colors.danger }]} />
                </View>
            </View>
        ))}

        {data.peerReview.unreviewed.length > 0 && (
            <Text style={{ fontSize: 10, color: colors.gray500, marginTop: 6 }}>
                * 미참여: {data.peerReview.unreviewed.join(", ")} (기본 3.0점 적용)
            </Text>
        )}

        {/* 종합 등급 */}
        <Text style={[s.section, { marginTop: 20 }]}>[Grade] 종합 등급 (공헌도 50% + 리뷰 30% + 기한준수 20%)</Text>
        <View style={s.tHead}>
            <Text style={[s.tCell, { flex: 0.5, textAlign: "center" }]}>등급</Text>
            <Text style={[s.tCell, { flex: 1.5 }]}>이름</Text>
            <Text style={[s.tCell, { flex: 1 }]}>부서</Text>
            <Text style={[s.tCell, { flex: 0.7, textAlign: "center" }]}>공헌</Text>
            <Text style={[s.tCell, { flex: 0.7, textAlign: "center" }]}>리뷰</Text>
            <Text style={[s.tCell, { flex: 0.7, textAlign: "center" }]}>기한</Text>
            <Text style={[s.tCell, { flex: 0.7, textAlign: "center" }]}>종합</Text>
        </View>
        {data.compositeScores.map((cs, i) => (
            <View key={i} style={[s.tRow, { backgroundColor: i % 2 === 0 ? undefined : colors.gray50 }]}>
                <View style={{ flex: 0.5, alignItems: "center", justifyContent: "center" }}>
                    <View style={[s.gradeBadge, { backgroundColor: gradeColors[cs.grade] || colors.gray400 }]}>
                        <Text style={s.gradeText}>{cs.grade}</Text>
                    </View>
                </View>
                <Text style={[s.tCell, { flex: 1.5 }]}>{cs.name}</Text>
                <Text style={[s.tCell, { flex: 1, color: colors.gray500 }]}>{cs.department}</Text>
                <Text style={[s.tCell, { flex: 0.7, textAlign: "center" }]}>{cs.normalizedContribution}</Text>
                <Text style={[s.tCell, { flex: 0.7, textAlign: "center" }]}>{cs.normalizedPeerReview}</Text>
                <Text style={[s.tCell, { flex: 0.7, textAlign: "center" }]}>{cs.onTimeRate}</Text>
                <Text style={[s.tCell, { flex: 0.7, textAlign: "center", fontWeight: 700 }]}>{cs.compositeScore}</Text>
            </View>
        ))}

        <Footer name={data.project.name} />
    </Page>
);

// ── P5: 타임라인 ──
const TimelinePage = ({ data }: { data: ProjectReportData }) => {
    // 최근 30개 이벤트만 표시
    const flatEvents = data.timeline.flatMap(t => t.events.map(e => ({ ...e, date: t.date })));
    const recent = flatEvents.slice(Math.max(0, flatEvents.length - 30));

    return (
        <Page size="A4" style={s.page}>
            <View style={s.header}>
                <Text style={s.headerTitle}>프로젝트 타임라인</Text>
                <Text style={s.headerSub}>{data.project.startDate} ~ {data.project.endDate}</Text>
            </View>

            {recent.map((e, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 3, gap: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.gray200 }}>
                    <Text style={{ fontSize: 9, color: colors.gray400, width: 70 }}>{e.date} {e.time}</Text>
                    <Text style={{ fontSize: 9, color: colors.primary, width: 45 }}>{e.userName}</Text>
                    <Text style={{ fontSize: 9, flex: 1, color: colors.gray600 }}>{e.action}{e.detail ? ` - ${e.detail.substring(0, 60)}` : ""}</Text>
                </View>
            ))}

            {flatEvents.length > 30 && (
                <Text style={{ fontSize: 9, color: colors.gray400, marginTop: 8, textAlign: "center" }}>
                    ... 외 {flatEvents.length - 30}건의 활동 (최근 30건만 표시)
                </Text>
            )}

            <Footer name={data.project.name} />
        </Page>
    );
};

// ── P6: AI 회고 ──
const InsightPage = ({ data, insight }: { data: ProjectReportData; insight: string }) => {
    const lines = insight.split("\n").filter(l => l.trim());
    return (
        <Page size="A4" style={s.page}>
            <View style={s.header}>
                <Text style={s.headerTitle}>AI 프로젝트 회고</Text>
                <Text style={s.headerSub}>{data.project.name}</Text>
            </View>

            <View style={s.insightBox}>
                <Text style={s.insightTitle}>[AI] 프로젝트 회고 분석</Text>
                {lines.map((line, i) => {
                    const isLabel = line.startsWith("[");
                    return (
                        <Text key={i} style={[
                            s.insightText,
                            isLabel ? { fontWeight: 700, marginTop: 8, color: colors.primary } : {},
                        ]}>
                            {line}
                        </Text>
                    );
                })}
            </View>

            <Footer name={data.project.name} />
        </Page>
    );
};

// ── 메인 문서 ──
export const ProjectReportPDF = ({ data, insight }: Props) => (
    <Document>
        <CoverPage data={data} />
        <TaskStatsPage data={data} />
        <MemberPage data={data} />
        <ReviewPage data={data} />
        {data.timeline.length > 0 && <TimelinePage data={data} />}
        <InsightPage data={data} insight={insight} />
    </Document>
);
