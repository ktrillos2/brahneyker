"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronsUpDown, Loader2, Search } from "lucide-react"

import { searchProducts } from "@/app/actions/daily-operations"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface PickedProduct {
    id: string
    name: string
    price: number
    quantity: number
}

interface ProductPickerProps {
    value: PickedProduct | null
    onChange: (product: PickedProduct) => void
    disabled?: boolean
}

const money = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`

// Searchable product selector that loads 20 products per page from the server.
export function ProductPicker({ value, onChange, disabled }: ProductPickerProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [items, setItems] = useState<PickedProduct[]>([])
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(false)
    const requestId = useRef(0)

    const load = async (term: string, offset: number) => {
        const id = ++requestId.current
        setLoading(true)
        try {
            const result = await searchProducts(term, offset)
            if (id !== requestId.current) return
            setItems((prev) => (offset === 0 ? result.products : [...prev, ...result.products]))
            setHasMore(result.hasMore)
        } catch (error) {
            console.error("Error searching products:", error)
        } finally {
            if (id === requestId.current) setLoading(false)
        }
    }

    useEffect(() => {
        if (!open) return
        const timeout = setTimeout(() => load(query, 0), 250)
        return () => clearTimeout(timeout)
    }, [query, open])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className="h-8 flex-1 min-w-0 flex items-center justify-between gap-1 rounded-md border bg-transparent px-2 text-sm disabled:opacity-50"
                >
                    <span className={cn("truncate", !value && "text-muted-foreground")}>
                        {value ? value.name : "Buscar producto"}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
                <div className="flex items-center gap-2 border-b px-3">
                    <Search className="h-4 w-4 shrink-0 opacity-50" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Escribe para buscar..."
                        className="h-10 w-full bg-transparent text-sm outline-none"
                        autoFocus
                    />
                    {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-50" />}
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                    {!loading && items.length === 0 && (
                        <p className="py-6 text-center text-sm text-muted-foreground">No se encontraron productos.</p>
                    )}
                    {items.map((product) => (
                        <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                                onChange(product)
                                setOpen(false)
                            }}
                            className={cn(
                                "w-full flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
                                value?.id === product.id && "bg-muted"
                            )}
                        >
                            <span className="truncate">{product.name}</span>
                            <span className="shrink-0 text-muted-foreground tabular-nums">{money(product.price)}</span>
                        </button>
                    ))}
                    {hasMore && (
                        <button
                            type="button"
                            onClick={() => load(query, items.length)}
                            disabled={loading}
                            className="w-full rounded-sm px-2 py-1.5 text-center text-sm text-primary hover:bg-muted disabled:opacity-50"
                        >
                            Ver más productos
                        </button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
