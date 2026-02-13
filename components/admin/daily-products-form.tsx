"use client"

import { useState } from "react"
import { addDailyProductSale, deleteDailyProductSale } from "@/app/actions/daily-operations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Check, ChevronsUpDown, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
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

interface Product {
    id: string
    name: string
    price: number
    quantity: number // stock
    barcode: string
}

interface DailyProductSale {
    id: string
    productId: string
    productName: string | null
    productPrice: number | null
    quantity: number
    status: string
}

interface DailyProductsFormProps {
    date: string
    products: Product[]
    sales: DailyProductSale[]
    onSelectionChange: (ids: string[]) => void
    selectedIds: string[]
}

export function DailyProductsForm({ date, products, sales, onSelectionChange, selectedIds }: DailyProductsFormProps) {
    const [productId, setProductId] = useState<string>("")
    const [quantity, setQuantity] = useState("1")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [open, setOpen] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!productId || !quantity) return

        setIsSubmitting(true)
        try {
            const result = await addDailyProductSale({
                productId,
                quantity: parseInt(quantity),
                date,
            })

            if (result && !result.success) {
                toast.error(result.error || "Error al agregar producto")
                return
            }

            setProductId("")
            setQuantity("1")
            setOpen(false)
            toast.success("Producto agregado")
        } catch (error) {
            toast.error("Error al agregar producto")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteDailyProductSale(id)
            toast.success("Venta eliminada")
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
                    <CardTitle>Registrar Venta de Producto</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">Producto</label>
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full justify-between h-12 bg-primary/10 border-primary text-foreground"
                                    >
                                        {productId
                                            ? products.find((p) => p.id === productId)?.name
                                            : "Seleccionar producto..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command filter={(value, search) => {
                                        const product = products.find(p => p.id === value)
                                        if (!product) return 0
                                        const searchLower = search.toLowerCase()
                                        const nameMatch = product.name.toLowerCase().includes(searchLower)
                                        const barcodeMatch = product.barcode?.toLowerCase().includes(searchLower)
                                        return nameMatch || barcodeMatch ? 1 : 0
                                    }}>
                                        <CommandInput placeholder="Buscar por nombre o código..." />
                                        <CommandList>
                                            <CommandEmpty>No se encontró producto.</CommandEmpty>
                                            <CommandGroup>
                                                {products.map((product) => (
                                                    <CommandItem
                                                        key={product.id}
                                                        value={product.id}
                                                        onSelect={(currentValue) => {
                                                            setProductId(currentValue === productId ? "" : currentValue)
                                                            setOpen(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                productId === product.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span>{product.name}</span>
                                                            <span className="text-xs text-white">
                                                                ${product.price} - Stock: {product.quantity} - {product.barcode}
                                                            </span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2 w-[150px]">
                            <label className="text-sm font-medium">Cantidad</label>
                            <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
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
                    <CardTitle>Ventas del Día</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={sales.length > 0 && sales.filter(s => s.status !== 'facturada').every(s => selectedIds.includes(s.id))}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                const availableIds = sales.filter(s => s.status !== 'facturada').map(s => s.id)
                                                onSelectionChange(availableIds)
                                            } else {
                                                onSelectionChange([])
                                            }
                                        }}
                                    />
                                </TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sales.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No hay ventas registradas hoy
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sales.map((sale) => (
                                    <TableRow
                                        key={sale.id}
                                        className={selectedIds.includes(sale.id) ? "bg-[#cba557]/20 hover:bg-[#cba557]/30 data-[state=selected]:bg-[#cba557]/20" : ""}
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(sale.id)}
                                                onCheckedChange={() => toggleSelection(sale.id)}
                                                disabled={sale.status === 'facturada'}
                                            />
                                        </TableCell>
                                        <TableCell>{sale.productName}</TableCell>
                                        <TableCell className="text-right">{sale.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            ${((sale.productPrice || 0) * sale.quantity).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs ${sale.status === 'facturada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {sale.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={sale.status === 'facturada'}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(sale.id)} className="bg-destructive text-white hover:bg-destructive/90">
                                                            Eliminar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
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
