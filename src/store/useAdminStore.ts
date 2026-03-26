import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminState {
    isAdminAuthenticated: boolean;
    adminLogin: () => void;
    adminLogout: () => void;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useAdminStore = create<AdminState>()(
    persist(
        (set) => ({
            isAdminAuthenticated: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),
            adminLogin: () => set({ isAdminAuthenticated: true }),
            adminLogout: () => set({ isAdminAuthenticated: false }),
        }),
        {
            name: "admin-auth-storage",
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
