"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Trash2,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from "../../../actions/appointments"

interface Appointment {
  id: string
  date: string
  time: string
  duration: number
  details: string
  stylist: "Damaris" | "Fabiola"
  serviceType: string
  status: "pendiente" | "confirmada" | "completada" | "cancelada"
}

// Generate time slots from 08:00 to 19:00 (1 hour intervals)
const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
]

const stylists = ["Damaris", "Fabiola"] as const

const services = [
  "Corte de Cabello",
  "Cepillado",
  "Keratina",
  "Color / Tinte",
  "Mechas / Balayage",
  "Manicure",
  "Pedicure",
  "Maquillaje",
  "Depilación",
  "Tratamiento Capilar",
  "Otro"
]

const statusColors = {
  pendiente: "bg-yellow-500/10 text-yellow-500 border-l-2 border-yellow-500",
  confirmada: "bg-blue-500/10 text-blue-500 border-l-2 border-blue-500",
  completada: "bg-green-500/10 text-green-500 border-l-2 border-green-500",
  cancelada: "bg-red-500/10 text-red-500 border-l-2 border-red-500",
}

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number)
  const ampm = hours >= 12 ? "PM" : "AM"
  const formattedHours = hours % 12 || 12
  return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${ampm}`
}

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

export default function CitasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])

  // Start of the current week view (Monday)
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - (day === 0 ? 6 : day - 1)
    return new Date(d.setDate(diff))
  })

  const [showModal, setShowModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const [formData, setFormData] = useState({
    date: "",
    time: "",
    duration: 60,
    details: "",
    serviceType: "",
    stylist: "Damaris" as "Damaris" | "Fabiola",
  })

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      const data = await getAppointments()
      // Map database fields to UI interface if needed, or assume they match
      setAppointments(data as Appointment[])
    } catch (error) {
      console.error("Error fetching appointments:", error)
    }
  }

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Navigation
  // ... (navigation functions remain same)

  const navigateWeek = (direction: number) => {
    const newStart = new Date(weekStart)
    newStart.setDate(weekStart.getDate() + (direction * 7))
    setWeekStart(newStart)
  }

  const goToToday = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - (day === 0 ? 6 : day - 1)
    setWeekStart(new Date(d.setDate(diff)))
  }

  const getWeekDays = () => {
    const days = []
    const current = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  const weekDays = getWeekDays()
  const weekDayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]


  const handleOpenModal = (
    date?: Date,
    time?: string,
    stylist?: "Damaris" | "Fabiola",
    appointment?: Appointment
  ) => {
    if (appointment) {
      setEditingAppointment(appointment)
      setFormData({
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration || 60,
        details: appointment.details,
        serviceType: appointment.serviceType || "Otro",
        stylist: appointment.stylist as "Damaris" | "Fabiola",
      })
    } else {
      setEditingAppointment(null)
      const defaultDate = date ? date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
      setFormData({
        date: defaultDate,
        time: time || "",
        duration: 60,
        details: "",
        serviceType: "",
        stylist: stylist || "Damaris",
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingAppointment(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check availability
    const isOccupied = appointments.some(
      (a) =>
        a.date === formData.date &&
        a.stylist === formData.stylist &&
        a.time === formData.time &&
        (editingAppointment ? a.id !== editingAppointment.id : true)
    )

    if (isOccupied) {
      showNotification("Ya existe una cita en ese horario para este estilista.", "error")
      return
    }

    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, formData)
        showNotification("Cita actualizada", "success")
      } else {
        await createAppointment(formData)
        showNotification("Cita agendada", "success")
      }
      setShowModal(false)
      fetchAppointments()
    } catch (error) {
      showNotification("Error al guardar la cita", "error")
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm("¿Estás seguro de eliminar esta cita?")) {
      await deleteAppointment(id)
      showNotification("Cita eliminada", "success")
      fetchAppointments()
    }
  }

  // ... rest of headers/handlers mostly identical, just remove localStorage calls

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${notification.type === "success" ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
          }`}>
          {notification.message}
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border border-border p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold capitalize">
            {weekStart.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-1">
            <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-muted rounded-lg border border-border">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToToday} className="px-4 py-2 hover:bg-muted rounded-lg border border-border text-sm font-medium">
              Hoy
            </button>
            <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-muted rounded-lg border border-border">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Cita
        </button>
      </div>

      <div className="space-y-12">
        {stylists.map((stylist) => (
          <div key={stylist} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-primary rounded-full"></div>
              <h3 className="text-xl font-bold text-foreground">{stylist}</h3>
            </div>

            {/* Calendar Grid */}
            <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header Row (Days) */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border bg-muted/30">
                  <div className="p-3 border-r border-border"></div> {/* Corner */}
                  {weekDays.map((date, i) => {
                    const isToday = new Date().toDateString() === date.toDateString()
                    return (
                      <div key={i} className={`p-3 text-center border-r border-border last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
                        <div className="text-xs text-muted-foreground uppercase font-medium">{weekDayNames[i]}</div>
                        <div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>{date.getDate()}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Time Slots Rows */}
                <div className="divide-y divide-border">
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-[80px_repeat(7,1fr)] hover:bg-muted/10 transition-colors">
                      {/* Time Label */}
                      <div className="p-2 text-xs text-foreground font-bold border-r border-border flex items-center justify-center bg-muted/10">
                        {formatTime(time)}
                      </div>
                      {/* Days Cells */}
                      {weekDays.map((date, i) => {
                        const dateStr = date.toISOString().split("T")[0]
                        const currentSlotTime = timeToMinutes(time)

                        // Find appointment that covers this slot
                        const apt = appointments.find(a => {
                          const aptDate = a.date
                          if (aptDate !== dateStr || a.stylist !== stylist) return false

                          const start = timeToMinutes(a.time)
                          const end = start + (a.duration || 60)

                          return currentSlotTime >= start && currentSlotTime < end
                        })

                        const start = apt ? timeToMinutes(apt.time) : 0
                        const end = apt ? start + (apt.duration || 60) : 0

                        const isHead = apt && start === currentSlotTime
                        const isTail = apt && currentSlotTime + 60 === end
                        const isMiddle = apt && !isHead && !isTail
                        const isSingle = isHead && isTail

                        const isToday = new Date().toDateString() === date.toDateString()

                        return (
                          <div
                            key={i}
                            className={`relative min-h-[60px] border-r border-border last:border-r-0 group ${isToday ? 'bg-primary/5' : ''}`}
                          >
                            {apt ? (
                              <div
                                onClick={() => handleOpenModal(undefined, undefined, undefined, apt)}
                                className={`
                                                            mx-1 relative z-10 cursor-pointer hover:opacity-90 transition-opacity ${statusColors[apt.status]}
                                                            ${isHead ? 'mt-1 rounded-t-lg' : 'mt-0 border-t-0 rounded-t-none'}
                                                            ${isTail ? 'mb-1 rounded-b-lg' : 'mb-0 border-b-0 rounded-b-none'}
                                                            ${isSingle ? 'rounded-lg' : ''}
                                                            flex flex-col justify-center
                                                            h-[calc(100%-4px)]
                                                        `}
                                style={{
                                  height: isSingle ? 'calc(100% - 8px)' : isHead ? 'calc(100% - 4px)' : isTail ? 'calc(100% - 4px)' : '100%',
                                  marginTop: isHead || isSingle ? '4px' : '0',
                                  marginBottom: isTail || isSingle ? '4px' : '0'
                                }}
                              >
                                {isHead && (
                                  <div className="p-2 text-xs">
                                    <div className="flex items-center gap-1 font-semibold mb-1">
                                      <Clock className="w-3 h-3" />
                                      {formatTime(apt.time)} {apt.duration > 60 && `- ${apt.duration / 60}h`}
                                    </div>
                                    <div className="font-medium line-clamp-2 leading-tight">{apt.details}</div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenModal(date, time, stylist)}
                                className="w-[calc(100%-8px)] h-[calc(100%-8px)] m-1 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-primary/10 rounded transition-all"
                              >
                                <Plus className="w-4 h-4 text-primary" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {editingAppointment ? "Editar Cita" : "Nueva Cita"}
              </h2>
              <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Stylist */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Estilista *</label>
                <div className="flex gap-2">
                  {stylists.map(s => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setFormData({ ...formData, stylist: s })}
                      className={`flex-1 py-2.5 rounded-lg border font-medium transition-all ${formData.stylist === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:bg-muted'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Fecha *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-input border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Hora *</label>
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-input border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Seleccionar hora</option>
                    {timeSlots.map((time) => {
                      // Check overlap
                      // Convert specific slot time to minutes
                      const slotStart = timeToMinutes(time)
                      const slotEnd = slotStart + 60 // Assuming grid slots are 60m

                      const isOccupied = appointments.some((a) => {
                        // Skip if editing the same appointment
                        if (editingAppointment && a.id === editingAppointment.id) return false

                        // Skip other days/stylists
                        if (a.date !== formData.date || a.stylist !== formData.stylist) return false

                        const aptStart = timeToMinutes(a.time)
                        const aptEnd = aptStart + (a.duration || 60)

                        // Check overlap
                        return Math.max(slotStart, aptStart) < Math.min(slotEnd, aptEnd)
                      })

                      return (
                        <option key={time} value={time} disabled={isOccupied} className={isOccupied ? "text-red-400" : ""}>
                          {formatTime(time)} {isOccupied ? "(Ocupado)" : ""}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Duración</label>
                <div className="flex gap-2">
                  {[60, 90, 120, 180].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setFormData({ ...formData, duration: dur })}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${formData.duration === dur
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:bg-muted"
                        }`}
                    >
                      {dur === 60 ? "1h" : dur === 90 ? "1.5h" : dur === 120 ? "2h" : "3h"}
                    </button>
                  ))}
                </div>
              </div>



              {/* Service Type */}


              {/* Details */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Detalles Adicionales</label>
                <textarea
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  rows={3}
                  className="w-full bg-input border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Notas adicionales..."
                  required={false}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {editingAppointment && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(editingAppointment.id, e as unknown as React.MouseEvent)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold px-4 rounded-lg transition-colors border border-red-500/20"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-semibold py-3 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-colors"
                >
                  {editingAppointment ? "Guardar Cambios" : "Agendar Cita"}
                </button>
              </div>
            </form>
          </div>
        </div >
      )
      }
    </div >
  )
}

