"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { deleteDailyOperation } from "@/app/actions/daily-operations"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, User, Sparkles, DollarSign, Scissors } from "lucide-react"
import { toast } from "sonner"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion"
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

interface DailyOperation {
    id: string
    stylist: string
    amount: number
    status: string
}

interface DailyServicesFormProps {
    date: string
    operations: DailyOperation[]
    onSelectionChange: (ids: string[]) => void
    selectedIds: string[]
}

// Services are recorded as plain values per stylist in Ingresos; this view only lists them to invoice or delete.
export function DailyServicesForm({ date, operations, onSelectionChange, selectedIds }: DailyServicesFormProps) {
    const router = useRouter()

    // Local reactive operations state for immediate optimistic updates
    const [localOps, setLocalOps] = useState<DailyOperation[]>(operations)

    // Sync when server props update
    useEffect(() => {
        setLocalOps(operations)
    }, [operations])

    // Auto-refresh when tab gains focus or every 30s so inactive page never loses sync
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                router.refresh()
            }
        }
        const interval = setInterval(() => {
            if (document.visibilityState === "visible") {
                router.refresh()
            }
        }, 30000)

        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            clearInterval(interval)
        }
    }, [router])

    async function handleDelete(id: string) {
        try {
            setLocalOps(prev => prev.filter(op => op.id !== id))
            onSelectionChange(selectedIds.filter(item => item !== id))
            const result = await deleteDailyOperation(id)
            if (!result.success) {
                toast.error(result.error)
                router.refresh()
                return
            }
            toast.success("Servicio eliminado correctamente")
            router.refresh()
        } catch (error) {
            toast.error("Error al eliminar servicio")
        }
    }

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(item => item !== id))
        } else {
            onSelectionChange([...selectedIds, id])
        }
    }

    // Daily summary calculations
    const totalDailyAmount = useMemo(() => {
        return localOps.reduce((sum, op) => sum + op.amount, 0)
    }, [localOps])

    // Group operations by stylist
    const groupedOperations = useMemo(() => {
        return localOps.reduce((acc, op) => {
            if (!acc[op.stylist]) {
                acc[op.stylist] = []
            }
            acc[op.stylist].push(op)
            return acc
        }, {} as Record<string, DailyOperation[]>)
    }, [localOps])

    return (
        <div className="space-y-6">
            {/* Daily Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Servicios</p>
                            <p className="text-2xl font-bold text-primary mt-1">
                                ${totalDailyAmount.toLocaleString("es-CO")}
                            </p>
                        </div>
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Servicios Realizados</p>
                            <p className="text-2xl font-bold mt-1">{localOps.length}</p>
                        </div>
                        <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
                            <Scissors className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estilistas con servicios</p>
                            <p className="text-2xl font-bold mt-1">{Object.keys(groupedOperations).length}</p>
                        </div>
                        <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
                            <Sparkles className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stylists & Services List */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-xl">Servicios del Día por Estilista</CardTitle>
                    <Link href={`/admin/dashboard/ingresos?view=dia&date=${date}`} className="text-sm text-primary hover:underline">
                        Anotar valores en Ingresos →
                    </Link>
                </CardHeader>
                <CardContent>
                    {Object.keys(groupedOperations).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Scissors className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            No hay servicios registrados este día. Los valores se anotan en Ingresos.
                        </div>
                    ) : (
                        <Accordion type="multiple" defaultValue={Object.keys(groupedOperations)} className="space-y-4">
                            {Object.entries(groupedOperations).map(([stylistName, stylistOps]) => {
                                const totalAmount = stylistOps.reduce((sum, op) => sum + op.amount, 0)
                                const allSelected = stylistOps.length > 0 && stylistOps.filter(op => op.status !== 'facturada').every(op => selectedIds.includes(op.id))

                                return (
                                    <AccordionItem key={stylistName} value={stylistName} className="border border-border/70 rounded-xl overflow-hidden shadow-sm">
                                        <div className="flex items-center bg-muted/30 hover:bg-muted/50 transition-colors [&>h3]:flex-1">
                                            {/* Checkbox lives outside the trigger: a button cannot contain another button */}
                                            <div className="pl-4">
                                                <Checkbox
                                                    checked={allSelected}
                                                    onCheckedChange={(checked) => {
                                                        const stylistOpIds = stylistOps.filter(op => op.status !== 'facturada').map(op => op.id)
                                                        if (checked) {
                                                            const toAdd = stylistOpIds.filter(id => !selectedIds.includes(id))
                                                            onSelectionChange([...selectedIds, ...toAdd])
                                                        } else {
                                                            onSelectionChange(selectedIds.filter(id => !stylistOpIds.includes(id)))
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <AccordionTrigger className="flex items-center justify-between p-4 hover:no-underline">
                                                <div className="flex items-center gap-3 text-left flex-1">
                                                    <div className="p-2.5 bg-primary/10 rounded-xl">
                                                        <User className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-lg">{stylistName}</p>
                                                        <p className="text-xs text-muted-foreground font-normal">
                                                            {stylistOps.length} {stylistOps.length === 1 ? "servicio" : "servicios"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right mr-2">
                                                    <p className="text-xl font-extrabold text-primary">${totalAmount.toLocaleString('es-CO')}</p>
                                                    <p className="text-xs text-muted-foreground">Total Estilista</p>
                                                </div>
                                            </AccordionTrigger>
                                        </div>

                                        <AccordionContent className="p-4 border-t bg-card/40">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableHead className="w-[40px]"></TableHead>
                                                        <TableHead>Valor</TableHead>
                                                        <TableHead className="text-right">Estado</TableHead>
                                                        <TableHead className="w-[60px] text-right"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {stylistOps.map((op) => (
                                                        <TableRow key={op.id} className={selectedIds.includes(op.id) ? "bg-[#cba557]/10" : ""}>
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={selectedIds.includes(op.id)}
                                                                    onCheckedChange={() => toggleSelection(op.id)}
                                                                    disabled={op.status === 'facturada'}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="font-semibold">
                                                                ${op.amount.toLocaleString('es-CO')}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${op.status === 'facturada' ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300'}`}>
                                                                    {op.status}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-destructive"
                                                                            disabled={op.status === 'facturada'}
                                                                            title="Eliminar"
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Esta acción eliminará el servicio de {op.stylist} por valor de ${op.amount.toLocaleString('es-CO')}. No se puede deshacer.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDelete(op.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                                Eliminar
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
