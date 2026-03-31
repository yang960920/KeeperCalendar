"use server";

import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";

// ─── 유틸: 에러 처리 ─────────────────────────────────────────────────────────
function handleError(message: string, error: any) {
    console.error(message, error);
    return { success: false, error: message };
}

// ─── 1:1 DM 방 가져오기 또는 생성 (DIRECT) ──────────────────────────────────
export async function getOrCreateDM(userId1: string, userId2: string) {
    try {
        // 기존 1:1 방 확인
        const existingRooms = await (prisma as any).chatRoom.findMany({
            where: {
                type: "DIRECT",
                AND: [
                    { members: { some: { userId: userId1 } } },
                    { members: { some: { userId: userId2 } } },
                ],
            },
            include: { members: true },
        });

        // 멤버가 정확히 두 명인 방 찾기
        const exactRoom = existingRooms.find((room: any) => room.members.length === 2);

        if (exactRoom) {
            return { success: true, data: exactRoom };
        }

        // 없다면 생성
        const newRoom = await (prisma as any).chatRoom.create({
            data: {
                type: "DIRECT",
                creatorId: userId1,
                members: {
                    create: [
                        { userId: userId1 },
                        { userId: userId2 },
                    ],
                },
            },
            include: { members: true },
        });

        return { success: true, data: newRoom };
    } catch (error) {
        return handleError("DM 방 생성에 실패했습니다.", error);
    }
}

// ─── 그룹 채팅방 생성 (GROUP) ────────────────────────────────────────────────
export async function createGroupChat(data: {
    name: string;
    creatorId: string;
    memberIds: string[];
}) {
    try {
        const membersData = [
            { userId: data.creatorId },
            ...data.memberIds.filter(id => id !== data.creatorId).map(id => ({ userId: id }))
        ];

        const room = await (prisma as any).chatRoom.create({
            data: {
                name: data.name,
                type: "GROUP",
                creatorId: data.creatorId,
                members: {
                    create: membersData,
                },
            },
            include: { members: true },
        });

        return { success: true, data: room };
    } catch (error) {
        return handleError("그룹 채팅방 생성에 실패했습니다.", error);
    }
}

// ─── 내 채팅방 목록 조회 ──────────────────────────────────────────────────────
export async function getMyChatRooms(userId: string) {
    try {
        const rooms = await (prisma as any).chatRoom.findMany({
            where: {
                members: { some: { userId } },
            },
            include: {
                members: {
                    select: {
                        userId: true,
                        lastReadAt: true,
                    }
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1, // 가장 최근 메시지
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        const formattedRooms = rooms.map((r: any) => {
            const memberMe = r.members.find((m: any) => m.userId === userId);
            const myLastReadAt = memberMe ? memberMe.lastReadAt : new Date(0);
            
            return {
                ...r,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
                lastMessage: r.messages[0] ? {
                    ...r.messages[0],
                    createdAt: r.messages[0].createdAt.toISOString()
                } : null,
                myLastReadAt: myLastReadAt.toISOString(),
            };
        });

        return { success: true, data: formattedRooms };
    } catch (error) {
        return handleError("채팅방 목록 무르기 실패했습니다.", error);
    }
}

// ─── 채팅 메시지 목록 페이징으로 가져오기 ────────────────────────────────────
export async function getMessages(roomId: string, limit: number = 50, cursor?: string) {
    try {
        const query: any = {
            where: { roomId },
            take: limit,
            orderBy: { createdAt: "desc" },
        };

        if (cursor) {
            query.cursor = { id: cursor };
            query.skip = 1; // cursor 제외하고 다음 것부터
        }

        const msgs = await (prisma as any).chatMessage.findMany(query);

        const data = msgs.reverse().map((m: any) => ({
            ...m,
            createdAt: m.createdAt.toISOString()
        }));

        const nextCursor = msgs.length === limit ? msgs[0].id : null;

        return { success: true, data, nextCursor };
    } catch (error) {
        return handleError("메시지 가져오기에 실패했습니다.", error);
    }
}

// ─── 채팅 메시지 보내기 ───────────────────────────────────────────────────────
export async function sendMessage(data: {
    roomId: string;
    senderId: string;
    content: string;
    fileUrl?: string;     // 확장: 첨부파일 구현 시 사용
    fileName?: string;    // 확장: 첨부파일 구현 시 사용
}) {
    try {
        // 메시지 저장
        const message = await (prisma as any).chatMessage.create({
            data: {
                roomId: data.roomId,
                senderId: data.senderId,
                content: data.content,
            },
        });

        const formattedMessage = {
            ...message,
            createdAt: message.createdAt.toISOString(),
        };

        // 채팅방 업데이트 시간 갱신
        await (prisma as any).chatRoom.update({
            where: { id: data.roomId },
            data: { updatedAt: new Date() }
        });

        // pusher 이벤트 트리거
        // 방별 채널 이름 (예: chat-roomId)
        const channelName = `chat-${data.roomId}`;
        await pusherServer.trigger(channelName, "new-message", formattedMessage);

        // 보낸 사람의 lastReadAt 갱신
        await markChatAsRead(data.roomId, data.senderId);

        return { success: true, data: formattedMessage };
    } catch (error) {
        return handleError("메시지 전송에 실패했습니다.", error);
    }
}

// ─── 채팅방의 메시지 마지막 읽은 시간 갱신 ───────────────────────────────────
export async function markChatAsRead(roomId: string, userId: string) {
    try {
        await (prisma as any).chatMember.update({
            where: {
                roomId_userId: {
                    roomId,
                    userId,
                },
            },
            data: {
                lastReadAt: new Date(),
            },
        });
        return { success: true };
    } catch (error) {
        return handleError("읽음 처리에 실패했습니다.", error);
    }
}
