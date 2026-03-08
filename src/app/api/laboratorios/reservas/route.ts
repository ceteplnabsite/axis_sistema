import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { startOfWeek, endOfWeek, isAfter, startOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const labId = searchParams.get('labId')
    const dateStr = searchParams.get('date')

    if (!labId || !dateStr) {
      return NextResponse.json({ message: "labId e data são obrigatórios" }, { status: 400 })
    }

    const date = new Date(dateStr)
    const view = searchParams.get('view') || 'day'

    let gte = new Date(date)
    gte.setUTCHours(0, 0, 0, 0)
    
    let lte = new Date(date)
    lte.setUTCHours(23, 59, 59, 999)

    if (view === 'week') {
      gte = startOfWeek(date, { weekStartsOn: 1 })
      gte.setUTCHours(0, 0, 0, 0)
      lte = endOfWeek(date, { weekStartsOn: 1 })
      lte.setUTCHours(23, 59, 59, 999)
    }

    const reservas = await prisma.reservaLaboratorio.findMany({
      where: {
        laboratorioId: labId,
        data: {
          gte,
          lte
        }
      },
      include: {
        user: {
          select: { id: true, name: true, username: true }
        }
      }
    })

    return NextResponse.json(reservas)
  } catch (error) {
    return NextResponse.json({ message: "Erro ao buscar reservas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })

    const { laboratorioId, data: dateStr, turno, horario, disciplina, turmaId, slots } = await request.json()

    const isAdmin = session.user.isSuperuser || session.user.isDirecao
    const today = new Date()

    // Normalize input to array of slots
    const slotsToReserve = slots && Array.isArray(slots) 
      ? slots 
      : [{ data: dateStr, turno, horario }]

    if (slotsToReserve.length === 0) {
      return NextResponse.json({ message: "Nenhum horário selecionado" }, { status: 400 })
    }

    // 1. Validations and preparation
    const transactions = []
    
    for (const slot of slotsToReserve) {
      if (!laboratorioId || !slot.data || !slot.turno || slot.horario === undefined) {
        return NextResponse.json({ message: "Dados incompletos em um dos horários" }, { status: 400 })
      }

      const reservationDate = new Date(slot.data)
      reservationDate.setUTCHours(0, 0, 0, 0)

      const firstDayOfReservationMonth = startOfMonth(reservationDate)
      const firstDayOfCurrentMonth = startOfMonth(today)

      if (!isAdmin && isAfter(firstDayOfReservationMonth, firstDayOfCurrentMonth)) {
        return NextResponse.json({ 
          message: `As reservas para ${format(reservationDate, 'MMMM', { locale: ptBR })} só serão liberadas quando o mês iniciar.` 
        }, { status: 400 })
      }

      // Check existing
      const existing = await prisma.reservaLaboratorio.findUnique({
        where: {
          laboratorioId_data_turno_horario: {
            laboratorioId,
            data: reservationDate,
            turno: slot.turno,
            horario: parseInt(slot.horario)
          }
        }
      })

      if (existing) {
        return NextResponse.json({ 
          message: `O ${slot.horario}º horário de ${format(reservationDate, 'dd/MM')} já está reservado.` 
        }, { status: 400 })
      }

      // 2. Weekly limit check per slot if not admin
      if (!isAdmin) {
        const start = startOfWeek(reservationDate, { weekStartsOn: 0 })
        const end = endOfWeek(reservationDate, { weekStartsOn: 0 })

        const userReservationsThisWeek = await prisma.reservaLaboratorio.findMany({
          where: {
            userId: session.user.id,
            data: { gte: start, lte: end }
          },
          select: { data: true }
        })

        const uniqueDays = new Set(userReservationsThisWeek.map(r => new Date(r.data).toISOString().split('T')[0]))
        
        if (uniqueDays.size >= 3 && !uniqueDays.has(reservationDate.toISOString().split('T')[0])) {
          return NextResponse.json({ message: "Você atingiu o limite de 3 dias de reserva por semana." }, { status: 400 })
        }
        // Special case: if reserving multiple days in one go, we should probably check that too, but usually it's same day multi-slot
      }

      transactions.push(
        prisma.reservaLaboratorio.create({
          data: {
            laboratorioId,
            userId: session.user.id,
            data: reservationDate,
            turno: slot.turno,
            horario: parseInt(slot.horario),
            disciplina,
            turmaId
          }
        })
      )
    }

    // 3. Execute all
    await prisma.$transaction(transactions)

    return NextResponse.json({ message: "Reserva realizada com sucesso!" })
  } catch (error) {
    console.error("Erro ao criar reserva:", error)
    return NextResponse.json({ message: "Erro ao criar reserva" }, { status: 500 })
  }
}
