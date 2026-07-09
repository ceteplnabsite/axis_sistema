const { PrismaClient } = require('@prisma/client');
const { startOfWeek, endOfWeek, format, differenceInDays } = require('date-fns');
const { ptBR } = require('date-fns/locale');

const prisma = new PrismaClient();

async function run() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const reservas = await prisma.reservaLaboratorio.findMany({
    where: {
      data: { gte: today }
    },
    include: {
      user: { select: { name: true, username: true } },
      laboratorio: { select: { nome: true } }
    },
    orderBy: { data: 'asc' }
  });

  const usersMap = {};

  reservas.forEach(r => {
    if (!usersMap[r.userId]) {
      usersMap[r.userId] = {
        name: r.user.name,
        email: r.user.username,
        reservas: []
      };
    }
    usersMap[r.userId].reservas.push(r);
  });

  const irregularities = [];

  for (const [userId, userData] of Object.entries(usersMap)) {
    const userReservas = userData.reservas;
    const userViolations = [];

    // Group by Day and Turno
    const byDayTurno = {};
    // Group by Week and Turno
    const byWeekTurno = {};
    // Group for consecutive: Turno_Horario_DayOfWeek -> [Dates]
    const consecutiveTracker = {};

    userReservas.forEach(r => {
      const dateStr = r.data.toISOString().split('T')[0];
      const dayTurnoKey = `${dateStr}_${r.turno}`;
      
      const startWk = startOfWeek(r.data, { weekStartsOn: 0 }).toISOString().split('T')[0];
      const weekTurnoKey = `${startWk}_${r.turno}`;

      const dayOfWeek = r.data.getUTCDay();
      const consecKey = `${r.turno}_${r.horario}_${dayOfWeek}`;

      // 1. Max 4 slots per day per Turno
      if (!byDayTurno[dayTurnoKey]) byDayTurno[dayTurnoKey] = [];
      byDayTurno[dayTurnoKey].push(r);

      // 2. Max 3 days per week per Turno
      if (!byWeekTurno[weekTurnoKey]) byWeekTurno[weekTurnoKey] = new Set();
      byWeekTurno[weekTurnoKey].add(dateStr);

      // 3. Consecutive weeks
      if (!consecutiveTracker[consecKey]) consecutiveTracker[consecKey] = [];
      consecutiveTracker[consecKey].push(r.data);
    });

    // Check Day/Turno slots
    for (const [key, list] of Object.entries(byDayTurno)) {
      if (list.length > 4) {
        const dateFmt = format(list[0].data, 'dd/MM/yyyy', { locale: ptBR });
        userViolations.push(`- **Excesso de Horários:** No dia ${dateFmt} (${list[0].turno}), tem ${list.length} horários reservados (Máximo permitido: 4).`);
      }
    }

    // Check Week/Turno days
    for (const [key, daysSet] of Object.entries(byWeekTurno)) {
      if (daysSet.size > 3) {
        const [wkStart, turno] = key.split('_');
        const startD = new Date(wkStart);
        const endD = endOfWeek(startD, { weekStartsOn: 0 });
        const weekFmt = `${format(startD, 'dd/MM')} a ${format(endD, 'dd/MM')}`;
        userViolations.push(`- **Excesso de Dias na Semana:** Na semana de ${weekFmt} (${turno}), reservou em ${daysSet.size} dias diferentes (Máximo permitido: 3).`);
      }
    }

    // Check Consecutive
    for (const [key, dates] of Object.entries(consecutiveTracker)) {
      const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = differenceInDays(sortedDates[i], sortedDates[i-1]);
        if (diff === 7) {
          const [turno, horario] = key.split('_');
          const date1Fmt = format(sortedDates[i-1], 'dd/MM', { locale: ptBR });
          const date2Fmt = format(sortedDates[i], 'dd/MM', { locale: ptBR });
          userViolations.push(`- **Semanas Consecutivas:** Reservou o ${horario}º horário (${turno}) por duas semanas seguidas (${date1Fmt} e ${date2Fmt}).`);
        }
      }
    }

    if (userViolations.length > 0) {
      irregularities.push({
        name: userData.name,
        email: userData.email,
        violations: [...new Set(userViolations)] // deduplicate
      });
    }
  }

  console.log(JSON.stringify(irregularities, null, 2));
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
