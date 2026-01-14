"use client"

import { useState, useEffect } from "react"
import { Package, FileText, Calendar, TrendingUp, DollarSign } from "lucide-react"
import Link from "next/link"

interface Product {
  id: string
  name: string
  quantity: number
  price: number
}

interface Invoice {
  id: string
  total: number
  date: string
}

interface Appointment {
  id: string
  date: string
  status: string
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    const storedProducts = localStorage.getItem("products")
    const storedInvoices = localStorage.getItem("invoices")
    const storedAppointments = localStorage.getItem("appointments")

    if (storedProducts) setProducts(JSON.parse(storedProducts))
    if (storedInvoices) setInvoices(JSON.parse(storedInvoices))
    if (storedAppointments) setAppointments(JSON.parse(storedAppointments))
  }, [])

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const lowStockProducts = products.filter((p) => p.quantity < 5).length
  const todayAppointments = appointments.filter(
    (a) => new Date(a.date).toDateString() === new Date().toDateString(),
  ).length

  const stats = [
    {
      label: "Productos en Inventario",
      value: products.length,
      icon: Package,
      href: "/admin/dashboard/inventario",
      color: "bg-blue-500/10 text-blue-400",
    },
    {
      label: "Facturas Generadas",
      value: invoices.length,
      icon: FileText,
      href: "/admin/dashboard/facturas",
      color: "bg-green-500/10 text-green-400",
    },
    {
      label: "Citas de Hoy",
      value: todayAppointments,
      icon: Calendar,
      href: "/admin/dashboard/citas",
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Ingresos Totales",
      value: `$${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      href: "/admin/dashboard/facturas",
      color: "bg-emerald-500/10 text-emerald-400",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-2xl font-serif text-foreground mb-2">Bienvenido al Panel de Administración</h2>
        <p className="text-muted-foreground">Gestiona tu inventario, facturas y citas desde un solo lugar.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/dashboard/inventario"
          className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all"
        >
          <Package className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Gestionar Inventario</h3>
          <p className="text-sm text-muted-foreground">Agrega, edita o elimina productos del inventario.</p>
          {lowStockProducts > 0 && (
            <div className="mt-4 bg-red-500/10 text-red-400 px-3 py-2 rounded-lg text-sm">
              {lowStockProducts} productos con bajo stock
            </div>
          )}
        </Link>

        <Link
          href="/admin/dashboard/facturas"
          className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all"
        >
          <FileText className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Generar Factura</h3>
          <p className="text-sm text-muted-foreground">Crea facturas escaneando códigos de barras.</p>
        </Link>

        <Link
          href="/admin/dashboard/citas"
          className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all"
        >
          <Calendar className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Agenda de Citas</h3>
          <p className="text-sm text-muted-foreground">Visualiza y gestiona las citas de tus clientes.</p>
        </Link>
      </div>
    </div>
  )
}
