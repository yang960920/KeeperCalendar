"use server";

import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "keeper_session";
const SESSION_DURATION_SEC = 12 * 60 * 60; // 12시간

export interface SessionPayload {
    userId: string;
    isAdmin: boolean;
    iat: number;
}

function getSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
        throw new Error("SESSION_SECRET 환경변수가 설정되지 않았습니다.");
    }
    return secret;
}

function base64urlEncode(buf: Buffer | string): string {
    return Buffer.from(buf)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function base64urlDecode(str: string): Buffer {
    const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
    return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payload: SessionPayload): string {
    const body = base64urlEncode(JSON.stringify(payload));
    const sig = base64urlEncode(
        crypto.createHmac("sha256", getSecret()).update(body).digest()
    );
    return `${body}.${sig}`;
}

function verify(token: string): SessionPayload | null {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, sig] = parts;

    const expected = base64urlEncode(
        crypto.createHmac("sha256", getSecret()).update(body).digest()
    );

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    try {
        const payload = JSON.parse(base64urlDecode(body).toString("utf8")) as SessionPayload;
        if (!payload.userId || typeof payload.iat !== "number") return null;
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec - payload.iat > SESSION_DURATION_SEC) return null;
        return payload;
    } catch {
        return null;
    }
}

export async function createSession(userId: string, isAdmin = false): Promise<void> {
    const payload: SessionPayload = {
        userId,
        isAdmin,
        iat: Math.floor(Date.now() / 1000),
    };
    const token = sign(payload);

    const jar = await cookies();
    jar.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DURATION_SEC,
    });
}

export async function getSession(): Promise<SessionPayload | null> {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verify(token);
}

export async function requireSession(): Promise<SessionPayload> {
    const session = await getSession();
    if (!session) {
        throw new Error("인증이 필요합니다. 다시 로그인해주세요.");
    }
    return session;
}

export async function destroySession(): Promise<void> {
    const jar = await cookies();
    jar.delete(COOKIE_NAME);
}
