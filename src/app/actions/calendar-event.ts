"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── 일정 생성 ───────────────────────────────────────────────────────────────

export async function createCalendarEvent(data: {
    title: string;
    description?: string;
    category: "MEETING" | "FIELD_WORK" | "TRAINING" | "VACATION" | "OTHER";
    startTime: string;    // ISO string
    endTime: string;      // ISO string
    isAllDay?: boolean;
    location?: string;
    creatorId: string;
    attendeeIds: string[];
    requiresRsvp?: boolean;
    recurrenceType?: "NONE" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
    recurrenceEnd?: string;
    projectId?: string;
}) {
    try {
        const event = await (prisma as any).calendarEvent.create({
            data: {
                title: data.title,
                description: data.description || null,
                category: data.category,
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                isAllDay: data.isAllDay || false,
                location: data.location || null,
                creatorId: data.creatorId,
                requiresRsvp: data.requiresRsvp || false,
                recurrenceType: data.recurrenceType || "NONE",
                recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
                projectId: data.projectId || null,
                attendees: {
                    create: data.attendeeIds
                        .filter(id => id !== data.creatorId) // 생성자는 자동 포함
                        .map(userId => ({ userId, response: "PENDING" })),
                },
            },
            include: { attendees: true },
        });

        // 참석자에게 알림 발송
        if (data.attendeeIds.length > 0) {
            const recipients = data.attendeeIds.filter(id => id !== data.creatorId);
            if (recipients.length > 0) {
                const notifTitle = data.requiresRsvp ? "📅 일정 참석 확인 요청" : "📅 일정 안내";
                const notifMessage = data.requiresRsvp
                    ? `"${data.title}" 일정에 초대되었습니다. 참석 여부를 확인해 주세요.`
                    : `"${data.title}" 일정이 등록되었습니다.`;
                try {
                    await prisma.notification.createMany({
                        data: recipients.map(userId => ({
                            userId,
                            type: "SYSTEM",
                            title: notifTitle,
                            message: notifMessage,
                            senderId: data.creatorId,
                        })),
                    });
                } catch (notifyErr) {
                    console.error("[Notification] 일정 알림 실패:", notifyErr);
                }
            }
        }

        revalidatePath("/calendar");
        return { success: true, data: event };
    } catch (error: any) {
        console.error("Failed to create calendar event:", error);
        return { success: false, error: "일정 생성에 실패했습니다." };
    }
}

// ─── 일정 수정 ───────────────────────────────────────────────────────────────

export async function updateCalendarEvent(
    eventId: string,
    data: {
        title?: string;
        description?: string;
        category?: string;
        startTime?: string;
        endTime?: string;
        isAllDay?: boolean;
        location?: string;
        attendeeIds?: string[];
        userId: string;
    }
) {
    try {
        const event = await (prisma as any).calendarEvent.findUnique({
            where: { id: eventId },
        });
        if (!event) return { success: false, error: "일정을 찾을 수 없습니다." };
        if (event.creatorId !== data.userId) {
            return { success: false, error: "수정 권한이 없습니다. (생성자만 가능)" };
        }

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description || null;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
        if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
        if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
        if (data.location !== undefined) updateData.location = data.location || null;

        // 참석자 업데이트 (전체 교체)
        if (data.attendeeIds !== undefined) {
            await (prisma as any).eventAttendee.deleteMany({ where: { eventId } });
            updateData.attendees = {
                create: data.attendeeIds
                    .filter(id => id !== data.userId)
                    .map(userId => ({ userId, response: "PENDING" })),
            };
        }

        const updated = await (prisma as any).calendarEvent.update({
            where: { id: eventId },
            data: updateData,
            include: { attendees: true },
        });

        revalidatePath("/calendar");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to update calendar event:", error);
        return { success: false, error: "일정 수정에 실패했습니다." };
    }
}

// ─── 일정 삭제 ───────────────────────────────────────────────────────────────

export async function deleteCalendarEvent(eventId: string, userId: string) {
    try {
        const event = await (prisma as any).calendarEvent.findUnique({
            where: { id: eventId },
        });
        if (!event) return { success: false, error: "일정을 찾을 수 없습니다." };
        if (event.creatorId !== userId) {
            return { success: false, error: "삭제 권한이 없습니다. (생성자만 가능)" };
        }

        await (prisma as any).calendarEvent.delete({ where: { id: eventId } });

        revalidatePath("/calendar");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete calendar event:", error);
        return { success: false, error: "일정 삭제에 실패했습니다." };
    }
}

// ─── 참석 응답 ────────────────────────────────────────────────────────────────

export async function respondToEvent(
    eventId: string,
    userId: string,
    response: "ACCEPTED" | "DECLINED" | "TENTATIVE"
) {
    try {
        const attendee = await (prisma as any).eventAttendee.findUnique({
            where: { eventId_userId: { eventId, userId } },
        });
        if (!attendee) {
            return { success: false, error: "해당 일정의 참석자가 아닙니다." };
        }

        const updated = await (prisma as any).eventAttendee.update({
            where: { eventId_userId: { eventId, userId } },
            data: { response },
        });

        revalidatePath("/calendar");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to respond to event:", error);
        return { success: false, error: "참석 응답에 실패했습니다." };
    }
}

// ─── 월별 일정 조회 ───────────────────────────────────────────────────────────

export async function getCalendarEvents(userId: string, year: number, month: number) {
    try {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        // 내가 생성하거나 초대된 일정
        const events = await (prisma as any).calendarEvent.findMany({
            where: {
                OR: [
                    { creatorId: userId },
                    { attendees: { some: { userId } } },
                ],
                startTime: { lte: endOfMonth },
                endTime: { gte: startOfMonth },
            },
            include: {
                attendees: true,
            },
            orderBy: { startTime: "asc" },
        });

        // 반복 일정 확장 (클라이언트에서 렌더링을 위한 가상 이벤트 생성)
        const expandedEvents: any[] = [];

        for (const event of events) {
            expandedEvents.push({
                id: event.id,
                title: event.title,
                description: event.description,
                category: event.category,
                startTime: event.startTime.toISOString(),
                endTime: event.endTime.toISOString(),
                isAllDay: event.isAllDay,
                location: event.location,
                creatorId: event.creatorId,
                requiresRsvp: event.requiresRsvp,
                recurrenceType: event.recurrenceType,
                recurrenceEnd: event.recurrenceEnd?.toISOString() || null,
                projectId: event.projectId,
                attendees: event.attendees,
                myResponse: event.attendees.find((a: any) => a.userId === userId)?.response || "CREATOR",
            });
        }

        return { success: true, data: expandedEvents };
    } catch (error: any) {
        console.error("Failed to get calendar events:", error);
        return { success: false, data: [] as any[] };
    }
}

// ─── 일정 상세 조회 ───────────────────────────────────────────────────────────

export async function getCalendarEventDetail(eventId: string) {
    try {
        const event = await (prisma as any).calendarEvent.findUnique({
            where: { id: eventId },
            include: { attendees: true },
        });
        if (!event) return { success: false, error: "일정을 찾을 수 없습니다." };

        return {
            success: true,
            data: {
                ...event,
                startTime: event.startTime.toISOString(),
                endTime: event.endTime.toISOString(),
                recurrenceEnd: event.recurrenceEnd?.toISOString() || null,
                createdAt: event.createdAt.toISOString(),
                updatedAt: event.updatedAt.toISOString(),
            },
        };
    } catch (error: any) {
        console.error("Failed to get event detail:", error);
        return { success: false, error: "일정 조회에 실패했습니다." };
    }
}
