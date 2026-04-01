import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "CREATOR" | "PARTICIPANT";

export interface User {
    id: string;
    name: string;
    role: Role;
    profileImageUrl?: string;
}

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12시간

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    loginTimestamp: number | null;
    login: (userData: User) => void;
    logout: () => void;
    setProfileImage: (url: string) => void;
    checkExpiration: () => void;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            loginTimestamp: null,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),
            login: (userData) =>
                set({
                    user: userData,
                    isAuthenticated: true,
                    loginTimestamp: Date.now(),
                }),
            setProfileImage: (url) =>
                set((state) => ({
                    user: state.user ? { ...state.user, profileImageUrl: url } : null,
                })),
            logout: () =>
                set({
                    user: null,
                    isAuthenticated: false,
                    loginTimestamp: null,
                }),
            checkExpiration: () => {
                const { loginTimestamp, isAuthenticated } = get();
                if (isAuthenticated && loginTimestamp) {
                    if (Date.now() - loginTimestamp > SESSION_DURATION_MS) {
                        console.log("[Auth] 세션 만료 (12시간 초과) - 자동 로그아웃");
                        get().logout();
                    }
                }
            },
        }),
        {
            name: "auth-storage",
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
