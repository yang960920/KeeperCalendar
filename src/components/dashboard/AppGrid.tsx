"use client";

import Link from "next/link";
import { useAdminStore } from "@/store/useAdminStore";
import { useStore } from "@/hooks/useStore";
import {
    LayoutDashboard,
    FolderKanban,
    CalendarDays,
    Settings,
    ShieldCheck,
    NotebookPen,
} from "lucide-react";

const menuItems = [
    { href: "/monthly", label: "월별 일지", icon: NotebookPen, color: "text-blue-400 bg-blue-400/10" },
    { href: "/projects", label: "프로젝트", icon: FolderKanban, color: "text-emerald-400 bg-emerald-400/10" },
    { href: "/yearly", label: "연간 히트맵", icon: CalendarDays, color: "text-purple-400 bg-purple-400/10" },
    { href: "/settings", label: "설정", icon: Settings, color: "text-gray-400 bg-gray-400/10" },
];

export function AppGrid() {
    const isAdminAuth = useStore(useAdminStore, (s) => s.isAdminAuthenticated);

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
                <LayoutDashboard className="h-4 w-4 text-sky-400" />
                <h3 className="text-sm font-bold">바로가기</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {menuItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                        <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-muted transition-all cursor-pointer group">
                            <div className={`p-2 rounded-lg ${item.color} group-hover:scale-110 transition-transform`}>
                                <item.icon className="h-5 w-5" />
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                        </div>
                    </Link>
                ))}
                {isAdminAuth && (
                    <Link href="/admin/achievement">
                        <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-muted transition-all cursor-pointer group">
                            <div className="p-2 rounded-lg text-red-400 bg-red-400/10 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">관리자</span>
                        </div>
                    </Link>
                )}
            </div>
        </div>
    );
}
