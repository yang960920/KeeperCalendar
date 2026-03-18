import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { commonStyles, colors } from "./shared-styles";
import type { CompanyReportData, DepartmentReportData, ReportPeriod } from "../data-collector";

interface CompanyReportProps {
    data: CompanyReportData;
    departments: DepartmentReportData[];
    period: ReportPeriod;
    insight: string;
}

const Footer = ({ period }: { period: ReportPeriod }) => (
    <View style={commonStyles.footer} fixed>
        <Text>Keeper Calendar — 한미르(주) {period.type === "WEEKLY" ? "주간" : "월간"} 리포트</Text>
        <Text>본 리포트는 Keeper Calendar 시스템에서 자동 생성되었습니다.</Text>
    </View>
);

export const CompanyReport = ({ data, departments, period, insight }: CompanyReportProps) => (
    <Document>
        {/* 페이지 1: 전사 개요 */}
        <Page size="A4" style={commonStyles.page}>
            {/* 헤더 */}
            <View style={commonStyles.header}>
                <View>
                    <Text style={commonStyles.headerTitle}>한미르(주) {period.type === "WEEKLY" ? "주간" : "월간"} 업무 리포트</Text>
                    <Text style={commonStyles.headerSubtitle}>{period.label} ({period.start.toISOString().slice(0, 10)} ~ {period.end.toISOString().slice(0, 10)})</Text>
                </View>
                <Text style={commonStyles.headerSubtitle}>생성: {new Date().toISOString().slice(0, 10)}</Text>
            </View>

            {/* KPI 카드 */}
            <View style={commonStyles.kpiRow}>
                <View style={commonStyles.kpiCard}>
                    <Text style={commonStyles.kpiLabel}>총 업무</Text>
                    <Text style={commonStyles.kpiValue}>{data.totalTasks}</Text>
                </View>
                <View style={commonStyles.kpiCard}>
                    <Text style={commonStyles.kpiLabel}>완료율</Text>
                    <Text style={[commonStyles.kpiValue, { color: colors.success }]}>{data.completionRate}%</Text>
                    <Text style={[commonStyles.kpiDelta, { color: data.weekOverWeek.diff >= 0 ? colors.success : colors.danger }]}>
                        {data.weekOverWeek.diff > 0 ? "(+)" : data.weekOverWeek.diff < 0 ? "(-)" : "(=)"} {Math.abs(data.weekOverWeek.diff)}%p (전기 {data.weekOverWeek.prevRate}%)
                    </Text>
                </View>
                <View style={commonStyles.kpiCard}>
                    <Text style={commonStyles.kpiLabel}>지연 업무</Text>
                    <Text style={[commonStyles.kpiValue, { color: data.delayedTasks > 0 ? colors.danger : colors.success }]}>{data.delayedTasks}</Text>
                </View>
                <View style={commonStyles.kpiCard}>
                    <Text style={commonStyles.kpiLabel}>총 공헌도</Text>
                    <Text style={[commonStyles.kpiValue, { color: colors.primary }]}>{data.totalContribution}</Text>
                </View>
            </View>

            {/* 프로젝트별 진행률 */}
            {data.projectSummaries.length > 0 && (
                <>
                    <Text style={commonStyles.sectionTitle}>[Projects] 프로젝트 현황</Text>
                    <View style={commonStyles.tableHeader}>
                        <Text style={[commonStyles.tableCell, { flex: 3 }]}>프로젝트명</Text>
                        <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>업무</Text>
                        <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>완료</Text>
                        <Text style={[commonStyles.tableCell, { flex: 2, textAlign: "center" }]}>진행률</Text>
                    </View>
                    {data.projectSummaries.map((p, i) => (
                        <View key={i} style={commonStyles.tableRow}>
                            <Text style={[commonStyles.tableCell, { flex: 3 }]}>{p.name}</Text>
                            <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{p.taskCount}</Text>
                            <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{p.completedCount}</Text>
                            <View style={{ flex: 2, flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <View style={[commonStyles.progressBarBg, { flex: 1 }]}>
                                    <View style={[commonStyles.progressBarFill, {
                                        width: `${p.progress}%`,
                                        backgroundColor: p.progress >= 80 ? colors.success : p.progress >= 50 ? colors.warning : colors.danger,
                                    }]} />
                                </View>
                                <Text style={[commonStyles.tableCell, { width: 26, textAlign: "right" }]}>{p.progress}%</Text>
                            </View>
                        </View>
                    ))}
                </>
            )}

            {/* AI 인사이트 */}
            <View style={commonStyles.insightBox}>
                <Text style={commonStyles.insightTitle}>[AI] 분석 인사이트</Text>
                <Text style={commonStyles.insightText}>{insight}</Text>
            </View>

            <Footer period={period} />
        </Page>

        {/* 페이지 2: 부서별 비교 */}
        <Page size="A4" style={commonStyles.page}>
            <View style={commonStyles.header}>
                <Text style={commonStyles.headerTitle}>부서별 성과 비교</Text>
                <Text style={commonStyles.headerSubtitle}>{period.label}</Text>
            </View>

            {/* 부서별 완료율 바 차트 */}
            <Text style={commonStyles.sectionTitle}>[Chart] 부서별 완료율</Text>
            {departments.map((dept, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 6 }}>
                    <Text style={{ fontSize: 11, width: 70 }}>{dept.name}</Text>
                    <View style={[commonStyles.progressBarBg, { flex: 1 }]}>
                        <View style={[commonStyles.progressBarFill, {
                            width: `${dept.completionRate}%`,
                            backgroundColor: dept.completionRate >= 80 ? colors.success : dept.completionRate >= 50 ? colors.warning : colors.danger,
                        }]} />
                    </View>
                    <Text style={{ fontSize: 11, width: 36, textAlign: "right" }}>{dept.completionRate}%</Text>
                </View>
            ))}

            {/* 부서 상세 테이블 */}
            <Text style={[commonStyles.sectionTitle, { marginTop: 20 }]}>[Detail] 부서별 상세</Text>
            <View style={commonStyles.tableHeader}>
                <Text style={[commonStyles.tableCell, { flex: 2 }]}>부서</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>업무</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>완료</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>지연</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>완료율</Text>
                <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>공헌도</Text>
            </View>
            {departments.map((dept, i) => (
                <View key={i} style={commonStyles.tableRow}>
                    <Text style={[commonStyles.tableCell, { flex: 2 }]}>{dept.name}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{dept.totalTasks}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{dept.completedTasks}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center", color: dept.delayedTasks > 0 ? colors.danger : undefined }]}>{dept.delayedTasks}</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{dept.completionRate}%</Text>
                    <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{dept.totalContribution}</Text>
                </View>
            ))}

            {/* Top 5 기여자 */}
            {data.topContributors.length > 0 && (
                <>
                    <Text style={[commonStyles.sectionTitle, { marginTop: 20 }]}>[Top5] Top 5 기여자</Text>
                    <View style={commonStyles.tableHeader}>
                        <Text style={[commonStyles.tableCell, { flex: 0.5, textAlign: "center" }]}>#</Text>
                        <Text style={[commonStyles.tableCell, { flex: 2 }]}>이름</Text>
                        <Text style={[commonStyles.tableCell, { flex: 2 }]}>부서</Text>
                        <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>완료</Text>
                        <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>공헌도</Text>
                    </View>
                    {data.topContributors.map((c, i) => (
                        <View key={i} style={commonStyles.tableRow}>
                            <Text style={[commonStyles.tableCell, { flex: 0.5, textAlign: "center", color: colors.primary }]}>{i + 1}</Text>
                            <Text style={[commonStyles.tableCell, { flex: 2 }]}>{c.name}</Text>
                            <Text style={[commonStyles.tableCell, { flex: 2 }]}>{c.department}</Text>
                            <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center" }]}>{c.completedTasks}건</Text>
                            <Text style={[commonStyles.tableCell, { flex: 1, textAlign: "center", fontWeight: 700 }]}>{c.contribution}점</Text>
                        </View>
                    ))}
                </>
            )}

            <Footer period={period} />
        </Page>
    </Document>
);
