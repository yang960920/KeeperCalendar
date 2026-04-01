import { create } from "zustand";
import { persist } from "zustand/middleware";

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12시간

interface AdminState {
    isAdminAuthenticated: boolean;
    loginTimestamp: number | null;
    adminLogin: () => void;
    adminLogout: () => void;
    checkExpiration: () => void;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useAdminStore = create<AdminState>()(
    persist(
        (set, get) => ({
            isAdminAuthenticated: false,
            loginTimestamp: null,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),
            adminLogin: () => set({ isAdminAuthenticated: true, loginTimestamp: Date.now() }),
            adminLogout: () => set({ isAdminAuthenticated: false, loginTimestamp: null }),
            checkExpiration: () => {
                const { loginTimestamp, isAdminAuthenticated } = get();
                if (isAdminAuthenticated && loginTimestamp) {
                    if (Date.now() - loginTimestamp > SESSION_DURATION_MS) {
                        console.log("[Admin] 세션 만료 (12시간 초과) - 자동 로그아웃");
                        get().adminLogout();
                    }
                }
            },
        }),
        {
            name: "admin-auth-storage",
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
