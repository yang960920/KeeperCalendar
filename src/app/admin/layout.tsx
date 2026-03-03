"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminStore } from "@/store/useAdminStore";
import Link from "next/link";
import { LogOut, BarChart3, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isAdminAuthenticated, adminLogout } = useAdminStore();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !isAdminAuthenticated && pathname !== "/admin/login") {
            router.push("/admin/login");
        }
    }, [isAdminAuthenticated, pathname, router, mounted]);

    // Prevent hydration errors and flicker
    if (!mounted) return null;

    if (!isAdminAuthenticated && pathname !== "/admin/login") {
        return null;
    }

    if (pathname === "/admin/login") {
        return <>{children}</>;
    }

    const handleLogout = () => {
        adminLogout();
        router.push("/admin/login");
    };

    const navItems = [
        { href: "/admin/achievement", label: "부서별 달성률", icon: BarChart3 },
        { href: "/admin/tracking", label: "진행도 확인 및 로그", icon: Activity },
        { href: "/admin/employees", label: "사원 명부 및 권한", icon: Users },
    ];

    return (
        <div className="flex h-screen bg-zinc-950 text-foreground overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
                <div className="p-6 border-b border-zinc-800">
                    <h2 className="text-xl font-bold text-white tracking-tight">Keeper Admin</h2>
                    <p className="text-xs text-zinc-400 mt-1">Management Dashboard</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href} className="block">
                                <div
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                            ? "bg-indigo-600/10 text-indigo-400 font-medium"
                                            : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-start space-x-3 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>로그아웃</span>
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 bg-black overflow-y-auto">
                <div className="h-full p-8 text-white">
                    {children}
                </div>
            </main>
        </div>
    );
}
