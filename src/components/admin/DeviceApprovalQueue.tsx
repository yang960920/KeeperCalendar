"use client";

import { ShieldCheck, ShieldX, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PendingDevice {
    id: string;
    userId: string;
    token: string;
    deviceInfo: string | null;
    status: string;
    createdAt: string;
    user: {
        id: string;
        name: string;
        department: { name: string } | null;
    };
}

export function DeviceApprovalQueue({
    devices,
    onApprove,
    onReject,
}: {
    devices: PendingDevice[];
    onApprove: (tokenId: string) => void;
    onReject: (tokenId: string) => void;
}) {
    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "방금 전";
        if (mins < 60) return `${mins}분 전`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}시간 전`;
        return `${Math.floor(hours / 24)}일 전`;
    };

    if (devices.length === 0) {
        return (
            <div className="text-center py-16 text-zinc-500">
                <Monitor className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">승인 대기 중인 기기가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-xs text-zinc-400">
                아래 기기가 새로 등록을 요청했습니다. 승인하면 해당 기기에서 출퇴근이 가능해집니다.
            </p>

            <div className="space-y-2">
                {devices.map(device => (
                    <div key={device.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <Monitor className="h-8 w-8 text-amber-400 opacity-60" />
                            <div>
                                <p className="text-sm font-medium">{device.user.name} <span className="text-zinc-500 font-normal">({device.user.department?.name || "-"})</span></p>
                                <p className="text-[11px] text-zinc-500 mt-0.5 max-w-[300px] truncate">
                                    {device.deviceInfo || "기기 정보 없음"}
                                </p>
                                <p className="text-[10px] text-zinc-600 mt-0.5">{timeAgo(device.createdAt)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => onApprove(device.id)}
                                size="sm"
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                            >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                승인
                            </Button>
                            <Button
                                onClick={() => onReject(device.id)}
                                variant="outline"
                                size="sm"
                                className="text-xs text-red-400 border-red-800 hover:bg-red-900/30 gap-1"
                            >
                                <ShieldX className="h-3.5 w-3.5" />
                                거절
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
