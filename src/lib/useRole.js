/**
 * useRole — helper untuk cek role user dari localStorage
 * Role: "admin" | "viewer"
 */
export function useRole() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return { role: null, isAdmin: false, isViewer: false };
    const user = JSON.parse(raw);
    const role = user?.role || "viewer";
    return {
      role,
      isAdmin:  role === "admin",
      isViewer: role === "viewer",
    };
  } catch {
    return { role: null, isAdmin: false, isViewer: false };
  }
}
