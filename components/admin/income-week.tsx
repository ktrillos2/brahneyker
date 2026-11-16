"use client"

import Link from "next/link"
import { addDays, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { money } from "./income-day"
import type { WeeklyRecords } from "./weekly-summary"

interface IncomeWeekProps {
    weekStart: string
    columns: string[]
    records: WeeklyRecords
}

export function IncomeWeek({ weekStart, columns, records }: IncomeWeekProps) {
    const days = Array.from({ length: 7 }, (_, i) => format(addDays(parseISO(weekStart), i), "yyyy-MM-dd"))

    const serviceTotal = (day: string | null, stylist: string | null) =>
        records.operations
            .filter((op) => (day === null || op.date === day) && (stylist === null || op.stylist === stylist))
            .reduce((sum, op) => sum + op.amount, 0)

    const productTotal = (day: string | null) =>
        records.productSales
            .filter((sale) => day === null || sale.date === day)
            .reduce((sum, sale) => sum + sale.quantity * (sale.productPrice || 0), 0)

    const cell = (value: number) => (value > 0 ? money(value) : <span className="text-muted-foreground">—</span>)

    const weekServices = serviceTotal(null, null)
    const weekProducts = productTotal(null)

    return (
        <div className="space-y-6">
            <div className="border rounded-lg bg-card overflow-x-auto">
                <table className="w-full border-collapse text-sm tabular-nums">
                    <thead>
                        <tr className="border-b bg-muted/30">
                            <th className="px-3 py-2 text-left font-semibold border-r">Día</th>
                            {columns.map((name) => (
                                <th key={name} className="min-w-[100px] px-3 py-2 text-right font-semibold border-r">{name}</th>
                            ))}
                            <th className="min-w-[100px] px-3 py-2 text-right font-semibold border-r">Productos</th>
                            <th className="min-w-[110px] px-3 py-2 text-right font-semibold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {days.map((day) => {
                            const dayTotal = serviceTotal(day, null) + productTotal(day)
                            return (
                                <tr key={day} className="border-b hover:bg-muted/20">
                                    <td className="px-3 py-2 border-r">
                                        <Link
                                            href={`/admin/dashboard/ingresos?view=dia&date=${day}`}
                                            className="capitalize hover:text-primary hover:underline whitespace-nowrap"
                                            title="Ver la tabla de este día"
                                        >
                                            {format(parseISO(day), "EEEE d", { locale: es })}
                                        </Link>
                                    </td>
                                    {columns.map((name) => (
                                        <td key={name} className="px-3 py-2 text-right border-r">{cell(serviceTotal(day, name))}</td>
                                    ))}
                                    <td className="px-3 py-2 text-right border-r">{cell(productTotal(day))}</td>
                                    <td className="px-3 py-2 text-right font-semibold">{cell(dayTotal)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 bg-muted/30 font-bold">
                            <td className="px-3 py-2 border-r">Total semana</td>
                            {columns.map((name) => (
                                <td key={name} className="px-3 py-2 text-right border-r">{money(serviceTotal(null, name))}</td>
                            ))}
                            <td className="px-3 py-2 text-right border-r">{money(weekProducts)}</td>
                            <td className="px-3 py-2 text-right text-primary">{money(weekServices + weekProducts)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Servicios de la semana</p>
                    <p className="text-2xl font-bold tabular-nums">{money(weekServices)}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Productos de la semana</p>
                    <p className="text-2xl font-bold tabular-nums">{money(weekProducts)}</p>
                </div>
                <div className="rounded-lg border bg-primary/10 p-4">
                    <p className="text-sm text-muted-foreground">Total de la semana</p>
                    <p className="text-2xl font-bold text-primary tabular-nums">{money(weekServices + weekProducts)}</p>
                </div>
            </div>
        </div>
    )
}
