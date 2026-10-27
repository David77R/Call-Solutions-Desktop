function sumGroomerField(groomers, field, absentFlag) {
  if (!groomers || !groomers.length) return 0;
  return groomers.reduce((sum, g) => {
    if (absentFlag && g[absentFlag]) return sum;
    return sum + (Number(g[field]) || 0);
  }, 0);
}

export function formatSummaryText(entry) {
  const lines = [];
  lines.push(`📋 RESUMEN DEL DÍA — ${entry.company_name}`);
  lines.push(`📅 ${entry.date_label}`);
  if (entry.author_name?.trim()) {
    lines.push(`✍️ Reportado por: ${entry.author_name.trim()}`);
  }
  if (entry.edited_at) {
    const time = new Date(entry.edited_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    lines.push(`✏️ Editado por: ${entry.edited_by} a las ${time}`);
  }
  lines.push('');
  lines.push(`📞 Llamadas recibidas: ${entry.calls || 0}`);

  if (entry.messagesCombined) {
    lines.push(`💬 Mensajes (Meta): ${entry.messagesMeta || 0}`);
  } else {
    lines.push(`💬 Mensajes Meta: ${entry.messagesMeta || 0}`);
    lines.push(`💬 Mensajes WhatsApp: ${entry.messagesWhatsapp || 0}`);
  }

  const hasGroomerData = !!entry.groomers?.length;
  const confirmedTotal = hasGroomerData
    ? sumGroomerField(entry.groomers, 'confirmedCount', 'absentTomorrow')
    : Number(entry.confirmedTomorrow || 0);
  const completedTotal = hasGroomerData ? sumGroomerField(entry.groomers, 'completedCount', 'absentToday') : 0;

  lines.push(`📝 Citas nuevas agendadas: ${entry.newAppointments || 0}`);
  if (hasGroomerData) {
    lines.push(`✂️ Citas realizadas hoy: ${completedTotal}`);
  }
  lines.push(`✅ Citas confirmadas para mañana: ${confirmedTotal}`);

  if (entry.groomers && entry.groomers.length) {
    if (entry.groomers.some((g) => g.name?.trim() && !(g.absentToday ?? g.absent) && g.completedCount)) {
      lines.push('');
      lines.push('✂️ Citas realizadas por groomer:');
      for (const g of entry.groomers) {
        if (g.name?.trim() && !(g.absentToday ?? g.absent) && g.completedCount) {
          lines.push(`- ${g.name}: ${g.completedCount || 0} citas`);
        }
      }
    }

    if (entry.groomers.some((g) => g.name?.trim() && !g.absentTomorrow && g.confirmedCount)) {
      lines.push('');
      lines.push('✅ Confirmadas por groomer:');
      for (const g of entry.groomers) {
        if (g.name?.trim() && !g.absentTomorrow) {
          lines.push(`- ${g.name}: ${g.confirmedCount || 0} citas`);
        }
      }
    }
  }

  if (entry.issues?.trim()) {
    lines.push('');
    lines.push('⚠️ Inconvenientes:');
    lines.push(entry.issues.trim());
  }

  if (entry.notes?.trim()) {
    lines.push('');
    lines.push('📌 Notas adicionales:');
    lines.push(entry.notes.trim());
  }

  lines.push('');
  lines.push('Generado con la app de CC+CS Solutions');

  return lines.join('\n');
}

export function buildDailyReportText(companies, summaries, dateLabel) {
  const lines = [];
  lines.push(`📋 RESUMEN TOTAL DEL DÍA`);
  lines.push(`📅 ${dateLabel}`);
  lines.push('');
  lines.push('════════════════════');

  for (const company of companies) {
    const entry = summaries.find((s) => s.company_slug === company.slug);
    lines.push('');
    if (!entry) {
      lines.push(`📋 ${company.name}`);
      lines.push('Sin resumen reportado hoy.');
      lines.push('');
      lines.push('════════════════════');
      continue;
    }
    lines.push(formatSummaryText(entry));
    lines.push('');
    lines.push('════════════════════');
  }

  return lines.join('\n');
}