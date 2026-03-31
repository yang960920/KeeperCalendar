import React from "react";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-background">
            {children}
        </div>
    );
}
