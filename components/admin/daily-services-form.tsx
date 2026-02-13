"use client"

import { useState } from "react"
import { addDailyOperation, deleteDailyOperation, updateDailyOperation } from "@/app/actions/daily-operations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, ChevronDown, ChevronUp, User } from "lucide-react"
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

const STYLISTS = ["Damaris", "Fabiola", "Lizday", "Stella", "Karolina"]

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
        try {
            const formattedAmount = parseFloat(amount.replace(/\./g, "").replace(/,/g, ""))

            const result = await addDailyOperation({
                stylist,
                clientName,
                description,
                amount: formattedAmount,
                date,
            })

            if (result && !result.success) {
                toast.error(result.error || "Error al agregar servicio")
                return
            }

            setClientName("")
            setDescription("")
            setAmount("")
            toast.success("Servicio agregado correctamente")
        } catch (error) {
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

            const result = await updateDailyOperation(editingId, {
                stylist: editStylist,
                clientName: editClientName,
                description: editDescription,
                amount: formattedAmount,
            })

            if (result && !result.success) {
                toast.error(result.error || "Error al actualizar servicio")
                return
            }

            setIsEditOpen(false)
            setEditingId(null)
            toast.success("Servicio actualizado correctamente")
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
            await deleteDailyOperation(id)
            toast.success("Servicio eliminado correctamente")
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

    // Group operations by stylist
    const groupedOperations = operations.reduce((acc, op) => {
        if (!acc[op.stylist]) {
            acc[op.stylist] = []
        }
        acc[op.stylist].push(op)
        return acc
    }, {} as Record<string, DailyOperation[]>)

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Registrar Servicio</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="flex gap-4 items-end">
                        <div className="space-y-2 w-[200px]">
                            <label className="text-sm font-medium">Usuario</label>
                            <Select value={stylist} onValueChange={setStylist}>
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
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">Cliente (Opcional)</label>
                            <Input
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                placeholder="Nombre del cliente"
                            />
                        </div>
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">Descripción</label>
                            <Input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Corte, Tinte, Manicure..."
                            />
                        </div>
                        <div className="space-y-2 w-[150px]">
                            <label className="text-sm font-medium">Valor</label>
                            <Input
                                type="text"
                                value={amount}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "")
                                    const formatted = new Intl.NumberFormat("es-CO").format(Number(value))
                                    setAmount(value ? formatted : "")
                                }}
                                placeholder="0"
                            />
                        </div>
                        <Button type="submit" disabled={isSubmitting}>
                            Agregar
                        </Button>
                    </form>
                </CardContent>
            </Card>

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

            <Card>
                <CardHeader>
                    <CardTitle>Servicios del Día por Estilista</CardTitle>
                </CardHeader>
                <CardContent>
                    {Object.keys(groupedOperations).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay servicios registrados hoy
                        </div>
                    ) : (
                        <Accordion type="multiple" className="space-y-4">
                            {Object.entries(groupedOperations).map(([stylistName, stylistOps]) => {
                                const totalAmount = stylistOps.reduce((sum, op) => sum + op.amount, 0)
                                const allSelected = stylistOps.length > 0 && stylistOps.filter(op => op.status !== 'facturada').every(op => selectedIds.includes(op.id))

                                return (
                                    <AccordionItem key={stylistName} value={stylistName} className="border rounded-lg overflow-hidden">
                                        <AccordionTrigger className="flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/30 transition-colors hover:no-underline">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={allSelected}
                                                        onCheckedChange={(checked) => {
                                                            const stylistOpIds = stylistOps.filter(op => op.status !== 'facturada').map(op => op.id)
                                                            if (checked) {
                                                                // Add all from this stylist not already selected
                                                                const toAdd = stylistOpIds.filter(id => !selectedIds.includes(id))
                                                                onSelectionChange([...selectedIds, ...toAdd])
                                                            } else {
                                                                // Remove all from this stylist
                                                                onSelectionChange(selectedIds.filter(id => !stylistOpIds.includes(id)))
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className="p-2 bg-primary/10 rounded-full">
                                                        <User className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-lg">{stylistName}</h3>
                                                        <p className="text-sm text-muted-foreground text-left font-normal">{stylistOps.length} servicios realizados</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right mr-2">
                                                    <p className="text-xl font-bold text-primary">${totalAmount.toLocaleString('es-CO')}</p>
                                                    <p className="text-xs text-muted-foreground">Total Día</p>
                                                </div>
                                                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                                            </div>
                                        </AccordionTrigger>


                                        <AccordionContent className="border-t">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                        <TableHead>Descripción</TableHead>
                                                        <TableHead className="text-right">Valor</TableHead>
                                                        <TableHead className="text-right">Estado</TableHead>
                                                        <TableHead className="w-[100px] text-right">Acciones</TableHead>
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
                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span>{op.description}</span>
                                                                    {op.clientName && (
                                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                            <User className="h-3 w-3" /> {op.clientName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">${op.amount.toLocaleString('es-CO')}</TableCell>
                                                            <TableCell className="text-right">
                                                                <span className={`px-2 py-1 rounded-full text-xs ${op.status === 'facturada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                                    {op.status}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        disabled={op.status === 'facturada'}
                                                                        onClick={() => openEditModal(op)}
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                disabled={op.status === 'facturada'}
                                                                            >
                                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                    Esta acción no se puede deshacer.
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
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </div >
    )
}
