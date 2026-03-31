"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { pusherClient } from "@/lib/pusher-client";
import { MessageCircle, Search, Plus, User, FileText, Send, MoreVertical, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

import {
    getMyChatRooms,
    getMessages,
    sendMessage,
    markChatAsRead,
    getOrCreateDM,
    createGroupChat,
} from "@/app/actions/chat";

import { getEmployees } from "@/app/actions/employee";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        return format(d, "a h:mm", { locale: ko });
    }
    return format(d, "M월 d일", { locale: ko });
}

export default function ChatPage() {
    const user = useStore(useAuthStore, (s) => s.user);

    const [rooms, setRooms] = useState<any[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    
    // 로딩 및 입력 상태
    const [isRoomsLoading, setIsRoomsLoading] = useState(true);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 새 채팅 모달 상태
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState("");
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    // 채팅방 목록 로드
    const loadRooms = async () => {
        if (!user) return;
        setIsRoomsLoading(true);
        setPageError(null);
        const res = await getMyChatRooms(user.id, Date.now());
        if (res.success && "data" in res && res.data) {
            setRooms(res.data as any[]);
        } else {
            console.error("채팅방 로드 오류:", (res as any).error);
            setPageError((res as any).error || "채팅방을 파악하지 못했습니다.");
        }
        setIsRoomsLoading(false);
    };

    useEffect(() => {
        loadRooms();
    }, [user]);

    // 방 선택 시 메시지 로드
    useEffect(() => {
        if (!selectedRoomId || !user) return;
        
        let isMounted = true;
        const loadInitialMessages = async () => {
            setIsMessagesLoading(true);
            const res = await getMessages(selectedRoomId, 50, undefined, Date.now());
            if (isMounted && res.success && "data" in res && res.data) {
                setMessages(res.data as any[]);
                scrollToBottom();
            } else if (isMounted && !res.success) {
                console.error("메시지 로드 오류:", (res as any).error);
            }
            setIsMessagesLoading(false);
            
            // 읽음 처리
            await markChatAsRead(selectedRoomId, user.id);
            // 목록 갱신 (읽음 뱃지 제거)
            loadRooms();
        };

        loadInitialMessages();

        // Pusher 구독
        const channelName = `chat-${selectedRoomId}`;
        const channel = pusherClient.subscribe(channelName);

        channel.bind("new-message", (newMsg: any) => {
            if (!isMounted) return;

            setMessages((prev) => {
                if (prev.find((m) => m.id === newMsg.id)) return prev;

                if (newMsg.senderId === user.id) {
                    const tempIndex = prev.findIndex(
                        (m) => m.id.startsWith("temp-") && m.content === newMsg.content
                    );
                    if (tempIndex !== -1) {
                        const updated = [...prev];
                        updated[tempIndex] = newMsg;
                        return updated;
                    }
                }

                return [...prev, newMsg];
            });

            scrollToBottom();
            markChatAsRead(selectedRoomId, user.id);

            setRooms((prev) =>
                prev.map((r) =>
                    r.id === newMsg.roomId
                        ? { ...r, lastMessage: newMsg, updatedAt: newMsg.createdAt }
                        : r
                )
            );
        });

        return () => {
            isMounted = false;
            pusherClient.unsubscribe(channelName);
        };
    }, [selectedRoomId, user]);

    // 방 목록만 실시간 갱신할 수 없으므로, 방 목록 Pusher 구독도 각 방마다 하거나 
    // 최소한 1분에 한 번 리로드 혹은 필요시(메시지 전송 직후) 리로드합니다.

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSend = async () => {
        if (!input.trim() || !selectedRoomId || !user) return;

        const tempContent = input.trim();
        const tempId = `temp-${Date.now()}`;
        setInput("");

        const optimisticMsg = {
            id: tempId,
            roomId: selectedRoomId,
            senderId: user.id,
            content: tempContent,
            createdAt: new Date().toISOString(),
            sender: {
                id: user.id,
                name: user.name,
                profileImageUrl: user.profileImageUrl,
            },
        };

        setMessages((prev) => [...prev, optimisticMsg]);
        scrollToBottom();

        setRooms((prev) =>
            prev.map((r) =>
                r.id === selectedRoomId
                    ? { ...r, lastMessage: optimisticMsg, updatedAt: optimisticMsg.createdAt }
                    : r
            )
        );

        const result = await sendMessage({
            roomId: selectedRoomId,
            senderId: user.id,
            content: tempContent,
        });

        if (!result.success) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setRooms((prev) =>
                prev.map((r) =>
                    r.id === selectedRoomId
                        ? { ...r, lastMessage: r.lastMessage?.id === tempId ? undefined : r.lastMessage }
                        : r
                )
            );
            console.error("메시지 전송 실패");
        }
    };

    // 새 채팅방 만들기 
    const handleOpenCreateModal = async () => {
        setIsCreateModalOpen(true);
        setSelectedUsers([]);
        setGroupName("");
        if (allUsers.length === 0) {
            const res = await getEmployees();
            if (res.success && "data" in res && res.data) {
                // 관리자나 다른 사용자들 가져오기 (본인 제외)
                setAllUsers((res.data as any[]).filter((u: any) => u.id !== user?.id));
            }
        }
    };

    const handleCreateChat = async () => {
        if (selectedUsers.length === 0 || !user) return;
        setIsCreatingRoom(true);
        try {
            if (selectedUsers.length === 1) {
                // 1:1 채팅
                const res = await getOrCreateDM(user.id, selectedUsers[0]);
                if (res.success && "data" in res && res.data) {
                    setSelectedRoomId((res.data as any).id);
                    setIsCreateModalOpen(false);
                    loadRooms();
                }
            } else {
                // 그룹 채팅
                if (!groupName.trim()) {
                    alert("그룹 채팅방 이름을 입력해주세요.");
                    setIsCreatingRoom(false);
                    return;
                }
                const res = await createGroupChat({
                    name: groupName,
                    creatorId: user.id,
                    memberIds: [user.id, ...selectedUsers]
                });
                if (res.success && "data" in res && res.data) {
                    setSelectedRoomId((res.data as any).id);
                    setIsCreateModalOpen(false);
                    loadRooms();
                }
            }
        } finally {
            setIsCreatingRoom(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const selectedRoom = rooms.find(r => r.id === selectedRoomId);
    const isSelectedDirect = selectedRoom?.type === "DIRECT";
    const selectedOpponent = isSelectedDirect ? selectedRoom.members.find((m: any) => m.userId !== user?.id)?.user : null;
    const selectedRoomName = selectedRoom 
        ? (isSelectedDirect ? (selectedOpponent?.name || "알 수 없음") : (selectedRoom.name || "그룹 채팅"))
        : "채팅방 로딩 중...";

    if (!user) return null;

    return (
        <div className="flex w-full h-full bg-background border-t">
            {/* 좌측: 채팅방 목록 */}
            <div className="w-80 border-r flex flex-col bg-card/50">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        메신저
                    </h2>
                    {/* 새 채팅 ────────────────────────────────────────── */}
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleOpenCreateModal}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md" aria-describedby="dialog-description">
                            <DialogHeader>
                                <DialogTitle>새로운 대화 시작</DialogTitle>
                                <DialogDescription id="dialog-description" className="sr-only">
                                    새로운 1:1 대화 또는 그룹 채팅방을 생성하기 위해 사용자를 선택합니다.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4 px-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none">대화 상대 선택</label>
                                    <ScrollArea className="h-48 border rounded-md p-2">
                                        <div className="flex flex-col gap-1">
                                            {allUsers.map((u) => {
                                                const isSelected = selectedUsers.includes(u.id);
                                                return (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => {
                                                            setSelectedUsers(prev => 
                                                                isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                                            );
                                                        }}
                                                        className={cn(
                                                            "flex justify-between items-center w-full px-3 py-2 text-sm rounded-md transition-colors",
                                                            isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                                                        )}
                                                    >
                                                        <span>{u.name} <span className="text-xs text-muted-foreground ml-1">({u.department?.name || '부서 없음'})</span></span>
                                                        {isSelected && <Check className="h-4 w-4" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </div>
                                {selectedUsers.length > 1 && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">그룹 채팅방 이름</label>
                                        <Input
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                            placeholder="채팅방 이름을 입력하세요"
                                        />
                                    </div>
                                )}
                                <Button 
                                    className="w-full" 
                                    onClick={handleCreateChat}
                                    disabled={selectedUsers.length === 0 || isCreatingRoom || (selectedUsers.length > 1 && !groupName.trim())}
                                >
                                    {isCreatingRoom ? "생성 중..." : (selectedUsers.length > 1 ? "그룹 채팅방 만들기" : "1:1 대화 시작")}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="채팅방 또는 사용자 검색..." className="pl-9 h-9 text-sm bg-background" />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    {pageError && (
                        <div className="p-4 text-center text-sm text-red-500">{pageError}</div>
                    )}
                    {isRoomsLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">로딩 중...</div>
                    ) : rooms.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">참여 중인 채팅방이 없습니다.</div>
                    ) : (
                        <div className="flex flex-col gap-1 p-2">
                            {rooms.map(room => {
                                const isUnread = room.lastMessage && new Date(room.lastMessage.createdAt) > new Date(room.myLastReadAt);
                                const isDirect = room.type === "DIRECT";
                                const opponent = isDirect ? room.members.find((m: any) => m.userId !== user.id)?.user : null;
                                const roomName = isDirect ? (opponent?.name || "알 수 없음") : (room.name || "그룹 채팅");
                                const avatarUrl = isDirect ? opponent?.profileImageUrl : null;

                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => setSelectedRoomId(room.id)}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                                            selectedRoomId === room.id ? "bg-primary/10" : "hover:bg-muted/60"
                                        )}
                                    >
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="avatar" className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                                                <User className="h-5 w-5" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-sm truncate pr-2">
                                                    {roomName}
                                                </span>
                                                {room.lastMessage && (
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        {formatTime(room.lastMessage.createdAt)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {room.lastMessage ? room.lastMessage.content : "새 채팅방입니다."}
                                                </span>
                                                {isUnread && (
                                                    <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full flex-shrink-0"></Badge>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* 우측: 채팅 영역 */}
            <div className="flex-1 flex flex-col min-w-0 bg-background relative">
                {selectedRoomId ? (
                    <>
                        {/* 채팅방 헤더 */}
                        <div className="h-14 border-b flex items-center justify-between px-6 bg-card/30">
                            <h3 className="font-semibold flex items-center gap-2">
                                {selectedRoomName}
                            </h3>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </div>

                        {/* 메시지 리스트 */}
                        <ScrollArea className="flex-1 p-6">
                            {isMessagesLoading ? (
                                <div className="text-center text-sm text-muted-foreground p-4">메시지 로딩 중...</div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {messages.map((msg, idx) => {
                                        const isMe = msg.senderId === user.id;
                                        const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                                        const senderName = msg.sender?.name || "알 수 없음";
                                        const senderAvatar = msg.sender?.profileImageUrl;

                                        return (
                                            <div key={msg.id} className={cn("flex gap-3", isMe ? "justify-end" : "justify-start")}>
                                                {!isMe && (
                                                    <div className="w-8 flex-shrink-0 flex items-end">
                                                        {showAvatar && (
                                                            senderAvatar ? (
                                                                <img src={senderAvatar} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                                                                    <User className="h-4 w-4" />
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                                <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
                                                    {!isMe && showAvatar && (
                                                        <span className="text-xs text-muted-foreground mb-1 ml-1">{senderName}</span>
                                                    )}
                                                    <div className="flex items-end gap-1.5">
                                                        {isMe && (
                                                            <span className="text-[10px] text-muted-foreground mb-0.5">
                                                                {format(new Date(msg.createdAt), "a h:mm", { locale: ko })}
                                                            </span>
                                                        )}
                                                        <div
                                                            className={cn(
                                                                "px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words",
                                                                isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
                                                            )}
                                                        >
                                                            {msg.content}
                                                        </div>
                                                        {!isMe && (
                                                            <span className="text-[10px] text-muted-foreground mb-0.5">
                                                                {format(new Date(msg.createdAt), "a h:mm", { locale: ko })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </ScrollArea>

                        {/* 입력 창 */}
                        <div className="p-4 bg-background border-t">
                            <div className="flex items-end gap-2 bg-muted/30 p-2 rounded-xl border focus-within:ring-1 focus-within:ring-primary/30 transition-shadow">
                                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground">
                                    <Plus className="h-5 w-5" />
                                </Button>
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="메시지를 입력하세요 (Shift + Enter로 줄바꿈)"
                                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent min-h-[40px] px-2 shadow-none"
                                />
                                <Button 
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    size="icon" 
                                    className="h-10 w-10 shrink-0 rounded-lg"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-sm">채팅방을 선택하여 대화를 시작하세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
