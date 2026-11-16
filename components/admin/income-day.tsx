"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Plus, X } from "lucide-react"
import { toast } from "sonner"

import {
    addDailyOperation,
    addDailyProductSale,
    deleteDailyOperation,
    deleteDailyProductSale,
} from "@/app/actions/daily-operations"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Operation {
    id: string
    stylist: string
    clientName: string | null
    description: string
    amount: number
    status: string
}

interface ProductSale {
    id: string
    quantity: number
    status: string
    productName: string | null
    productPrice: number | null
}

interface ProductOption {
    id: string
    name: string
    price: number
    quantity: number
}

interface IncomeDayProps {
    date: string
    columns: string[]
    operations: Operation[]
    productSales: ProductSale[]
    products: ProductOption[]
}

export const money = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`

// Amounts are written in thousands like on paper: "45" means $45.000.
export function parseAmount(raw: string) {
    const value = Number(raw.replace(/[^\d]/g, ""))
    if (!value) return 0
    return value < 1000 ? value * 1000 : value
}

function AmountInput({ stylist, date, onAdded }: { stylist: string; date: string; onAdded: () => void }) {
    const [value, setValue] = useState("")
    const [saving, setSaving] = useState(false)
    const amount = parseAmount(value)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || saving) return
        setSaving(true)
        try {
            const result = await addDailyOperation({ stylist, date, amount, description: "Servicio" })
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setValue("")
            onAdded()
        } catch (error) {
            console.error(error)
            toast.error("Error al registrar servicio")
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={submit} className="space-y-1">
            <div className="flex gap-1">
                <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    inputMode="numeric"
                    placeholder="45"
                    className="h-8 text-sm"
                    disabled={saving}
                    aria-label={`Agregar servicio de ${stylist}`}
                />
                <button
                    type="submit"
                    disabled={!amount || saving}
                    className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                    title="Agregar"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>
            {amount > 0 && <p className="text-xs text-muted-foreground">= {money(amount)}</p>}
        </form>
    )
}

export function IncomeDay({ date, columns, operations, productSales, products }: IncomeDayProps) {
    const router = useRouter()
    const [productId, setProductId] = useState("")
    const [quantity, setQuantity] = useState("1")
    const [busy, setBusy] = useState(false)

    const refresh = () => router.refresh()

    const removeOperation = async (op: Operation) => {
        if (!confirm(`¿Eliminar el servicio de ${op.stylist} por ${money(op.amount)}?`)) return
        try {
            await deleteDailyOperation(op.id)
            refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al eliminar servicio")
        }
    }

    const removeSale = async (sale: ProductSale) => {
        if (!confirm(`¿Eliminar la venta de ${sale.productName ?? "producto"}?`)) return
        try {
            await deleteDailyProductSale(sale.id)
            refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al eliminar venta")
        }
    }

    const addSale = async (e: React.FormEvent) => {
        e.preventDefault()
        const qty = Number(quantity)
        if (!productId || !qty || qty < 1) return
        setBusy(true)
        try {
            const result = await addDailyProductSale({ productId, quantity: qty, date })
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setProductId("")
            setQuantity("1")
            refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al registrar venta")
        } finally {
            setBusy(false)
        }
    }

    const byStylist = (name: string) => operations.filter((op) => op.stylist === name)
    const columnTotal = (name: string) => byStylist(name).reduce((sum, op) => sum + op.amount, 0)
    const saleTotal = (sale: ProductSale) => sale.quantity * (sale.productPrice || 0)
    const servicesTotal = operations.reduce((sum, op) => sum + op.amount, 0)
    const productsTotal = productSales.reduce((sum, sale) => sum + saleTotal(sale), 0)

    return (
        <div className="space-y-6">
            <div className="relative border rounded-lg bg-card overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b bg-muted/30">
                            {columns.map((name) => (
                                <th key={name} className="min-w-[120px] px-3 py-2 text-left font-semibold border-r">
                                    {name}
                                </th>
                            ))}
                            <th className="min-w-[240px] px-3 py-2 text-left font-semibold">Productos</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="align-top">
                            {columns.map((name) => (
                                <td key={name} className="px-3 py-2 border-r">
                                    <ul className="space-y-1 mb-3">
                                        {byStylist(name).map((op) => (
                                            <li
                                                key={op.id}
                                                className="group flex items-center justify-between gap-2 tabular-nums"
                                                title={[op.description, op.clientName].filter(Boolean).join(" · ")}
                                            >
                                                <span className={cn(op.status === "facturada" && "text-muted-foreground")}>
                                                    {money(op.amount)}
                                                </span>
                                                {op.status === "facturada" ? (
                                                    <Check className="h-3.5 w-3.5 text-green-600" aria-label="Facturado" />
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOperation(op)}
                                                        className="text-muted-foreground hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
                                                        title="Eliminar"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    <AmountInput stylist={name} date={date} onAdded={refresh} />
                                </td>
                            ))}
                            <td className="px-3 py-2">
                                <ul className="space-y-1 mb-3">
                                    {productSales.map((sale) => (
                                        <li key={sale.id} className="group flex items-center justify-between gap-2">
                                            <span className={cn("truncate", sale.status === "facturada" && "text-muted-foreground")}>
                                                {sale.productName ?? "Producto eliminado"}
                                                {sale.quantity > 1 && <span className="text-muted-foreground"> ×{sale.quantity}</span>}
                                            </span>
                                            <span className="flex items-center gap-2 tabular-nums shrink-0">
                                                {money(saleTotal(sale))}
                                                {sale.status === "facturada" ? (
                                                    <Check className="h-3.5 w-3.5 text-green-600" aria-label="Facturado" />
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSale(sale)}
                                                        className="text-muted-foreground hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
                                                        title="Eliminar"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <form onSubmit={addSale} className="flex gap-1">
                                    <Select value={productId} onValueChange={setProductId} disabled={busy}>
                                        <SelectTrigger className="h-8 text-sm flex-1 min-w-0">
                                            <SelectValue placeholder="Producto" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name} — {money(p.price)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        type="number"
                                        min={1}
                                        className="h-8 w-14 text-sm"
                                        aria-label="Cantidad"
                                        disabled={busy}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!productId || busy}
                                        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                                        title="Agregar producto"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </form>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 bg-muted/30 font-bold tabular-nums">
                            {columns.map((name) => (
                                <td key={name} className="px-3 py-2 border-r">{money(columnTotal(name))}</td>
                            ))}
                            <td className="px-3 py-2">{money(productsTotal)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Servicios</p>
                    <p className="text-2xl font-bold tabular-nums">{money(servicesTotal)}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Productos</p>
                    <p className="text-2xl font-bold tabular-nums">{money(productsTotal)}</p>
                </div>
                <div className="rounded-lg border bg-primary/10 p-4">
                    <p className="text-sm text-muted-foreground">Total del día</p>
                    <p className="text-2xl font-bold text-primary tabular-nums">{money(servicesTotal + productsTotal)}</p>
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                Escribe los valores en miles como en el cuaderno: 45 = $45.000. Los valores con <Check className="inline h-3 w-3 text-green-600" /> ya están facturados.
                Para agregar el detalle o la cliente de un servicio, usa Facturación Diaria.
            </p>
        </div>
    )
}
