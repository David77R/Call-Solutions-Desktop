function mixWithWhite(hex, ratio) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const nr = Math.round(r + (255 - r) * ratio);
  const ng = Math.round(g + (255 - g) * ratio);
  const nb = Math.round(b + (255 - b) * ratio);
  return `#${[nr, ng, nb].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function sumGroomerField(groomers, field, absentFlag) {
  if (!groomers || !groomers.length) return 0;
  return groomers.reduce((sum, g) => {
    if (absentFlag && g[absentFlag]) return sum;
    return sum + (Number(g[field]) || 0);
  }, 0);
}

function computeMetrics(entry) {
  if (!entry) return { messages: 0, appointments: 0 };
  const messages = entry.messagesCombined
    ? Number(entry.messagesMeta || 0)
    : Number(entry.messagesMeta || 0) + Number(entry.messagesWhatsapp || 0);
  const appointments = Number(entry.newAppointments || 0);
  return { messages, appointments };
}

function renderDonut(color, messages, appointments) {
  const total = messages + appointments;
  const lightColor = mixWithWhite(color, 0.78);

  if (total === 0) {
    return `
      <div class="donut-row">
        <div class="donut" style="background:#eee0d2"></div>
        <div class="legend">
          <p class="pending" style="margin:0">Sin datos de mensajes/citas todavía.</p>
        </div>
      </div>
    `;
  }

  const appointmentsPct = Math.round((appointments / total) * 100);
  const messagesPct = 100 - appointmentsPct;

  return `
    <div class="donut-row">
      <div class="donut" style="background: conic-gradient(${color} 0% ${appointmentsPct}%, ${lightColor} ${appointmentsPct}% 100%)"></div>
      <div class="legend">
        <div class="legend-item"><span class="legend-dot" style="background:${lightColor}"></span>Mensajes totales: ${messages} (${messagesPct}%)</div>
        <div class="legend-item"><span class="legend-dot" style="background:${color}"></span>Citas nuevas: ${appointments} (${appointmentsPct}%)</div>
      </div>
    </div>
  `;
}

function renderCompanySection(company, entry) {
  const color = company.color_primary || '#5474bc';

  if (!entry) {
    return `
      <section class="company">
        <h2 style="color:${color}">${company.name}</h2>
        <p class="pending">Sin resumen reportado hoy.</p>
      </section>
    `;
  }

  const { messages, appointments } = computeMetrics(entry);

  const hasGroomerData = !!(entry.groomers && entry.groomers.length);
  const confirmedTotal = hasGroomerData
    ? sumGroomerField(entry.groomers, 'confirmedCount', 'absentTomorrow')
    : Number(entry.confirmedTomorrow || 0);
  const completedTotal = hasGroomerData ? sumGroomerField(entry.groomers, 'completedCount', 'absentToday') : 0;

  const completedGroomerLines = (entry.groomers || [])
    .filter((g) => g.name && g.name.trim() && !(g.absentToday ?? g.absent) && g.completedCount)
    .map((g) => `<li>${g.name}: ${g.completedCount || 0} citas</li>`)
    .join('');

  const confirmedGroomerLines = (entry.groomers || [])
    .filter((g) => g.name && g.name.trim() && !g.absentTomorrow && g.confirmedCount)
    .map((g) => `<li>${g.name}: ${g.confirmedCount || 0} citas</li>`)
    .join('');

  const editedNote = entry.edited_at
    ? `<p class="meta">✏️ Editado por ${entry.edited_by} a las ${new Date(entry.edited_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</p>`
    : '';

  return `
    <section class="company">
      <h2 style="color:${color}">${company.name}</h2>
      <p class="meta">Reportado por ${entry.author_name || 'N/D'}</p>
      ${editedNote}

      ${renderDonut(color, messages, appointments)}

      <table class="stats">
        <tr><td>Llamadas recibidas</td><td>${entry.calls || 0}</td></tr>
        <tr><td>Citas nuevas agendadas</td><td>${entry.newAppointments || 0}</td></tr>
        ${hasGroomerData ? `<tr><td>Citas realizadas hoy</td><td>${completedTotal}</td></tr>` : ''}
        <tr><td>Citas confirmadas para mañana</td><td>${confirmedTotal}</td></tr>
      </table>

      ${completedGroomerLines ? `<p class="subtitle">Citas realizadas por groomer</p><ul>${completedGroomerLines}</ul>` : ''}
      ${confirmedGroomerLines ? `<p class="subtitle">Confirmadas por groomer</p><ul>${confirmedGroomerLines}</ul>` : ''}
      ${entry.issues && entry.issues.trim() ? `<p class="issue">⚠ ${entry.issues.trim()}</p>` : ''}
      ${entry.notes && entry.notes.trim() ? `<p class="notes">${entry.notes.trim()}</p>` : ''}
    </section>
  `;
}

export function buildDailyReportHtml(companies, summaries, dateLabel) {
  const rows = companies.map((company) => ({
    company,
    entry: summaries.find((s) => s.company_slug === company.slug) || null,
  }));

  const sections = rows.map((r) => renderCompanySection(r.company, r.entry)).join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #171b2b; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .date { color: #7c869c; font-size: 13px; margin-bottom: 24px; text-transform: capitalize; }
          .company { margin-bottom: 28px; page-break-inside: avoid; border-bottom: 1px solid #eee; padding-bottom: 16px; }
          .company h2 { font-size: 16px; margin-bottom: 2px; }
          .meta { color: #7c869c; font-size: 12px; margin-bottom: 12px; }
          .pending { color: #9aa4b8; font-style: italic; }
          .donut-row { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }
          .donut { width: 84px; height: 84px; border-radius: 50%; flex-shrink: 0; position: relative; }
          .donut::after { content: ''; position: absolute; top: 14px; left: 14px; width: 56px; height: 56px; border-radius: 50%; background: #fff; }
          .legend { font-size: 12px; color: #3a4256; }
          .legend-item { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
          .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
          table.stats { width: 100%; font-size: 12.5px; border-collapse: collapse; margin-bottom: 10px; }
          table.stats td { padding: 3px 0; }
          table.stats td:last-child { text-align: right; font-weight: 600; }
          .subtitle { font-size: 12.5px; font-weight: 600; margin: 8px 0 4px; }
          ul { margin: 0 0 8px 18px; padding: 0; font-size: 12px; }
          .issue { background: #fdf0cf; color: #8a5a00; padding: 8px; border-radius: 8px; font-size: 12px; }
          .notes { font-size: 12px; color: #3a4256; }
          .footer { margin-top: 24px; font-size: 10px; color: #9aa4b8; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Resumen del día — CC+CS Solutions</h1>
        <p class="date">${dateLabel}</p>
        ${sections}
        <p class="footer">Generado con la app de CC+CS Solutions</p>
      </body>
    </html>
  `;
}