import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Webhook 수신 API
 * gov-grant-assistant에서 과제 지원 결재 요청 등의 이벤트를 수신합니다.
 *
 * 이벤트:
 * - grant.apply_request: 과제 공고 지원 결재 요청 생성
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { event, data } = body;

  if (!event || !data) {
    return NextResponse.json({ error: "Missing event or data" }, { status: 400 });
  }

  try {
    switch (event) {
      // 과제 공고 지원 → 결재 요청 자동 생성
      case "grant.apply_request": {
        const {
          title,
          content,
          category,
          requesterEmployeeCode,
          approverEmployeeCodes,
          formData,
        } = data;

        // 사원번호로 사용자 조회
        const requester = await prisma.user.findFirst({
          where: { employeeCode: requesterEmployeeCode },
        });

        if (!requester) {
          return NextResponse.json(
            { error: `사원번호 ${requesterEmployeeCode}에 해당하는 사용자를 찾을 수 없습니다.` },
            { status: 404 },
          );
        }

        // 결재자 조회
        const approvers = await prisma.user.findMany({
          where: { employeeCode: { in: approverEmployeeCodes } },
        });

        if (approvers.length === 0) {
          return NextResponse.json(
            { error: "결재자를 찾을 수 없습니다." },
            { status: 404 },
          );
        }

        // 결재 요청 생성
        const approval = await (prisma as any).approvalRequest.create({
          data: {
            title: title || "[과제 지원] 정부과제",
            content: content || "",
            category: category || "GRANT_APPLICATION",
            status: "PENDING",
            requesterId: requester.id,
            formData: formData ? JSON.stringify(formData) : null,
            steps: {
              create: approvers.map((approver, idx) => ({
                approverId: approver.id,
                stepOrder: idx + 1,
                status: idx === 0 ? "PENDING" : "WAITING",
              })),
            },
          },
          include: { steps: true },
        });

        // 첫 결재자에게 알림
        if (approvers[0]) {
          await prisma.notification.create({
            data: {
              userId: approvers[0].id,
              type: "SYSTEM",
              title: "📋 결재 요청 (정부과제)",
              message: `"${title}" 과제 지원 결재가 요청되었습니다.`,
              senderId: requester.id,
            },
          }).catch(() => {});
        }

        return NextResponse.json({
          ok: true,
          event,
          approvalId: approval.id,
        });
      }

      default:
        return NextResponse.json({ ok: true, event, message: "Unknown event" });
    }
  } catch (e) {
    console.error("[Webhook] Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
