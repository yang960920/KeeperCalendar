// 한국 사업자등록번호(Business Registration Number) 체크섬 검증
// 국세청 표준 알고리즘 — OCR 오인식 1차 차단용
//
// 형식: 10자리 숫자 (XXX-XX-XXXXX)
// 가중치: [1, 3, 7, 1, 3, 7, 1, 3, 5]
// 마지막 자리(검증번호) = (10 - (Σ(d[i] * w[i]) + floor(d[8] * 5 / 10)) % 10) % 10

export function normalizeBrn(raw: string): string {
    return (raw || "").replace(/\D/g, "");
}

export function formatBrn(raw: string): string {
    const d = normalizeBrn(raw);
    if (d.length !== 10) return raw;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export function isValidBrn(raw: string): boolean {
    const d = normalizeBrn(raw);
    if (d.length !== 10) return false;

    const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += Number(d[i]) * weights[i];
    }
    sum += Math.floor((Number(d[8]) * 5) / 10);

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === Number(d[9]);
}
