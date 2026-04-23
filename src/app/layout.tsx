import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import AuthProvider from "@/components/AuthProvider";
import { Navigation } from "@/components/Navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HanmirWorks",
  description: "한미르㈜ 사내 업무 관리 시스템",
  icons: {
    icon: "/hanmir-logo.png",
    apple: "/hanmir-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="flex h-screen overflow-hidden">
              <Navigation />
              <main className="flex-1 overflow-y-auto bg-background">
                {children}
              </main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
