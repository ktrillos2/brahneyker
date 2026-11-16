"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { addDays, format, parseISO, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface IncomeHeaderProps {
    view: "dia" | "semana"
    date: string
}

const href = (view: string, date: string) => `/admin/dashboard/ingresos?view=${view}&date=${date}`

export function IncomeHeader({ view, date }: IncomeHeaderProps) {
    const router = useRouter()
    const current = parseISO(date)
    const step = view === "semana" ? 7 : 1
    const prev = format(addDays(current, -step), "yyyy-MM-dd")
    const next = format(addDays(current, step), "yyyy-MM-dd")

    const weekStart = startOfWeek(current, { weekStartsOn: 1 })
    const label = view === "semana"
        ? `${format(weekStart, "d 'de' MMMM", { locale: es })} al ${format(addDays(weekStart, 6), "d 'de' MMMM", { locale: es })}`
        : format(current, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Ingresos</h1>
                <p className="text-muted-foreground">
                    {view === "semana" ? "Total de cada empleada por día de la semana." : "Servicios de cada empleada y productos vendidos en el día."}
                </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex rounded-lg border p-1">
                    {(["dia", "semana"] as const).map((v) => (
                        <Link
                            key={v}
                            href={href(v, date)}
                            className={cn(
                                "flex-1 px-4 py-1.5 text-center text-sm rounded-md transition-colors",
                                view === v ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted"
                            )}
                        >
                            {v === "dia" ? "Día" : "Semana"}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-1 rounded-lg border p-1">
                    <Link href={href(view, prev)} className="p-1.5 rounded-md hover:bg-muted" title="Anterior">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <Popover>
                        <PopoverTrigger asChild>
                            <button type="button" className="flex-1 px-2 py-1 text-sm text-center rounded-md hover:bg-muted first-letter:uppercase min-w-[200px]">
                                {label}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={current}
                                onSelect={(d) => d && router.push(href(view, format(d, "yyyy-MM-dd")))}
                                initialFocus
                                locale={es}
                            />
                        </PopoverContent>
                    </Popover>
                    <Link href={href(view, next)} className="p-1.5 rounded-md hover:bg-muted" title="Siguiente">
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
