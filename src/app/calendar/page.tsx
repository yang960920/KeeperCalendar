"use client";

import { SharedCalendar } from "@/components/SharedCalendar";
import { CalendarCheck } from "lucide-react";

export default function CalendarPage() {
    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-8 flex flex-col">
            <header className="border-b pb-5 mb-6">
                <div className="flex items-center gap-2">
                    <CalendarCheck className="h-6 w-6 text-blue-400" />
                    <h1 className="text-2xl font-extrabold tracking-tight text-primary">
                        공유 캘린더
                    </h1>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    팀의 일정을 공유하고 함께 관리하세요.
                </p>
            </header>

            <div className="flex-1">
                <SharedCalendar />
            </div>
        </div>
    );
}
