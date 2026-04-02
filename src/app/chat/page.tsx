"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { pusherClient } from "@/lib/pusher-client";
import {
    MessageCircle, Search, Plus, User, FileText, Send, MoreVertical, X, Check,
    Reply, Smile, Pin, PinOff, Trash2, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { upload } from "@vercel/blob/client";

import {
    getMyChatRooms,
    getMessages,
    sendMessage,
    markChatAsRead,
    getOrCreateDM,
    createGroupChat,
    toggleReaction,
    togglePinMessage,
    deleteMessage,
    searchMessages,
    getPinnedMessages,
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

// ─── 상수 ────────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "✅", "👏"];

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        return format(d, "a h:mm", { locale: ko });
    }
    return format(d, "M월 d일", { locale: ko });
}

// ─── 리액션 표시 ─────────────────────────────────────────────────────────────

function ReactionBar({
    reactions,
    currentUserId,
    onToggle,
}: {
    reactions: Record<string, string[]>;
    currentUserId: string;
    onToggle: (emoji: string) => void;
}) {
    const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);
    if (entries.length === 0) return null;

    return (
        <div className="flex items-center gap-1 flex-wrap mt-1">
            {entries.map(([emoji, users]) => {
                const isMine = users.includes(currentUserId);
                return (
                    <button
                        key={emoji}
                        onClick={() => onToggle(emoji)}
                        className={cn(
                            "inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors",
                            isMine
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-muted/50 border-transparent hover:bg-muted"
                        )}
                    >
                        <span>{emoji}</span>
                        <span className="text-[10px]">{users.length}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── 메시지 호버 액션 ────────────────────────────────────────────────────────

function MessageActions({
    isMe,
    onReply,
    onPin,
    isPinned,
    onDelete,
    onEmojiPick,
}: {
    isMe: boolean;
    onReply: () => void;
    onPin: () => void;
    isPinned: boolean;
    onDelete: () => void;
    onEmojiPick: (emoji: string) => void;
}) {
    const [showEmojis, setShowEmojis] = useState(false);

    return (
        <div className={cn(
            "absolute top-0 flex items-center gap-0.5 bg-card border rounded-lg shadow-sm px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10",
            isMe ? "right-full mr-1" : "left-full ml-1"
        )}>
            {/* 이모지 리액션 */}
            <div className="relative">
                <button
                    onClick={() => setShowEmojis(!showEmojis)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="리액션"
                >
                    <Smile className="h-3.5 w-3.5" />
                </button>
                {showEmojis && (
                    <>
                        <div className="fixed inset-0 z-20" onClick={() => setShowEmojis(false)} />
                        <div className={cn(
                            "absolute z-30 bg-card border rounded-lg shadow-lg p-1.5 flex gap-0.5",
                            isMe ? "right-0 top-full mt-1" : "left-0 top-full mt-1"
                        )}>
                            {QUICK_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => {
                                        onEmojiPick(emoji);
                                        setShowEmojis(false);
                                    }}
                                    className="text-base hover:bg-muted rounded p-1 transition-colors"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
            <button
                onClick={onReply}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="답장"
            >
                <Reply className="h-3.5 w-3.5" />
            </button>
            <button
                onClick={onPin}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={isPinned ? "핀 해제" : "핀"}
            >
                {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
            {isMe && (
                <button
                    onClick={onDelete}
                    className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                    title="삭제"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}

// ─── 핀 메시지 패널 ──────────────────────────────────────────────────────────

function PinnedMessagesPanel({
    roomId,
    open,
    onClose,
}: {
    roomId: string;
    open: boolean;
    onClose: () => void;
}) {
    const [pins, setPins] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !roomId) return;
        setLoading(true);
        getPinnedMessages(roomId).then((res) => {
            if (res.success && "data" in res) setPins(res.data as any[]);
            setLoading(false);
        });
    }, [open, roomId]);

    if (!open) return null;

    return (
        <div className="absolute right-0 top-14 w-72 bg-card border-l shadow-lg z-20 flex flex-col max-h-[calc(100%-3.5rem)]">
            <div className="flex items-center justify-between p-3 border-b">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Pin className="h-3.5 w-3.5" />
                    핀 메시지
                </h4>
                <button onClick={onClose} className="p-1 rounded hover:bg-muted">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {loading ? (
                    <p className="text-xs text-muted-foreground text-center py-4">로딩 중...</p>
                ) : pins.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">핀된 메시지가 없습니다.</p>
                ) : (
                    pins.map((msg) => (
                        <div key={msg.id} className="bg-muted/40 rounded-lg p-2.5">
                            <p className="text-[10px] text-muted-foreground mb-1">{msg.sender?.name}</p>
                            <p className="text-xs line-clamp-3">{msg.content}</p>
                            <p className="text-[9px] text-muted-foreground mt-1">{formatTime(msg.createdAt)}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function ChatPage() {
    const user = useStore(useAuthStore, (s) => s.user);

    const [rooms, setRooms] = useState<any[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);

    const [isRoomsLoading, setIsRoomsLoading] = useState(true);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // 답장
    const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);

    // 핀 패널
    const [showPins, setShowPins] = useState(false);

    // 채팅방 검색
    const [roomSearch, setRoomSearch] = useState("");

    // 메시지 검색
    const [msgSearchQuery, setMsgSearchQuery] = useState("");
    const [msgSearchResults, setMsgSearchResults] = useState<any[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    // 새 채팅 모달
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState("");
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    // 채팅방 목록 로드
    const loadRooms = async (showLoading = false) => {
        if (!user) return;
        if (showLoading) setIsRoomsLoading(true);
        setPageError(null);
        const res = await getMyChatRooms(user.id, Date.now());
        if (res.success && "data" in res && res.data) {
            setRooms(res.data as any[]);
        } else {
            setPageError((res as any).error || "채팅방을 불러오지 못했습니다.");
        }
        setIsRoomsLoading(false);
    };

    useEffect(() => {
        loadRooms(true);
    }, [user]);

    // 채팅방 필터링
    const filteredRooms = useMemo(() => {
        if (!roomSearch.trim()) return rooms;
        const q = roomSearch.toLowerCase();
        return rooms.filter((room) => {
            const isDirect = room.type === "DIRECT";
            const opponent = isDirect ? room.members.find((m: any) => m.userId !== user?.id)?.user : null;
            const roomName = isDirect ? (opponent?.name || "") : (room.name || "");
            return roomName.toLowerCase().includes(q);
        });
    }, [rooms, roomSearch, user]);

    // 이전 메시지 로드
    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollTop === 0 && hasMore && !isLoadingMore && selectedRoomId) {
            setIsLoadingMore(true);
            const oldestMsgId = messages[0]?.id;
            if (!oldestMsgId) { setIsLoadingMore(false); return; }
            const res = await getMessages(selectedRoomId, 50, oldestMsgId, Date.now());
            if (res.success && (res as any).data) {
                const olderMsgs = (res as any).data as any[];
                setHasMore((res as any).nextCursor !== null);
                if (olderMsgs.length > 0) {
                    const scrollHeightBefore = target.scrollHeight;
                    setMessages((prev) => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const filtered = olderMsgs.filter(m => !existingIds.has(m.id));
                        return [...filtered, ...prev];
                    });
                    requestAnimationFrame(() => {
                        if (scrollContainerRef.current) {
                            const scrollHeightAfter = scrollContainerRef.current.scrollHeight;
                            scrollContainerRef.current.scrollTop = scrollHeightAfter - scrollHeightBefore;
                        }
                    });
                }
            }
            setIsLoadingMore(false);
        }
    };

    // 방 선택 시 메시지 로드
    useEffect(() => {
        if (!selectedRoomId || !user) return;

        let isMounted = true;
        const loadInitialMessages = async () => {
            if (messages.length === 0) setIsMessagesLoading(true);
            const res = await getMessages(selectedRoomId, 50, undefined, Date.now());
            if (isMounted && res.success && (res as any).data) {
                setMessages((res as any).data as any[]);
                setHasMore((res as any).nextCursor !== null);
                scrollToBottom();
            }
            setIsMessagesLoading(false);
            await markChatAsRead(selectedRoomId, user.id);
            loadRooms();
        };

        setMessages([]);
        setReplyTo(null);
        setShowPins(false);
        setMsgSearchResults(null);
        setMsgSearchQuery("");
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
                        updated[tempIndex] = { ...newMsg, reactions: newMsg.reactions || {} };
                        return updated;
                    }
                }
                return [...prev, { ...newMsg, reactions: newMsg.reactions || {} }];
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

        channel.bind("delete-message", (data: any) => {
            if (!isMounted) return;
            setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        });

        channel.bind("reaction-update", (data: any) => {
            if (!isMounted) return;
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === data.messageId ? { ...m, reactions: data.reactions } : m
                )
            );
        });

        channel.bind("pin-update", (data: any) => {
            if (!isMounted) return;
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m
                )
            );
        });

        return () => {
            isMounted = false;
            pusherClient.unsubscribe(channelName);
        };
    }, [selectedRoomId, user]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    useEffect(() => {
        if (!pendingFile || !pendingFile.type.startsWith('image/')) return;
        const url = URL.createObjectURL(pendingFile);
        return () => URL.revokeObjectURL(url);
    }, [pendingFile]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 100 * 1024 * 1024) {
            alert('파일 크기는 100MB 이하만 가능합니다.');
            e.target.value = '';
            return;
        }
        setPendingFile(file);
        e.target.value = '';
    };

    const handleSend = async () => {
        if (!input.trim() && !pendingFile) return;
        if (!selectedRoomId || !user) return;

        const tempContent = input.trim();
        const tempId = `temp-${Date.now()}`;
        const fileToUpload = pendingFile;
        const replyToMsg = replyTo;

        setInput('');
        setPendingFile(null);
        setReplyTo(null);

        const optimisticMsg: any = {
            id: tempId,
            roomId: selectedRoomId,
            senderId: user.id,
            content: tempContent,
            createdAt: new Date().toISOString(),
            reactions: {},
            replyTo: replyToMsg ? { id: replyToMsg.id, content: replyToMsg.content, sender: { name: replyToMsg.senderName } } : null,
            sender: {
                id: user.id,
                name: user.name,
                profileImageUrl: user.profileImageUrl,
            },
        };

        let localPreviewUrl: string | null = null;
        if (fileToUpload) {
            localPreviewUrl = fileToUpload.type.startsWith('image/') ? URL.createObjectURL(fileToUpload) : null;
            optimisticMsg.fileName = fileToUpload.name;
            optimisticMsg.fileSize = fileToUpload.size;
            optimisticMsg.fileType = fileToUpload.type;
            optimisticMsg.fileUrl = localPreviewUrl || 'uploading';
        }

        setMessages((prev) => [...prev, optimisticMsg]);
        scrollToBottom();
        setRooms((prev) =>
            prev.map((r) =>
                r.id === selectedRoomId
                    ? { ...r, lastMessage: optimisticMsg, updatedAt: optimisticMsg.createdAt }
                    : r
            )
        );

        try {
            let fileUrl: string | undefined;
            let fileName: string | undefined;
            let fileSize: number | undefined;
            let fileType: string | undefined;

            if (fileToUpload) {
                setUploading(true);
                const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const pathname = `chat/${crypto.randomUUID()}_${safeName}`;
                const blob = await upload(pathname, fileToUpload, {
                    access: 'public',
                    handleUploadUrl: '/api/chat-upload',
                });
                fileUrl = blob.url;
                fileName = fileToUpload.name;
                fileSize = fileToUpload.size;
                fileType = fileToUpload.type;
                setUploading(false);
            }

            const result = await sendMessage({
                roomId: selectedRoomId,
                senderId: user.id,
                content: tempContent,
                fileUrl,
                fileName,
                fileSize,
                fileType,
                replyToId: replyToMsg?.id,
            });

            if (!result.success) throw new Error('Send failed');
        } catch (error) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setRooms((prev) =>
                prev.map((r) =>
                    r.id === selectedRoomId
                        ? { ...r, lastMessage: r.lastMessage?.id === tempId ? undefined : r.lastMessage }
                        : r
                )
            );
            setUploading(false);
        } finally {
            if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        }
    };

    // 메시지 검색
    const handleMsgSearch = useCallback(async () => {
        if (!msgSearchQuery.trim() || !selectedRoomId) return;
        setIsSearching(true);
        const res = await searchMessages(selectedRoomId, msgSearchQuery);
        if (res.success && "data" in res) setMsgSearchResults(res.data as any[]);
        setIsSearching(false);
    }, [msgSearchQuery, selectedRoomId]);

    // 리액션 토글
    const handleReaction = async (messageId: string, emoji: string) => {
        if (!user) return;
        await toggleReaction(messageId, user.id, emoji);
    };

    // 핀 토글
    const handlePin = async (messageId: string) => {
        if (!selectedRoomId) return;
        await togglePinMessage(messageId, selectedRoomId);
    };

    // 메시지 삭제
    const handleDelete = async (messageId: string) => {
        if (!user) return;
        if (!confirm("메시지를 삭제하시겠습니까?")) return;
        await deleteMessage(messageId, user.id);
    };

    // 새 채팅방 만들기
    const handleOpenCreateModal = async () => {
        setIsCreateModalOpen(true);
        setSelectedUsers([]);
        setGroupName("");
        if (allUsers.length === 0) {
            const res = await getEmployees();
            if (res.success && "data" in res && res.data) {
                setAllUsers((res.data as any[]).filter((u: any) => u.id !== user?.id));
            }
        }
    };

    const handleCreateChat = async () => {
        if (selectedUsers.length === 0 || !user) return;
        setIsCreatingRoom(true);
        try {
            if (selectedUsers.length === 1) {
                const res = await getOrCreateDM(user.id, selectedUsers[0]);
                if (res.success && "data" in res && res.data) {
                    setSelectedRoomId((res.data as any).id);
                    setIsCreateModalOpen(false);
                    loadRooms();
                }
            } else {
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
        : "";
    const selectedMemberCount = selectedRoom ? selectedRoom.members.length : 0;

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
                        <Input
                            placeholder="채팅방 검색..."
                            value={roomSearch}
                            onChange={(e) => setRoomSearch(e.target.value)}
                            className="pl-9 h-9 text-sm bg-background"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    {pageError && (
                        <div className="p-4 text-center text-sm text-red-500">{pageError}</div>
                    )}
                    {isRoomsLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">로딩 중...</div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            {roomSearch ? "검색 결과가 없습니다." : "참여 중인 채팅방이 없습니다."}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1 p-2">
                            {filteredRooms.map(room => {
                                const isUnread = room.lastMessage && room.lastMessage.senderId !== user.id && new Date(room.lastMessage.createdAt) > new Date(room.myLastReadAt);
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
                                                <span className="font-semibold text-sm truncate pr-2">{roomName}</span>
                                                {room.lastMessage && (
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        {formatTime(room.lastMessage.createdAt)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {room.lastMessage
                                                        ? (room.lastMessage.fileUrl && !room.lastMessage.content ? "📎 파일" : room.lastMessage.content)
                                                        : "새 채팅방입니다."}
                                                </span>
                                                {isUnread && (
                                                    <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full flex-shrink-0" />
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
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{selectedRoomName}</h3>
                                {!isSelectedDirect && (
                                    <span className="text-xs text-muted-foreground">{selectedMemberCount}명</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {/* 메시지 검색 */}
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                    <input
                                        placeholder="메시지 검색..."
                                        value={msgSearchQuery}
                                        onChange={(e) => {
                                            setMsgSearchQuery(e.target.value);
                                            if (!e.target.value.trim()) setMsgSearchResults(null);
                                        }}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleMsgSearch(); }}
                                        className="w-40 h-7 pl-7 pr-2 text-xs bg-muted/50 border-0 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setShowPins(!showPins)}
                                    title="핀 메시지"
                                >
                                    <Pin className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                        </div>

                        {/* 검색 결과 오버레이 */}
                        {msgSearchResults !== null && (
                            <div className="border-b bg-muted/20 px-4 py-2">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-muted-foreground">
                                        {isSearching ? "검색 중..." : `검색 결과 ${msgSearchResults.length}건`}
                                    </span>
                                    <button
                                        onClick={() => { setMsgSearchResults(null); setMsgSearchQuery(""); }}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        닫기
                                    </button>
                                </div>
                                {msgSearchResults.length > 0 && (
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {msgSearchResults.slice(0, 10).map((msg) => (
                                            <div key={msg.id} className="text-xs bg-card rounded px-2 py-1.5 flex items-center gap-2">
                                                <span className="text-muted-foreground flex-shrink-0">{msg.sender?.name}</span>
                                                <span className="truncate flex-1">{msg.content}</span>
                                                <span className="text-[9px] text-muted-foreground flex-shrink-0">{formatTime(msg.createdAt)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 메시지 리스트 */}
                        <div
                            ref={scrollContainerRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto p-6 flex flex-col"
                        >
                            {isMessagesLoading ? (
                                <div className="text-center text-sm text-muted-foreground p-4 my-auto">메시지 로딩 중...</div>
                            ) : (
                                <div className="flex flex-col gap-3 flex-1">
                                    {isLoadingMore && (
                                        <div className="text-center text-xs text-muted-foreground py-2 animate-pulse">이전 메시지 불러오는 중...</div>
                                    )}
                                    {messages.map((msg, idx) => {
                                        const isMe = msg.senderId === user.id;
                                        const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                                        const senderName = msg.sender?.name || "알 수 없음";
                                        const senderAvatar = msg.sender?.profileImageUrl;

                                        return (
                                            <div key={msg.id} className={cn("flex gap-3 group relative", isMe ? "justify-end" : "justify-start")}>
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
                                                <div className={cn("flex flex-col max-w-[70%] overflow-hidden relative", isMe ? "items-end" : "items-start")}>
                                                    {!isMe && showAvatar && (
                                                        <span className="text-xs text-muted-foreground mb-1 ml-1">{senderName}</span>
                                                    )}

                                                    {/* 답장 원본 표시 */}
                                                    {msg.replyTo && (
                                                        <div className={cn(
                                                            "text-[10px] px-2.5 py-1 rounded-t-lg border-l-2 border-primary/40 mb-0.5 max-w-full truncate",
                                                            isMe ? "bg-primary/5 text-primary-foreground/70" : "bg-muted/60 text-muted-foreground"
                                                        )}>
                                                            <span className="font-medium">{msg.replyTo.sender?.name}</span>
                                                            <span className="ml-1 opacity-70">{msg.replyTo.content?.slice(0, 50)}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-end gap-1.5">
                                                        {isMe && (
                                                            <span className="text-[10px] text-muted-foreground mb-0.5">
                                                                {format(new Date(msg.createdAt), "a h:mm", { locale: ko })}
                                                            </span>
                                                        )}
                                                        <div
                                                            className={cn(
                                                                "px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words flex flex-col gap-1",
                                                                isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm",
                                                                msg.isPinned && "ring-1 ring-amber-400/50"
                                                            )}
                                                        >
                                                            {msg.isPinned && (
                                                                <span className="text-[9px] opacity-60 flex items-center gap-0.5 -mt-0.5 -mb-0.5">
                                                                    <Pin className="h-2 w-2" /> 핀 고정
                                                                </span>
                                                            )}
                                                            {msg.content && <span>{msg.content}</span>}

                                                            {/* 이미지 */}
                                                            {msg.fileUrl && msg.fileUrl !== 'uploading' && msg.fileType?.startsWith('image/') && (
                                                                <div className="mt-1 cursor-pointer overflow-hidden rounded-lg" onClick={() => window.open(msg.fileUrl, '_blank')}>
                                                                    <img src={msg.fileUrl} alt={msg.fileName || '이미지'} className="rounded-lg max-h-60 max-w-full object-cover" loading="lazy" />
                                                                </div>
                                                            )}

                                                            {/* 문서 */}
                                                            {msg.fileUrl && msg.fileUrl !== 'uploading' && !msg.fileType?.startsWith('image/') && (
                                                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                                                                    className={cn("mt-1 flex items-center gap-2 p-2 rounded-lg transition-colors", isMe ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-background hover:bg-background/80")}>
                                                                    <FileText className="h-5 w-5 shrink-0" />
                                                                    <span className="text-sm font-medium truncate max-w-[150px]">{msg.fileName || '파일'}</span>
                                                                    {msg.fileSize && (
                                                                        <span className="text-xs opacity-70">
                                                                            {msg.fileSize < 1024 * 1024 ? `${(msg.fileSize / 1024).toFixed(0)}KB` : `${(msg.fileSize / (1024 * 1024)).toFixed(1)}MB`}
                                                                        </span>
                                                                    )}
                                                                </a>
                                                            )}

                                                            {msg.fileUrl === 'uploading' && (
                                                                <div className="mt-1 text-sm opacity-70 animate-pulse">파일 업로드 중...</div>
                                                            )}
                                                        </div>
                                                        {!isMe && (
                                                            <span className="text-[10px] text-muted-foreground mb-0.5">
                                                                {format(new Date(msg.createdAt), "a h:mm", { locale: ko })}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* 리액션 */}
                                                    <ReactionBar
                                                        reactions={msg.reactions || {}}
                                                        currentUserId={user.id}
                                                        onToggle={(emoji) => handleReaction(msg.id, emoji)}
                                                    />

                                                    {/* 호버 액션 */}
                                                    {!msg.id.startsWith("temp-") && (
                                                        <MessageActions
                                                            isMe={isMe}
                                                            onReply={() => setReplyTo({
                                                                id: msg.id,
                                                                content: msg.content,
                                                                senderName: senderName,
                                                            })}
                                                            onPin={() => handlePin(msg.id)}
                                                            isPinned={msg.isPinned || false}
                                                            onDelete={() => handleDelete(msg.id)}
                                                            onEmojiPick={(emoji) => handleReaction(msg.id, emoji)}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {/* 핀 패널 */}
                        <PinnedMessagesPanel
                            roomId={selectedRoomId}
                            open={showPins}
                            onClose={() => setShowPins(false)}
                        />

                        {/* 입력 영역 */}
                        <div className="p-4 bg-background border-t flex flex-col gap-2">
                            {/* 답장 표시 */}
                            {replyTo && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-lg border-l-2 border-primary">
                                    <Reply className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[11px] font-medium text-primary">{replyTo.senderName}</span>
                                        <p className="text-[11px] text-muted-foreground truncate">{replyTo.content}</p>
                                    </div>
                                    <button onClick={() => setReplyTo(null)} className="p-0.5 rounded hover:bg-muted">
                                        <X className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                </div>
                            )}

                            {/* 파일 미리보기 */}
                            {pendingFile && (
                                <div className="px-4 py-2 border flex items-center gap-3 bg-muted/30 rounded-lg w-fit max-w-sm">
                                    {pendingFile.type.startsWith('image/') ? (
                                        <img src={URL.createObjectURL(pendingFile)} alt="미리보기" className="h-12 w-12 object-cover rounded border" />
                                    ) : (
                                        <div className="h-12 w-12 rounded bg-background border flex items-center justify-center">
                                            <FileText className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-sm font-medium truncate">{pendingFile.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {pendingFile.size < 1024 * 1024 ? `${(pendingFile.size / 1024).toFixed(0)}KB` : `${(pendingFile.size / (1024 * 1024)).toFixed(1)}MB`}
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setPendingFile(null)} className="h-6 w-6 ml-2 text-muted-foreground hover:text-destructive">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.docx,.xlsx" className="hidden" onChange={handleFileSelect} />

                            <div className="flex items-end gap-2 bg-muted/30 p-2 rounded-xl border focus-within:ring-1 focus-within:ring-primary/30 transition-shadow">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    <Plus className="h-5 w-5" />
                                </Button>
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={uploading ? "파일을 업로드하는 중입니다..." : "메시지를 입력하세요 (Enter로 전송)"}
                                    disabled={uploading}
                                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent min-h-[40px] px-2 shadow-none disabled:opacity-50"
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={(!input.trim() && !pendingFile) || uploading}
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
