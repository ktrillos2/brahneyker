import { verifySession } from "../../../lib/auth"
import DashboardShell from "../../../components/admin/dashboard-shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await verifySession()

  return <DashboardShell>{children}</DashboardShell>
}
