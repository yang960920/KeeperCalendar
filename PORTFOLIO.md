# KeeperCalendar — 사내 통합 협업 플랫폼

> 기존 외부 SaaS 툴을 완전히 대체하기 위해 1인 기획·개발·운영한 올인원 사내 업무 관리 시스템

**운영 현황**: 임직원 50명 실사용 | **개발 기간**: 2025.05 ~ 현재 (지속 운영)

---

## 핵심 성과

| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| 연간 SaaS 운영비 | 800만원 | 48만원 | **94% 절감** |
| 주간 업무 보고 소요 | 인당 4시간 | 30분 | **87.5% 단축** |
| 협업 툴 파편화 | 5개 이상 | 1개 통합 | **통합 완료** |

---

## 기능 구성

### 1. 오피스 홈 대시보드
- 3x3 위젯 그리드 레이아웃 (드래그 커스텀, 행별 개별 높이)
- 프로필 카드, 업무 현황, 근무 체크(SVG 아날로그 시계), 미니 캘린더
- 활동 피드, 오늘 할 일, 알림, 접속 기록, 바로가기

### 2. 프로젝트 & 업무 관리
- 프로젝트 생성, 참여자 초대, Creator/Participant 역할 기반 접근 제어
- 복수 담당자 업무 할당 (M:N), 우선순위(LOW/MEDIUM/HIGH), 긴급 독촉
- 하위업무(SubTask) 3단계 워크플로우 (TODO → IN_PROGRESS → DONE)
- 하위업무 완료율에 따른 상위 Task 자동 상태 갱신
- 칸반 보드 (드래그 앤 드롭)
- 프로젝트 종료 시 보고서 첨부 + 피어리뷰

### 3. 전자결재 시스템 (9종 카테고리)
- **품의서**: 품목, 업체명, 지급비용, 지급방법, 입금일자
- **지출결의서**: 정산기간, 송금계좌, 지출내역(수량x단가=공급가+VAT 자동계산)
- **외근/출장 보고서**: 다음 우편번호 API 주소검색, 다일정(1박2일+), 방문일정, 경비내역
- **휴가 신청서**: 연차/반차/병가, 기간 자동 계산(평일만)
- **시간외근무 신청서**: 근무일, 시작/종료 시간
- **정부과제 신청서**: 외부 시스템 Webhook 연동
- **납품/검수확인서**: 과제정보, 검수품목(동적 행), 검수정보
- **세금계산서 발행 요청서**: 12행 품목, 공급가액/부가세/합계 자동계산(빈값=공백)
- 공통: 다단계 결재선(순차 승인/반려), 다중 첨부파일, PDF 다운로드(ZIP 번들)
- 승인 시 자동화: 캘린더 이벤트 생성, 출근부 반영, 문서 자동 보관

### 4. 사내 메신저
- 1:1 DM + 그룹 채팅 (Pusher WebSocket 실시간 통신)
- 대용량 파일 첨부 (Vercel Blob Client Upload, 최대 100MB)
- 메시지 수정, 삭제, 답장, 고정, 이모지 리액션
- 무한 스크롤 (과거 메시지 50개씩 페이지네이션)
- 낙관적 업데이트 (Optimistic UI) — 전송 시 깜빡임 없음
- Pusher Client Singleton 패턴 (메모리 누수 방지)

### 5. 출퇴근 & 인사관리 (HR)
- 로그인 시 자동 출근 기록 + 지각 자동 판정
- 직원별 개별 출퇴근 기준 시간 설정 (유연 근무제)
- 기기 인증 보안: 첫 기기 자동 승인, 이후 기기 관리자 승인제
- 관리자 전사 근태 현황 대시보드

### 6. AI 업무 보고 자동화
- Gemini 2.5 Flash 기반 AI 어시스턴트
- 일일/주간/월간 업무 자동 보고 (5종 프리셋)
- 주간(매주 금) + 월간(매월 1일) PDF 리포트 자동 생성 (Vercel Cron)
- 3계층 구조: 전사 종합 → 부서별 → 개인별 PDF
- AI 인사이트 코멘트 자동 포함
- 한글 폰트(NotoSansKR) 임베딩 + 이메일 자동 발송

### 7. 자료실 (문서 관리)
- 계층형 폴더 구조 + 문서 버전 관리
- Public/Private 공개 범위 설정
- 결재 승인 문서 자동 보관 (카테고리별 폴더 분류)

### 8. 공유 캘린더
- 다중 이벤트 카테고리 (회의, 외근, 교육, 휴가 등)
- 반복 일정 (일간/주간/격주/월간)
- RSVP 참석 여부 추적
- 결재 승인 시 자동 이벤트 생성

### 9. 관리자 대시보드
- 사원 등록/수정/삭제, 부서 관리
- 전사 근태 현황 + 기기 인증 승인 대기열
- 실시간 업무 추적 (진행률, 지연 현황)
- 부서별 성과 비교 분석 차트
- 공헌도 자동 산출 (기간x복잡도x기한보너스÷담당자수)
- PDF 리포트 관리 (생성/다운로드/이메일 발송/수신자 관리)

### 10. 기타
- 연간 히트맵 (GitHub 스타일 활동 시각화)
- 월간 업무 로그 (Bar/Line/Category 차트)
- 알림 시스템 (독촉, 마감, 결재, 채팅)
- 다크/라이트 테마

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui |
| State | Zustand |
| Realtime | Pusher (WebSocket) |
| Database | Prisma ORM + NeonDB (Serverless PostgreSQL) |
| Storage | Vercel Blob |
| AI | Gemini 2.5 Flash (업무 분석 + PDF 인사이트) |
| PDF | @react-pdf/renderer (서버사이드), html2canvas + jsPDF (클라이언트), JSZip |
| Charts | Recharts |
| Email | Nodemailer (Hiworks SMTP) |
| Deploy | Vercel Pro + Cron Jobs |
| VCS | Git / GitHub |

---

## 아키텍처 특징

- **Next.js App Router**: SSR/CSR 하이브리드 렌더링, Server Actions로 백엔드 로직 통합
- **RBAC 권한 제어**: Creator/Participant 역할 + Admin 분리
- **기기 인증**: localStorage 토큰 + DB DeviceToken 모델 하이브리드 인증
- **실시간 통신**: Pusher WebSocket + Singleton 패턴 (메모리 누수 방지)
- **낙관적 업데이트**: 채팅 메시지 즉시 반영 → Pusher 이벤트로 동기화
- **PDF 생성 이중 구조**: 서버사이드(@react-pdf, 업무 리포트) + 클라이언트(html2canvas+jsPDF, 전자결재)
- **iframe 격리 렌더링**: 다크모드 CSS lab() 색상 함수와 html2canvas 충돌 해결
- **캐시 버스팅**: noStore() + 타임스탬프 기반으로 Vercel 정적 캐싱 극복
- **JSON 기반 유연한 폼 데이터**: formData 필드에 카테고리별 상이한 데이터를 스키마 변경 없이 저장

---

## 데이터베이스 규모

- **23개+ Prisma 모델** (User, Project, Task, SubTask, Attendance, ApprovalRequest, ChatRoom, ChatMessage, Document, Report 등)
- **26개 Server Action 파일** (업무, 결재, 채팅, 출퇴근, AI, 리포트, 알림 등)
- **10개 API 엔드포인트** (파일 업로드, Cron Jobs, Webhook)

---

*1인 기획·개발·운영 | AI 바이브 코딩 + 코드 리뷰 | 한미르 주식회사*
