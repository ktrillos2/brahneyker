"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { addDays, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarRange, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

export interface WeeklyRecords {
    operations: { date: string; stylist: string; amount: number; status: string }[]
    productSales: { date: string; quantity: number; status: string; productPrice: number | null }[]
}

interface WeeklySummaryProps {
    date: string
    weekStart: string
    records: WeeklyRecords
    onSelectDate: (date: string) => void
}

const money = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`

export function WeeklySummary({ date, weekStart, records, onSelectDate }: WeeklySummaryProps) {
    const [isOpen, setIsOpen] = useState(true)

    const summary = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
            const day = format(addDays(parseISO(weekStart), i), "yyyy-MM-dd")
            return { day, services: 0, products: 0, count: 0 }
        })
        const byDay = Object.fromEntries(days.map((d) => [d.day, d]))
        const byStylist: Record<string, { total: number; count: number }> = {}
        let pending = 0

        for (const op of records.operations) {
            const day = byDay[op.date]
            if (day) {
                day.services += op.amount
                day.count += 1
            }
            byStylist[op.stylist] ??= { total: 0, count: 0 }
            byStylist[op.stylist].total += op.amount
            byStylist[op.stylist].count += 1
            if (op.status !== "facturada") pending += op.amount
        }

        for (const sale of records.productSales) {
            const amount = sale.quantity * (sale.productPrice || 0)
            const day = byDay[sale.date]
            if (day) {
                day.products += amount
                day.count += 1
            }
            if (sale.status !== "facturada") pending += amount
        }

        const services = days.reduce((sum, d) => sum + d.services, 0)
        const products = days.reduce((sum, d) => sum + d.products, 0)
        const stylists = Object.entries(byStylist).sort((a, b) => b[1].total - a[1].total)

        return { days, services, products, total: services + products, pending, stylists }
    }, [records, weekStart])

    const weekEnd = addDays(parseISO(weekStart), 6)
    const maxDayTotal = Math.max(1, ...summary.days.map((d) => d.services + d.products))

    return (
        <div className="border rounded-lg bg-card">
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-4 p-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <CalendarRange className="h-5 w-5 text-primary" />
                    <div>
                        <h2 className="font-semibold">Resumen de la semana</h2>
                        <p className="text-sm text-muted-foreground first-letter:uppercase">
                            {format(parseISO(weekStart), "EEEE d 'de' MMMM", { locale: es })} al{" "}
                            {format(weekEnd, "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-primary">{money(summary.total)}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>

            {isOpen && (
                <div className="border-t p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-lg bg-muted/30 p-3">
                            <p className="text-xs text-muted-foreground">Total semana</p>
                            <p className="text-lg font-bold">{money(summary.total)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3">
                            <p className="text-xs text-muted-foreground">Servicios</p>
                            <p className="text-lg font-bold">{money(summary.services)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3">
                            <p className="text-xs text-muted-foreground">Productos</p>
                            <p className="text-lg font-bold">{money(summary.products)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3">
                            <p className="text-xs text-muted-foreground">Pendiente por facturar</p>
                            <p className={cn("text-lg font-bold", summary.pending > 0 && "text-orange-600")}>
                                {money(summary.pending)}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                        <div className="space-y-1">
                            <p className="text-sm font-medium mb-2">Por día</p>
                            {summary.days.map((d) => {
                                const dayTotal = d.services + d.products
                                return (
                                    <button
                                        key={d.day}
                                        type="button"
                                        onClick={() => onSelectDate(d.day)}
                                        className={cn(
                                            "w-full grid grid-cols-[110px_1fr_auto] items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors",
                                            d.day === date && "bg-primary/10 font-semibold"
                                        )}
                                        title="Ver este día"
                                    >
                                        <span className="text-left capitalize">
                                            {format(parseISO(d.day), "EEE d MMM", { locale: es })}
                                        </span>
                                        <span className="h-2 rounded-full bg-muted overflow-hidden">
                                            <span
                                                className="block h-full rounded-full bg-primary"
                                                style={{ width: `${(dayTotal / maxDayTotal) * 100}%` }}
                                            />
                                        </span>
                                        <span className="text-right tabular-nums">
                                            {dayTotal > 0 ? money(dayTotal) : "—"}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        <div>
                            <p className="text-sm font-medium mb-2">Por estilista</p>
                            {summary.stylists.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin servicios esta semana.</p>
                            ) : (
                                <div className="space-y-1">
                                    {summary.stylists.map(([stylist, data]) => (
                                        <div key={stylist} className="flex items-center justify-between text-sm px-2 py-1.5">
                                            <span>
                                                {stylist}{" "}
                                                <span className="text-muted-foreground">
                                                    ({data.count} {data.count === 1 ? "servicio" : "servicios"})
                                                </span>
                                            </span>
                                            <span className="font-medium tabular-nums">{money(data.total)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-right">
                        <Link
                            href="/admin/dashboard/facturas?view=daily_history"
                            className="text-sm text-primary hover:underline"
                        >
                            Ver historial semanal de facturas →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
