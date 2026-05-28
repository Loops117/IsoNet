import { AdminPortal } from "./components/admin-portal";
import { getAdminSession, hasAdminAuthConfigured } from "../lib/admin-session";

export default async function Home() {
  const adminSession = await getAdminSession();

  return (
    <AdminPortal
      isAuthenticated={Boolean(adminSession)}
      adminEmail={adminSession?.email ?? null}
      adminAuthConfigured={hasAdminAuthConfigured()}
    />
  );
}
