"use client"

import { useState } from "react"
import { addDailyOperation, deleteDailyOperation } from "@/app/actions/daily-operations"
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
    const [stylist, setStylist] = useState<string>("")
    const [clientName, setClientName] = useState("")
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!stylist || !description || !amount) return

        setIsSubmitting(true)
        try {
            const result = await addDailyOperation({
                stylist,
                clientName,
                description,
                amount: parseFloat(amount.replace(/\./g, "").replace(/,/g, "")),
                date,
            })

            if (result && !result.success) {
                toast.error(result.error || "Error al agregar servicio")
                return
            }

            setClientName("")
            setDescription("")
            setAmount("")
            toast.success("Servicio agregado")
        } catch (error) {
            toast.error("Error al agregar servicio")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteDailyOperation(id)
            toast.success("Servicio eliminado")
        } catch (error) {
            toast.error("Error al eliminar")
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
                    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
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
                                        <div className="flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-4 flex-1">
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
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 rounded-full">
                                                        <User className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-lg">{stylistName}</h3>
                                                        <p className="text-sm text-muted-foreground">{stylistOps.length} servicios realizados</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right mr-2">
                                                    <p className="text-xl font-bold text-primary">${totalAmount.toLocaleString()}</p>
                                                    <p className="text-xs text-muted-foreground">Total Día</p>
                                                </div>
                                                <AccordionTrigger className="hover:no-underline py-0 pr-2">
                                                    <span className="sr-only">Ver detalles</span>
                                                </AccordionTrigger>
                                            </div>
                                        </div>

                                        <AccordionContent className="border-t">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                        <TableHead>Descripción</TableHead>
                                                        <TableHead className="text-right">Valor</TableHead>
                                                        <TableHead className="text-right">Estado</TableHead>
                                                        <TableHead className="w-[50px]"></TableHead>
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
                                                            <TableCell className="text-right">${op.amount.toLocaleString()}</TableCell>
                                                            <TableCell className="text-right">
                                                                <span className={`px-2 py-1 rounded-full text-xs ${op.status === 'facturada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                                    {op.status}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
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
