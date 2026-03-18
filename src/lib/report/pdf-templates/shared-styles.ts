import { Font, StyleSheet } from '@react-pdf/renderer';
import path from 'path';

// ── 한글 폰트 등록 (Variable Font) ──
const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansKR-Variable.ttf');

Font.register({
    family: 'NotoSansKR',
    fonts: [
        { src: fontPath, fontWeight: 400 },
        { src: fontPath, fontWeight: 700 },
    ],
});

// ── 색상 토큰 ──
export const colors = {
    primary: '#2563eb',
    primaryLight: '#dbeafe',
    success: '#22c55e',
    successLight: '#dcfce7',
    warning: '#eab308',
    warningLight: '#fef9c3',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    gray50: '#fafafa',
    gray100: '#f4f4f5',
    gray200: '#e4e4e7',
    gray300: '#d4d4d8',
    gray400: '#a1a1aa',
    gray500: '#71717a',
    gray600: '#52525b',
    gray700: '#3f3f46',
    gray800: '#27272a',
    gray900: '#18181b',
    white: '#ffffff',
    black: '#000000',
};

// ── 공통 스타일 ──
export const commonStyles = StyleSheet.create({
    page: {
        fontFamily: 'NotoSansKR',
        fontSize: 13,
        paddingTop: 40,
        paddingBottom: 50,
        paddingHorizontal: 50,
        color: colors.gray800,
    },
    // 헤더
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
        paddingBottom: 10,
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 700,
        color: colors.primary,
    },
    headerSubtitle: {
        fontSize: 11,
        color: colors.gray500,
    },
    // 푸터
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 50,
        right: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 9,
        color: colors.gray400,
    },
    // KPI 카드
    kpiRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    kpiCard: {
        flex: 1,
        backgroundColor: colors.gray50,
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    kpiLabel: {
        fontSize: 10,
        color: colors.gray500,
        marginBottom: 4,
    },
    kpiValue: {
        fontSize: 26,
        fontWeight: 700,
        color: colors.gray800,
    },
    kpiDelta: {
        fontSize: 10,
        marginTop: 2,
    },
    // 섹션
    sectionTitle: {
        fontSize: 17,
        fontWeight: 700,
        color: colors.gray800,
        marginBottom: 10,
        marginTop: 18,
    },
    // 테이블
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.gray100,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.gray200,
        paddingVertical: 7,
        paddingHorizontal: 4,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    tableCell: {
        fontSize: 11,
    },
    // 인사이트 박스
    insightBox: {
        backgroundColor: colors.primaryLight,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        borderRadius: 4,
        padding: 14,
        marginTop: 16,
    },
    insightTitle: {
        fontSize: 13,
        fontWeight: 700,
        color: colors.primary,
        marginBottom: 6,
    },
    insightText: {
        fontSize: 11,
        color: colors.gray700,
        lineHeight: 1.5,
    },
    // 진행률 바
    progressBarBg: {
        height: 14,
        backgroundColor: colors.gray200,
        borderRadius: 7,
    },
    progressBarFill: {
        height: 14,
        borderRadius: 7,
    },
});
