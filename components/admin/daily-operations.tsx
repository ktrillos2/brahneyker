"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { generateInvoiceFromDaily } from "@/app/actions/daily-operations"
import { DailyServicesForm } from "./daily-services-form"
import { DailyProductsForm } from "./daily-products-form"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface DailyOperationsProps {
    date: string
    operations: any[]
    productSales: any[]
    products: any[]
}

export function DailyOperations({ date, operations, productSales, products }: DailyOperationsProps) {
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(date + 'T00:00:00'))
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
    const [selectedProductSaleIds, setSelectedProductSaleIds] = useState<string[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [activeTab, setActiveTab] = useState("services")

    const handleDateSelect = (date: Date | undefined) => {
        setSelectedDate(date)
        if (date) {
            router.push(`?date=${format(date, 'yyyy-MM-dd')}`)
        }
    }

    const totalSelected = selectedServiceIds.length + selectedProductSaleIds.length

    const handleGenerateInvoice = async () => {
        if (totalSelected === 0) return

        setIsGenerating(true)
        try {
            const result = await generateInvoiceFromDaily(
                date,
                selectedServiceIds,
                selectedProductSaleIds
            )
            if (result.success) {
                toast.success("Factura generada exitosamente")
                setSelectedServiceIds([])
                setSelectedProductSaleIds([])
                router.refresh()
            }
        } catch (error) {
            toast.error("Error al generar factura")
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Facturación Diaria</h1>
                    <p className="text-muted-foreground">
                        Gestiona servicios y ventas del día para generar facturas.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                initialFocus
                                locale={es}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="text-sm">
                    <span className="font-semibold">{totalSelected}</span> ítems seleccionados para facturar
                </div>
                <Button
                    onClick={handleGenerateInvoice}
                    disabled={totalSelected === 0 || isGenerating}
                >
                    {isGenerating ? "Generando..." : "Generar Factura General"}
                </Button>
            </div>

            <Tabs defaultValue="services" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 h-auto bg-transparent border-0 p-0">
                    <TabsTrigger
                        value="services"
                        className="py-3 text-base font-medium rounded-lg transition-all border border-transparent"
                        style={{
                            backgroundColor: activeTab === "services" ? "var(--primary)" : "transparent",
                            color: activeTab === "services" ? "var(--primary-foreground)" : "inherit",
                            fontWeight: activeTab === "services" ? "bold" : "normal",
                        }}
                    >
                        Servicios
                    </TabsTrigger>
                    <TabsTrigger
                        value="products"
                        className="py-3 text-base font-medium rounded-lg transition-all border border-transparent"
                        style={{
                            backgroundColor: activeTab === "products" ? "var(--primary)" : "transparent",
                            color: activeTab === "products" ? "var(--primary-foreground)" : "inherit",
                            fontWeight: activeTab === "products" ? "bold" : "normal",
                        }}
                    >
                        Productos
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="services" className="space-y-4">
                    <DailyServicesForm
                        date={date}
                        operations={operations}
                        selectedIds={selectedServiceIds}
                        onSelectionChange={setSelectedServiceIds}
                    />
                </TabsContent>
                <TabsContent value="products" className="space-y-4">
                    <DailyProductsForm
                        date={date}
                        products={products}
                        sales={productSales}
                        selectedIds={selectedProductSaleIds}
                        onSelectionChange={setSelectedProductSaleIds}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
