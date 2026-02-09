"use client"

import { useState } from "react"
import { addDailyOperation, deleteDailyOperation } from "@/app/actions/daily-operations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

const STYLISTS = ["Damaris", "Fabiola", "Lizday", "Stella", "Karolina"]

interface DailyOperation {
    id: string
    stylist: string
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
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!stylist || !description || !amount) return

        setIsSubmitting(true)
        try {
            await addDailyOperation({
                stylist,
                description,
                amount: parseFloat(amount.replace(/\./g, "").replace(/,/g, "")),
                date,
            })
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
                    <CardTitle>Servicios del Día</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={operations.length > 0 && operations.filter(op => op.status !== 'facturada').every(op => selectedIds.includes(op.id))}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                const availableIds = operations.filter(op => op.status !== 'facturada').map(op => op.id)
                                                onSelectionChange(availableIds)
                                            } else {
                                                onSelectionChange([])
                                            }
                                        }}
                                    />
                                </TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {operations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No hay servicios registrados hoy
                                    </TableCell>
                                </TableRow>
                            ) : (
                                operations.map((op) => (
                                    <TableRow
                                        key={op.id}
                                        className={selectedIds.includes(op.id) ? "bg-[#cba557]/20 hover:bg-[#cba557]/30 data-[state=selected]:bg-[#cba557]/20" : ""}
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(op.id)}
                                                onCheckedChange={() => toggleSelection(op.id)}
                                                disabled={op.status === 'facturada'}
                                            />
                                        </TableCell>
                                        <TableCell>{op.stylist}</TableCell>
                                        <TableCell>{op.description}</TableCell>
                                        <TableCell className="text-right">${op.amount.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs ${op.status === 'facturada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {op.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(op.id)}
                                                disabled={op.status === 'facturada'}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
