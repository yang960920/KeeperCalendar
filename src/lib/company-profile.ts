// 한미르㈜ 공급자 고정 프로필 (거래명세표·세금계산서 발행 시 상단 공급자 정보로 사용)
// 값 변경이 필요하면 이 파일만 수정.

export const COMPANY_PROFILE = {
    name: "한미르㈜",
    ceoName: "한승우",
    address: "인천광역시 서구 도담로 190(오류동)",
    bizType: "제조업", // 업태
    bizItem: "친환경 신소재개발 / 첨단화학물질 제조", // 종목
    contactPhone: "좌진혈 상무 010-7723-5417", // 공급자 연락처
} as const;

// 세금계산서 발행 요청서 기본 결재자 (Phase 2)
export const DEFAULT_TAX_APPROVER_IDS: readonly string[] = ["진호열", "변진순"];
