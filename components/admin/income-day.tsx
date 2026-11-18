"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Check, Lock, Plus, X } from "lucide-react"
import { toast } from "sonner"

import {
    addDailyOperation,
    addDailyProductSale,
    deleteDailyOperation,
    deleteDailyProductSale,
    updateDailyOperationAmount,
} from "@/app/actions/daily-operations"
import { closeDay } from "@/app/actions/closures"
import { ProductPicker, type PickedProduct } from "./product-picker"
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
import { Input } from "@/components/ui/input"
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

interface Closure {
    closedAt: string | null
}

interface IncomeDayProps {
    date: string
    columns: string[]
    operations: Operation[]
    productSales: ProductSale[]
    closure: Closure | null
    canClose: boolean
}

export const money = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`

// Amounts are written in thousands like on paper: "45" means $45.000.
export function parseAmount(raw: string) {
    const value = Number(raw.replace(/[^\d]/g, ""))
    if (!value) return 0
    return value < 1000 ? value * 1000 : value
}

// Inverse of parseAmount, to prefill the edit input the same way it is typed.
const toInputValue = (amount: number) => String(amount % 1000 === 0 && amount < 1_000_000 ? amount / 1000 : amount)

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
                    placeholder="0"
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

function OperationItem({ op, locked, onChanged }: { op: Operation; locked: boolean; onChanged: () => void }) {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState("")
    const [saving, setSaving] = useState(false)
    const editable = !locked && op.status !== "facturada"
    const amount = parseAmount(value)

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || saving) return
        if (amount === op.amount) {
            setEditing(false)
            return
        }
        setSaving(true)
        try {
            const result = await updateDailyOperationAmount(op.id, amount)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setEditing(false)
            onChanged()
        } catch (error) {
            console.error(error)
            toast.error("Error al actualizar el valor")
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        if (!confirm(`¿Eliminar el servicio de ${op.stylist} por ${money(op.amount)}?`)) return
        try {
            const result = await deleteDailyOperation(op.id)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            onChanged()
        } catch (error) {
            console.error(error)
            toast.error("Error al eliminar servicio")
        }
    }

    if (editing) {
        return (
            <li>
                <form onSubmit={save} className="space-y-1">
                    <div className="flex gap-1">
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                            inputMode="numeric"
                            className="h-7 text-sm"
                            autoFocus
                            disabled={saving}
                            aria-label="Nuevo valor"
                        />
                        <button type="submit" disabled={!amount || saving} className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40" title="Guardar">
                            <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setEditing(false)} className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md border" title="Cancelar">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    {amount > 0 && <p className="text-xs text-muted-foreground">= {money(amount)}</p>}
                </form>
            </li>
        )
    }

    return (
        <li
            className="group flex items-center justify-between gap-2 tabular-nums"
            title={[op.description, op.clientName].filter(Boolean).join(" · ")}
        >
            {editable ? (
                <button
                    type="button"
                    onClick={() => {
                        setValue(toInputValue(op.amount))
                        setEditing(true)
                    }}
                    className="hover:text-primary hover:underline underline-offset-2"
                    title="Editar valor"
                >
                    {money(op.amount)}
                </button>
            ) : (
                <span className={cn(op.status === "facturada" && "text-muted-foreground")}>{money(op.amount)}</span>
            )}
            {op.status === "facturada" ? (
                <Check className="h-3.5 w-3.5 text-green-600" aria-label="Facturado" />
            ) : editable ? (
                <button
                    type="button"
                    onClick={remove}
                    className="text-muted-foreground hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
                    title="Eliminar"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            ) : null}
        </li>
    )
}

export function IncomeDay({ date, columns, operations, productSales, closure, canClose }: IncomeDayProps) {
    const router = useRouter()
    const [product, setProduct] = useState<PickedProduct | null>(null)
    const [quantity, setQuantity] = useState("1")
    const [busy, setBusy] = useState(false)
    const [closing, setClosing] = useState(false)
    const locked = closure !== null

    const refresh = () => router.refresh()

    const removeSale = async (sale: ProductSale) => {
        if (!confirm(`¿Eliminar la venta de ${sale.productName ?? "producto"}?`)) return
        try {
            const result = await deleteDailyProductSale(sale.id)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al eliminar venta")
        }
    }

    const addSale = async (e: React.FormEvent) => {
        e.preventDefault()
        const qty = Number(quantity)
        if (!product || !qty || qty < 1) return
        setBusy(true)
        try {
            const result = await addDailyProductSale({ productId: product.id, quantity: qty, date })
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setProduct(null)
            setQuantity("1")
            refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al registrar venta")
        } finally {
            setBusy(false)
        }
    }

    const handleClose = async () => {
        setClosing(true)
        try {
            const result = await closeDay(date)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success("Caja cerrada")
            refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al cerrar la caja")
        } finally {
            setClosing(false)
        }
    }

    const byStylist = (name: string) => operations.filter((op) => op.stylist === name)
    const columnTotal = (name: string) => byStylist(name).reduce((sum, op) => sum + op.amount, 0)
    const saleTotal = (sale: ProductSale) => sale.quantity * (sale.productPrice || 0)
    const servicesTotal = operations.reduce((sum, op) => sum + op.amount, 0)
    const productsTotal = productSales.reduce((sum, sale) => sum + saleTotal(sale), 0)
    const dayLabel = format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })

    return (
        <div className="space-y-6">
            {locked && (
                <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
                    <Lock className="h-5 w-5 shrink-0 text-primary" />
                    <p>
                        <strong>Caja cerrada.</strong> Los valores de este día ya no se pueden agregar, editar ni eliminar.
                        {closure?.closedAt && (
                            <span className="text-muted-foreground">
                                {" "}Cerrada el {new Date(closure.closedAt.replace(" ", "T") + "Z").toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
                            </span>
                        )}
                    </p>
                </div>
            )}

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
                                            <OperationItem key={op.id} op={op} locked={locked} onChanged={refresh} />
                                        ))}
                                    </ul>
                                    {!locked && <AmountInput stylist={name} date={date} onAdded={refresh} />}
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
                                                ) : !locked ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSale(sale)}
                                                        className="text-muted-foreground hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
                                                        title="Eliminar"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                ) : null}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {!locked && (
                                    <form onSubmit={addSale} className="flex gap-1">
                                        <ProductPicker value={product} onChange={setProduct} disabled={busy} />
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
                                            disabled={!product || busy}
                                            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                                            title="Agregar producto"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </form>
                                )}
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

            {!locked && canClose && (
                <div className="flex justify-end">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="lg" disabled={closing}>
                                <Lock className="h-4 w-4 mr-2" />
                                {closing ? "Cerrando..." : "Cerrar caja"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Cerrar la caja del {dayLabel}?</AlertDialogTitle>
                                <AlertDialogDescription asChild>
                                    <div className="space-y-2">
                                        <p>
                                            Servicios {money(servicesTotal)} + Productos {money(productsTotal)} ={" "}
                                            <strong className="text-foreground">{money(servicesTotal + productsTotal)}</strong>
                                        </p>
                                        <p>Después de cerrar ya no se podrán agregar, editar ni eliminar valores de este día.</p>
                                    </div>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClose}>Sí, cerrar caja</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                Escribe los valores en miles como en el cuaderno: 45 = $45.000. Para corregir un valor, haz clic sobre él.
                Los valores con <Check className="inline h-3 w-3 text-green-600" /> ya están facturados.
            </p>
        </div>
    )
}
