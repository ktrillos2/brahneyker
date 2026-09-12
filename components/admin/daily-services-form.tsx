"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { addDailyOperation, deleteDailyOperation, updateDailyOperation } from "@/app/actions/daily-operations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, ChevronDown, User, PlusCircle, Sparkles, DollarSign, Users, Scissors } from "lucide-react"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

const STYLISTS = ["Damaris", "Fabiola", "Tatiana", "Lizday", "Stella", "Anyeli"]

interface DailyOperation {
    id: string
    stylist: string
    clientName?: string | null
    description: string
    amount: number
    status: string
}

interface DailyServicesFormProps {
    date: string
    operations: DailyOperation[]
    onSelectionChange: (ids: string[]) => void
    selectedIds: string[]
}

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

    // Add Form State
    const [stylist, setStylist] = useState<string>("")
    const [clientName, setClientName] = useState("")
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editStylist, setEditStylist] = useState<string>("")
    const [editClientName, setEditClientName] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editAmount, setEditAmount] = useState("")
    const [isUpdating, setIsUpdating] = useState(false)

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        if (!stylist || !description || !amount) return

        setIsSubmitting(true)
        const formattedAmount = parseFloat(amount.replace(/\./g, "").replace(/,/g, ""))
        const tempId = `temp-${Date.now()}-${Math.random()}`
        const newTempOp: DailyOperation = {
            id: tempId,
            stylist,
            clientName: clientName.trim() || null,
            description: description.trim(),
            amount: formattedAmount,
            status: "pendiente",
        }

        // 1. Optimistic update: instantly update UI so total sums immediately
        setLocalOps(prev => [newTempOp, ...prev])

        try {
            const result = await addDailyOperation({
                stylist,
                clientName: clientName.trim() || undefined,
                description: description.trim(),
                amount: formattedAmount,
                date,
            })

            if (result && !result.success) {
                // Revert optimistic update
                setLocalOps(prev => prev.filter(op => op.id !== tempId))
                toast.error(result.error || "Error al agregar servicio")
                return
            }

            if (result.operation) {
                // Replace temp ID with saved DB record
                setLocalOps(prev => prev.map(op => op.id === tempId ? (result.operation as DailyOperation) : op))
            }

            setDescription("")
            setAmount("")
            toast.success("Servicio agregado y guardado correctamente")
            router.refresh()
        } catch (error) {
            setLocalOps(prev => prev.filter(op => op.id !== tempId))
            toast.error("Error al agregar servicio")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault()
        if (!editingId || !editStylist || !editDescription || !editAmount) return

        setIsUpdating(true)
        try {
            const formattedAmount = parseFloat(editAmount.replace(/\./g, "").replace(/,/g, ""))

            setLocalOps(prev => prev.map(op => op.id === editingId ? {
                ...op,
                stylist: editStylist,
                clientName: editClientName.trim() || null,
                description: editDescription.trim(),
                amount: formattedAmount,
            } : op))

            const result = await updateDailyOperation(editingId, {
                stylist: editStylist,
                clientName: editClientName.trim() || undefined,
                description: editDescription.trim(),
                amount: formattedAmount,
            })

            if (result && !result.success) {
                toast.error(result.error || "Error al actualizar servicio")
                router.refresh()
                return
            }

            setIsEditOpen(false)
            setEditingId(null)
            toast.success("Servicio actualizado correctamente")
            router.refresh()
        } catch (error) {
            toast.error("Error al actualizar servicio")
        } finally {
            setIsUpdating(false)
        }
    }

    function openEditModal(op: DailyOperation) {
        setEditingId(op.id)
        setEditStylist(op.stylist)
        setEditClientName(op.clientName || "")
        setEditDescription(op.description)
        setEditAmount(new Intl.NumberFormat("es-CO").format(op.amount))
        setIsEditOpen(true)
    }

    async function handleDelete(id: string) {
        try {
            setLocalOps(prev => prev.filter(op => op.id !== id))
            onSelectionChange(selectedIds.filter(item => item !== id))
            await deleteDailyOperation(id)
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

    // Quick helper: prefill stylist & client in form to quickly add another service to this client
    const handleAddServiceToClient = (stylistName: string, targetClientName: string) => {
        setStylist(stylistName)
        setClientName(targetClientName === "General / Sin nombre" ? "" : targetClientName)
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    // Daily summary calculations
    const totalDailyAmount = useMemo(() => {
        return localOps.reduce((sum, op) => sum + op.amount, 0)
    }, [localOps])

    const uniqueClientsCount = useMemo(() => {
        const set = new Set<string>()
        localOps.forEach(op => {
            if (op.clientName && op.clientName.trim()) {
                set.add(op.clientName.trim().toLowerCase())
            }
        })
        return set.size
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clientes Atendidas</p>
                            <p className="text-2xl font-bold mt-1">{uniqueClientsCount}</p>
                        </div>
                        <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
                            <Users className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estilistas Activas</p>
                            <p className="text-2xl font-bold mt-1">{Object.keys(groupedOperations).length}</p>
                        </div>
                        <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
                            <Sparkles className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Register Service Form */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-primary" />
                        Registrar Servicio
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                        <div className="space-y-1.5 w-full md:w-[180px]">
                            <label className="text-sm font-medium">Estilista / Usuario *</label>
                            <Select value={stylist} onValueChange={setStylist} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STYLISTS.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <label className="text-sm font-medium">Cliente (Opcional)</label>
                            <Input
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                placeholder="Nombre de la cliente"
                            />
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <label className="text-sm font-medium">Descripción *</label>
                            <Input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Corte, Tinte, Manicure, Pedicura..."
                                required
                            />
                        </div>
                        <div className="space-y-1.5 w-full md:w-[160px]">
                            <label className="text-sm font-medium">Valor ($) *</label>
                            <Input
                                type="text"
                                value={amount}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "")
                                    const formatted = new Intl.NumberFormat("es-CO").format(Number(value))
                                    setAmount(value ? formatted : "")
                                }}
                                placeholder="0"
                                required
                            />
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="min-w-[120px] font-semibold">
                            {isSubmitting ? "Guardando..." : "Agregar"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Edit Service Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Servicio</DialogTitle>
                        <DialogDescription>
                            Modifica los detalles del servicio seleccionado.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-sm font-medium">
                                    Estilista
                                </label>
                                <Select value={editStylist} onValueChange={setEditStylist}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STYLISTS.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-sm font-medium">
                                    Cliente
                                </label>
                                <Input
                                    value={editClientName}
                                    onChange={(e) => setEditClientName(e.target.value)}
                                    className="col-span-3"
                                    placeholder="Nombre del cliente"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-sm font-medium">
                                    Descripción
                                </label>
                                <Input
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-sm font-medium">
                                    Valor
                                </label>
                                <Input
                                    value={editAmount}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "")
                                        const formatted = new Intl.NumberFormat("es-CO").format(Number(value))
                                        setEditAmount(value ? formatted : "")
                                    }}
                                    className="col-span-3"
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating ? "Actualizando..." : "Confirmar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Stylists & Grouped Services List */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl">Servicios del Día por Estilista y Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                    {Object.keys(groupedOperations).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Scissors className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            No hay servicios registrados hoy. Agrega uno en el formulario superior.
                        </div>
                    ) : (
                        <Accordion type="multiple" defaultValue={Object.keys(groupedOperations)} className="space-y-4">
                            {Object.entries(groupedOperations).map(([stylistName, stylistOps]) => {
                                const totalAmount = stylistOps.reduce((sum, op) => sum + op.amount, 0)
                                const allSelected = stylistOps.length > 0 && stylistOps.filter(op => op.status !== 'facturada').every(op => selectedIds.includes(op.id))

                                // Group services by Client under this stylist
                                const clientGroups = stylistOps.reduce((acc, op) => {
                                    const rawName = (op.clientName && op.clientName.trim()) ? op.clientName.trim() : "General / Sin nombre"
                                    if (!acc[rawName]) {
                                        acc[rawName] = []
                                    }
                                    acc[rawName].push(op)
                                    return acc
                                }, {} as Record<string, DailyOperation[]>)

                                return (
                                    <AccordionItem key={stylistName} value={stylistName} className="border border-border/70 rounded-xl overflow-hidden shadow-sm">
                                        <AccordionTrigger className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors hover:no-underline">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div onClick={(e) => e.stopPropagation()}>
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
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className="p-2.5 bg-primary/10 rounded-xl">
                                                        <User className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg">{stylistName}</h3>
                                                        <p className="text-xs text-muted-foreground font-normal">
                                                            {stylistOps.length} {stylistOps.length === 1 ? "servicio" : "servicios"} • {Object.keys(clientGroups).length} {Object.keys(clientGroups).length === 1 ? "cliente" : "clientes"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right mr-2">
                                                    <p className="text-xl font-extrabold text-primary">${totalAmount.toLocaleString('es-CO')}</p>
                                                    <p className="text-xs text-muted-foreground">Total Estilista</p>
                                                </div>
                                                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                                            </div>
                                        </AccordionTrigger>

                                        <AccordionContent className="p-4 space-y-4 border-t bg-card/40">
                                            {Object.entries(clientGroups).map(([groupClientName, clientOps]) => {
                                                const clientTotal = clientOps.reduce((sum, op) => sum + op.amount, 0)
                                                const allClientSelected = clientOps.filter(op => op.status !== 'facturada').every(op => selectedIds.includes(op.id))

                                                return (
                                                    <div key={groupClientName} className="border border-border/60 rounded-xl p-3 bg-background/80 shadow-xs space-y-3">
                                                        {/* Client Subtotal Bar */}
                                                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/40">
                                                            <div className="flex items-center gap-2">
                                                                <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                                                                    <User className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold text-sm text-foreground">
                                                                            {groupClientName}
                                                                        </span>
                                                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                                            {clientOps.length} {clientOps.length === 1 ? "servicio" : "servicios"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <div className="text-right">
                                                                    <span className="text-xs text-muted-foreground mr-1.5">Total Cliente:</span>
                                                                    <span className="text-base font-bold text-primary">
                                                                        ${clientTotal.toLocaleString('es-CO')}
                                                                    </span>
                                                                </div>

                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleAddServiceToClient(stylistName, groupClientName)}
                                                                    className="h-8 text-xs flex items-center gap-1.5 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                                                                >
                                                                    <PlusCircle className="w-3.5 h-3.5" />
                                                                    + Servicio
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Table of services for this client */}
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="hover:bg-transparent">
                                                                    <TableHead className="w-[40px]"></TableHead>
                                                                    <TableHead>Servicio / Descripción</TableHead>
                                                                    <TableHead className="text-right">Valor</TableHead>
                                                                    <TableHead className="text-right">Estado</TableHead>
                                                                    <TableHead className="w-[90px] text-right">Acciones</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {clientOps.map((op) => (
                                                                    <TableRow key={op.id} className={selectedIds.includes(op.id) ? "bg-[#cba557]/10" : ""}>
                                                                        <TableCell>
                                                                            <Checkbox
                                                                                checked={selectedIds.includes(op.id)}
                                                                                onCheckedChange={() => toggleSelection(op.id)}
                                                                                disabled={op.status === 'facturada'}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell className="font-medium">
                                                                            {op.description}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-semibold">
                                                                            ${op.amount.toLocaleString('es-CO')}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${op.status === 'facturada' ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300'}`}>
                                                                                {op.status}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <div className="flex items-center justify-end gap-1">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8"
                                                                                    disabled={op.status === 'facturada'}
                                                                                    onClick={() => openEditModal(op)}
                                                                                    title="Editar"
                                                                                >
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                                                                </Button>
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
                                                                                                Esta acción eliminará el servicio "{op.description}" por valor de ${op.amount.toLocaleString('es-CO')}. No se puede deshacer.
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
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                )
                                            })}
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
