"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { Package, FileText, Calendar, LayoutDashboard, LogOut, Menu } from "lucide-react"
import { logoutAction } from "../../app/actions/auth"

const navItems = [
    { href: "/admin/dashboard", label: "Panel Principal", icon: LayoutDashboard },
    { href: "/admin/dashboard/inventario", label: "Inventario", icon: Package },
    { href: "/admin/dashboard/facturas", label: "Facturas", icon: FileText },
    { href: "/admin/dashboard/citas", label: "Agenda de Citas", icon: Calendar },
]

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = async () => {
        await logoutAction()
        // localStorage.removeItem("admin_logged_in") // No longer needed as truth, but okay to clear
        router.push("/admin")
    }

    return (
        <div className="min-h-screen bg-background flex">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-border flex justify-center">
                        <Logo className="w-60 h-32" />
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-border">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3 lg:px-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <Menu className="w-6 h-6 text-foreground" />
                        </button>
                        <h1 className="text-lg font-semibold text-foreground lg:text-xl">
                            {navItems.find((item) => item.href === pathname)?.label || "Panel de Administración"}
                        </h1>
                        <div className="w-10 lg:hidden" />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-6">{children}</main>
            </div>
        </div>
    )
}
