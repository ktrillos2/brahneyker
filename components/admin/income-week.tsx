"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { addDays, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Lock } from "lucide-react"
import { toast } from "sonner"

import { closeWeek } from "@/app/actions/closures"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { money } from "./income-day"
import type { WeeklyRecords } from "./weekly-summary"

interface IncomeWeekProps {
    weekStart: string
    columns: string[]
    records: WeeklyRecords
    closedDates: string[]
    today: string
}

export function IncomeWeek({ weekStart, columns, records, closedDates, today }: IncomeWeekProps) {
    const router = useRouter()
    const [closing, setClosing] = useState(false)
    const days = Array.from({ length: 7 }, (_, i) => format(addDays(parseISO(weekStart), i), "yyyy-MM-dd"))
    // Days up to today whose cash register is still open
    const openDays = days.filter((day) => day <= today && !closedDates.includes(day))
    const alreadyClosed = days.filter((day) => closedDates.includes(day))

    const handleCloseWeek = async () => {
        setClosing(true)
        try {
            const result = await closeWeek(weekStart)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success("Caja de la semana cerrada")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al cerrar la caja de la semana")
        } finally {
            setClosing(false)
        }
    }

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
                                        {closedDates.includes(day) && (
                                            <Lock className="inline h-3.5 w-3.5 ml-2 text-primary" aria-label="Caja cerrada" />
                                        )}
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

            <p className="text-xs text-muted-foreground">
                <Lock className="inline h-3 w-3 text-primary" /> = caja cerrada ese día.
            </p>

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

            {openDays.length > 0 && (
                <div className="flex justify-end">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="lg" disabled={closing}>
                                <Lock className="h-4 w-4 mr-2" />
                                {closing ? "Cerrando..." : "Cerrar caja de la semana"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Cerrar la caja de la semana?</AlertDialogTitle>
                                <AlertDialogDescription asChild>
                                    <div className="space-y-2">
                                        <p>
                                            Se cerrará la caja de{" "}
                                            <strong className="text-foreground capitalize">
                                                {openDays.map((day) => format(parseISO(day), "EEEE d", { locale: es })).join(", ")}
                                            </strong>
                                            {alreadyClosed.length > 0 && (
                                                <> (ya estaba cerrada: <span className="capitalize">{alreadyClosed.map((day) => format(parseISO(day), "EEEE d", { locale: es })).join(", ")}</span>)</>
                                            )}.
                                        </p>
                                        <p>
                                            Después de cerrar, los valores <strong className="text-foreground">sí se pueden corregir</strong>,
                                            pero cada cambio pedirá <strong className="text-foreground">obligatoriamente el motivo</strong> y quedará registrado.
                                        </p>
                                    </div>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCloseWeek}>Sí, cerrar caja de la semana</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
        </div>
    )
}
