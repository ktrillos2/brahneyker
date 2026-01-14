"use client"

import type React from "react"
import { Suspense } from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { getProducts } from "@/app/actions/inventory"
import {
  Search,
  Plus,
  Trash2,
  Printer,
  FileText,
  X,
  Package,
  Eye,
  ChevronDown,
  ChevronUp,
  ScanLine,
} from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
  barcode: string
  quantity: number
}

interface InvoiceItem {
  productId: string
  name: string
  price: number
  quantity: number
  barcode: string
}

interface Invoice {
  id: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  date: string
  customerName: string
  customerPhone: string
}

function FacturasContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [currentItems, setCurrentItems] = useState<InvoiceItem[]>([])
  const [barcodeInput, setBarcodeInput] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const printRef = useRef<HTMLDivElement>(null)


  // Calculate product popularity based on invoice history
  const sortedAvailableProducts = useMemo(() => {
    // 1. Calculate frequency map
    const productCounts: Record<string, number> = {}
    invoices.forEach(inv => {
      inv.items.forEach(item => {
        productCounts[item.productId] = (productCounts[item.productId] || 0) + (item.quantity || 1)
      })
    })

    // 2. Sort products by frequency (descending)
    // 3. Filter out products that are already in currentItems
    // 4. Filter out out-of-stock products
    return [...products]
      .filter(p => p.quantity > 0) // Must have stock
      .filter(p => !currentItems.some(item => item.productId === p.id)) // Must not be in current invoice
      .sort((a, b) => {
        const countA = productCounts[a.id] || 0
        const countB = productCounts[b.id] || 0
        return countB - countA // Higher count first
      })
      .slice(0, 20) // Limit to top 20 to ensure it always looks full
  }, [products, invoices, currentItems])
  useEffect(() => {
    // Fetch products from DB
    const fetchProducts = async () => {
      try {
        const { products: dbProducts } = await getProducts(1, 1000) // Fetch top 1000 products for billing
        setProducts(dbProducts)
      } catch (error) {
        console.error("Error fetching products:", error)
        showNotification("Error al cargar productos", "error")
      }
    }

    fetchProducts()

    // Load invoices from LocalStorage (persisted only locally for now)
    const storedInvoices = localStorage.getItem("invoices")
    if (storedInvoices) setInvoices(JSON.parse(storedInvoices))
  }, [])

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const product = products.find((p) => p.barcode === barcodeInput)

    if (!product) {
      showNotification("Producto no encontrado", "error")
      setBarcodeInput("")
      return
    }

    if (product.quantity <= 0) {
      showNotification("Producto sin stock disponible", "error")
      setBarcodeInput("")
      return
    }

    const existingItem = currentItems.find((item) => item.productId === product.id)

    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        showNotification("No hay más stock disponible de este producto", "error")
        setBarcodeInput("")
        return
      }

      setCurrentItems(
        currentItems.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item)),
      )
    } else {
      setCurrentItems([
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          barcode: product.barcode,
        },
        ...currentItems,
      ])
    }

    showNotification(`${product.name} agregado`, "success")
    setBarcodeInput("")
    barcodeInputRef.current?.focus()
  }

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    if (newQuantity <= 0) {
      removeItem(productId)
      return
    }

    if (newQuantity > product.quantity) {
      showNotification("No hay suficiente stock", "error")
      return
    }

    setCurrentItems(
      currentItems.map((item) => (item.productId === productId ? { ...item, quantity: newQuantity } : item)),
    )
  }

  const removeItem = (productId: string) => {
    setCurrentItems(currentItems.filter((item) => item.productId !== productId))
  }

  const deleteInvoice = (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta factura?")) return

    const updated = invoices.filter(inv => inv.id !== id)
    setInvoices(updated)
    localStorage.setItem("invoices", JSON.stringify(updated))
    showNotification("Factura eliminada", "success")
  }


  const subtotal = currentItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = 0
  const total = subtotal + tax

  const handleGenerateInvoice = () => {
    if (currentItems.length === 0) {
      showNotification("Agregue productos a la factura", "error")
      return
    }

    // Update product quantities
    const updatedProducts = products.map((product) => {
      const invoiceItem = currentItems.find((item) => item.productId === product.id)
      if (invoiceItem) {
        return { ...product, quantity: product.quantity - invoiceItem.quantity }
      }
      return product
    })

    localStorage.setItem("products", JSON.stringify(updatedProducts))
    setProducts(updatedProducts)

    // Create invoice
    const newInvoice: Invoice = {
      id: `FAC-${Date.now()}`,
      items: currentItems,
      subtotal,
      tax,
      total,
      date: new Date().toISOString(),
      customerName: customerName || "Cliente General",
      customerPhone: customerPhone || "N/A",
    }

    const updatedInvoices = [newInvoice, ...invoices]
    localStorage.setItem("invoices", JSON.stringify(updatedInvoices))
    setInvoices(updatedInvoices)
    setSelectedInvoice(newInvoice)

    // Clear form
    setCurrentItems([])
    setCustomerName("")
    setCustomerPhone("")

    showNotification("Factura generada exitosamente", "success")

    // Auto-print
    setTimeout(() => {
      handlePrint()
    }, 500)
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open("", "_blank", "width=400,height=600")
    if (!printWindow) return

    const invoiceToPrint = selectedInvoice || {
      id: `FAC-${Date.now()}`,
      items: currentItems,
      subtotal,
      tax,
      total,
      date: new Date().toISOString(),
      customerName: customerName || "Cliente General",
      customerPhone: customerPhone || "N/A",
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura ${invoiceToPrint.id}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', monospace;
              font-family: 'Courier New', monospace;
              font-size: 14px;
              font-weight: 600;
              padding: 10px;
              width: 80mm;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .header h1 {
              font-size: 20px;
              margin: 0;
            }
            .header p {
              margin: 2px 0;
              font-size: 12px;
            }
            .info {
              margin-bottom: 10px;
              font-size: 13px;
            }
            .items {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 10px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .item-name {
            .item-name {
              flex: 1;
              font-size: 13px;
            }
            .item-qty {
              width: 30px;
              text-align: center;
            }
            .item-price {
              width: 70px;
              text-align: right;
            }
            .totals {
              padding-top: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .total-row.final {
              font-size: 16px;
              font-weight: bold;
              border-top: 1px solid #000;
              padding-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BRAHNEYKER</h1>
            <p>Sala de Belleza</p>
            <p>Calle 0 Av. 1 #5AN-29</p>
            <p>Barrio Chapinero, Atalaya</p>
            <p>Cúcuta, Colombia</p>
            <p>Tel: +57 321 206 7024</p>
          </div>
          
          <div class="info">
            <p><strong>Factura:</strong> ${invoiceToPrint.id}</p>
            <p><strong>Fecha:</strong> ${new Date(invoiceToPrint.date).toLocaleString("es-CO")}</p>
            <p><strong>Cliente:</strong> ${invoiceToPrint.customerName}</p>
            <p><strong>Tel:</strong> ${invoiceToPrint.customerPhone}</p>
          </div>
          
          <div class="items">
            <div class="item" style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px;">
              <span class="item-name">Producto</span>
              <span class="item-qty">Cant</span>
              <span class="item-price">Total</span>
            </div>
            ${invoiceToPrint.items
        .map(
          (item) => `
              <div class="item">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">${item.quantity}</span>
                <span class="item-price">$${(item.price * item.quantity).toLocaleString()}</span>
              </div>
            `,
        )
        .join("")}
          </div>
          
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${invoiceToPrint.subtotal.toLocaleString()}</span>
            </div>
            <div class="total-row final">
              <span>TOTAL:</span>
              <span>$${Math.round(invoiceToPrint.total).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>¡Gracias por su preferencia!</p>
            <p>Síguenos en @brahneyker</p>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${notification.type === "success" ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
            }`}
        >
          {notification.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowHistory(false)}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${!showHistory
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
        >
          Nueva Factura
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${showHistory
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
        >
          Historial ({invoices.length})
        </button>
      </div>

      {!showHistory ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Product Entry */}
          <div className="space-y-6">
            {/* Barcode Scanner Input */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-primary" />
                Escanear Producto
              </h3>
              <form onSubmit={handleBarcodeSubmit}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Escanear o escribir código de barras..."
                    className="w-full bg-input border border-border rounded-lg py-3 pl-11 pr-4 text-foreground text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Agregar Producto
                </button>
              </form>
            </div>

            {/* Customer Info */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Información del Cliente</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Nombre (opcional)</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Cliente General"
                    className="w-full bg-input border border-border rounded-lg py-2.5 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Teléfono (opcional)</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="N/A"
                    className="w-full bg-input border border-border rounded-lg py-2.5 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Quick Product List */}
            <div className="bg-card border border-border rounded-xl p-6">

              <h3 className="text-lg font-semibold text-foreground mb-4">Productos Sugeridos (Más Vendidos)</h3>
              <div className="overflow-y-auto space-y-2 pr-2" style={{ maxHeight: "220px" }}>
                {sortedAvailableProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay sugerencias disponibles.
                  </p>
                ) : (
                  sortedAvailableProducts
                    .map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          // Directly add to cart instead of just autofilling search
                          // Logic from handleBarcodeSubmit but simplified for direct click
                          const existingItem = currentItems.find((item) => item.productId === product.id)
                          if (existingItem) {
                            showNotification("El producto ya está en la factura", "error")
                            return
                          }

                          setCurrentItems([
                            {
                              productId: product.id,
                              name: product.name,
                              price: product.price,
                              quantity: 1,
                              barcode: product.barcode,
                            },
                            ...currentItems,
                          ])
                        }}
                        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-left group"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{product.name}</p>
                          <p className="text-xs text-muted-foreground">Código: {product.barcode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">${product.price.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Stock: {product.quantity}</p>
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Invoice Preview */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Factura Actual
            </h3>

            {currentItems.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Escanea productos para agregarlos a la factura</p>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="space-y-3 mb-6 max-h-[430px] overflow-y-auto pr-2">
                  {currentItems.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">${item.price.toLocaleString()} c/u</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 rounded bg-muted hover:bg-muted/80 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-semibold text-foreground">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 rounded bg-muted hover:bg-muted/80 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <p className="w-24 text-right font-semibold text-foreground">
                        ${(item.price * item.quantity).toLocaleString()}
                      </p>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-foreground pt-2 border-t border-border">
                    <span>TOTAL:</span>
                    <span className="text-primary">${Math.round(total).toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setCurrentItems([])}
                    className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-semibold py-3 rounded-lg transition-colors"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={handleGenerateInvoice}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="w-5 h-5" />
                    Generar e Imprimir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Invoice History */
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay facturas</h3>
              <p className="text-muted-foreground">Las facturas generadas aparecerán aquí.</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{invoice.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.date).toLocaleDateString("es-CO", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-primary">${Math.round(invoice.total).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{invoice.items.length} productos</p>
                    </div>
                    {expandedInvoice === invoice.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expandedInvoice === invoice.id && (
                  <div className="p-4 border-t border-border bg-muted/30">
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">
                        Cliente: <span className="text-foreground">{invoice.customerName}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Teléfono: <span className="text-foreground">{invoice.customerPhone}</span>
                      </p>
                    </div>
                    <div className="space-y-2 mb-4">
                      {invoice.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.name} x{item.quantity}
                          </span>
                          <span className="text-foreground">${(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice)
                          setTimeout(() => handlePrint(), 100)
                        }}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Reimprimir
                      </button>
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Ver Detalle
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteInvoice(invoice.id)
                        }}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors flex items-center justify-center"
                        title="Eliminar Factura"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && !showHistory && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Factura Generada</h3>
              <button onClick={() => setSelectedInvoice(null)} className="p-2 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">Factura #{selectedInvoice.id}</h4>
              <p className="text-3xl font-bold text-primary mb-4">
                ${Math.round(selectedInvoice.total).toLocaleString()}
              </p>

              <div className="text-left bg-muted/30 rounded-lg p-4 mb-4 max-h-60 overflow-y-auto">
                <h5 className="font-semibold text-sm mb-2">Productos:</h5>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name} <span className="text-muted-foreground">x{item.quantity}</span></span>
                      <span className="font-medium">${(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">La factura se ha guardado correctamente.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-medium py-3 rounded-lg"
                >
                  Cerrar
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Reimprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hidden Print Reference */}
      <div ref={printRef} className="hidden" />
    </div>
  )
}

export default function FacturasPage() {
  return (
    <Suspense fallback={null}>
      <FacturasContent />
    </Suspense>
  )
}
