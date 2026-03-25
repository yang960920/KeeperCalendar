"use client";

import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { MailWidget } from "@/components/dashboard/MailWidget";
import { LoginHistoryWidget } from "@/components/dashboard/LoginHistoryWidget";
import { AppGrid } from "@/components/dashboard/AppGrid";
import { TaskStatusWidget } from "@/components/dashboard/TaskStatusWidget";
import { WorkClockWidget } from "@/components/dashboard/WorkClockWidget";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { TodayTaskWidget } from "@/components/dashboard/TodayTaskWidget";
import { ActivityFeedWidget } from "@/components/dashboard/ActivityFeedWidget";
import { AIChatAssistant } from "@/components/AIChatAssistant";

export default function OfficeDashboard() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b py-4 px-6 md:px-8 shadow-sm">
                <h1 className="text-xl font-bold tracking-tight text-primary">오피스 홈</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Keeper Office Dashboard</p>
            </header>

            <main className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
                {/* 3×3 위젯 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                    {/* Row 1 */}
                    <div className="space-y-4">
                        <UserProfileCard />
                    </div>
                    <div className="min-h-[220px]">
                        <MailWidget />
                    </div>
                    <div className="min-h-[220px]">
                        <LoginHistoryWidget />
                    </div>

                    {/* Row 2 */}
                    <div>
                        <AppGrid />
                    </div>
                    <div className="min-h-[280px]">
                        <TaskStatusWidget />
                    </div>
                    <div className="min-h-[280px]">
                        <WorkClockWidget />
                    </div>

                    {/* Row 3 */}
                    <div className="min-h-[300px]">
                        <MiniCalendar />
                    </div>
                    <div className="min-h-[300px]">
                        <TodayTaskWidget />
                    </div>
                    <div className="min-h-[300px]">
                        <ActivityFeedWidget />
                    </div>
                </div>
            </main>

            {/* AI Chat Assistant */}
            <AIChatAssistant />
        </div>
    );
}
