import * as XLSX from 'xlsx'

// PDF через HTML print
export const exportInstitutePDF = (
    departments: any[],
    staff: any[],
    disciplines: any[],
    assignments: any[],
    getDiscWorkload: (d: any) => number,
    getStaffHourLimit: (rate: number, is_military: boolean, service_years: number) => number
) => {
    const deptRows = departments.map(dept => {
        const deptDisc = disciplines.filter(d => d.department_id === dept.id)
        const planned = Math.round(deptDisc.reduce((sum: number, d: any) => sum + getDiscWorkload(d), 0))
        const deptStaff = staff.filter(s => s.department_id === dept.id)
        const deptAssign = assignments.filter(a => deptStaff.some(s => s.id === a.staff_id))
        const actual = Math.round(deptAssign.reduce((sum: number, a: any) => sum + (a.actual_hours || 0), 0))
        const needed = (planned / 600).toFixed(1)
        const actualStaff = deptStaff.length
        const isOk = actualStaff >= Number(needed)

        return `
      <tr>
        <td>Каф. №${dept.number}</td>
        <td>${dept.name}</td>
        <td>${deptDisc.length}</td>
        <td>${actualStaff}</td>
        <td>${planned}</td>
        <td>${actual}</td>
        <td>${needed}</td>
        <td style="color:${isOk ? '#16a34a' : '#dc2626'}; font-weight:600">${isOk ? 'Норма' : 'Нестача'}</td>
      </tr>
    `
    }).join('')

    const staffRows = staff.map(s => {
        const limit = getStaffHourLimit(s.rate, s.is_military, s.service_years)
        const dept = departments.find(d => d.id === s.department_id)
        const staffAssign = assignments.filter(a => a.staff_id === s.id)
        const planned = Math.round(staffAssign.reduce((sum: number, a: any) => sum + a.planned_hours, 0))
        const actual = Math.round(staffAssign.reduce((sum: number, a: any) => sum + (a.actual_hours || 0), 0))
        const percent = Math.round((planned / limit) * 100)
        const isOver = planned > limit

        return `
      <tr>
        <td>${s.full_name}</td>
        <td>${s.position}</td>
        <td>№${dept?.number}</td>
        <td>${s.rate}</td>
        <td>${limit}</td>
        <td>${planned}</td>
        <td>${actual}</td>
        <td>${percent}%</td>
        <td style="color:${isOver ? '#dc2626' : '#16a34a'}; font-weight:600">${isOver ? 'Перевищено' : 'Норма'}</td>
      </tr>
    `
    }).join('')

    const html = `
    <!DOCTYPE html>
    <html lang="uk">
    <head>
      <meta charset="UTF-8">
      <title>Звіт ВІТІ — Навантаження НПП</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
        .header { margin-bottom: 24px; border-bottom: 2px solid #1d4ed8; padding-bottom: 12px; }
        .header h1 { font-size: 18px; color: #1d4ed8; margin-bottom: 4px; }
        .header p { color: #64748b; font-size: 11px; }
        .section { margin-bottom: 24px; }
        .section h2 { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 10px; padding: 6px 10px; background: #f1f5f9; border-left: 3px solid #1d4ed8; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { background: #1d4ed8; color: white; padding: 8px 6px; text-align: left; font-weight: 600; }
        td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
        @media print {
          body { padding: 10px; }
          @page { margin: 15mm; size: A4 landscape; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Військовий інститут телекомунікацій та інформатизації імені Героїв Крут</h1>
        <p>Звіт про розподіл навчального навантаження НПП · Навчальний рік: 2025-2026 · Дата: ${new Date().toLocaleDateString('uk-UA')}</p>
      </div>

      <div class="section">
        <h2>Навантаження по кафедрах</h2>
        <table>
          <thead>
            <tr>
              <th>Кафедра</th>
              <th>Назва</th>
              <th>Дисциплін</th>
              <th>НПП</th>
              <th>Планове (год)</th>
              <th>Фактичне (год)</th>
              <th>Потреба НПП</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>${deptRows}</tbody>
        </table>
      </div>

      <div class="section">
        <h2>Навантаження по НПП</h2>
        <table>
          <thead>
            <tr>
              <th>ПІБ</th>
              <th>Посада</th>
              <th>Кафедра</th>
              <th>Ставка</th>
              <th>Ліміт (год)</th>
              <th>Планове (год)</th>
              <th>Фактичне (год)</th>
              <th>Виконання</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>${staffRows}</tbody>
        </table>
      </div>

      <div class="footer">
        <span>СППР ВІТІ — Система підтримки прийняття рішень</span>
        <span>Сформовано: ${new Date().toLocaleString('uk-UA')}</span>
      </div>

      <script>window.onload = () => window.print()</script>
    </body>
    </html>
  `

    const win = window.open('', '_blank')
    if (win) {
        win.document.write(html)
        win.document.close()
    }
}

// Excel звіт по кафедрі — покращений
export const exportDepartmentExcel = (
    deptName: string,
    deptNumber: string,
    staff: any[],
    assignments: any[],
    departments: any[],
    getStaffHourLimit: (rate: number, is_military: boolean, service_years: number) => number
) => {
    const wb = XLSX.utils.book_new()

    // ===== Аркуш 1 — НПП =====
    const staffHeaders = [
        ['Звіт про навантаження НПП'],
        [`Кафедра № ${deptNumber} — ${deptName}`],
        [`Навчальний рік: 2025-2026`],
        [`Дата формування: ${new Date().toLocaleDateString('uk-UA')}`],
        [],
        ['ПІБ', 'Посада', 'Ставка', 'Тип', 'Вислуга (р.)', 'Ліміт (год)', 'Планове (год)', 'Фактичне (год)', 'Виконання (%)', 'Статус'],
    ]

    const staffRows = staff.map(s => {
        const limit = getStaffHourLimit(s.rate, s.is_military, s.service_years)
        const staffAssign = assignments.filter(a => a.staff_id === s.id)
        const planned = Math.round(staffAssign.reduce((sum, a) => sum + a.planned_hours, 0))
        const actual = Math.round(staffAssign.reduce((sum, a) => sum + (a.actual_hours || 0), 0))
        const percent = Math.round((planned / limit) * 100)

        return [
            s.full_name,
            s.position,
            s.rate,
            s.is_military ? 'Військовослужбовець' : 'Цивільний',
            s.service_years,
            limit,
            planned,
            actual,
            `${percent}%`,
            planned > limit ? 'Перевищено' : 'Норма',
        ]
    })

    // Підсумок
    const totalPlanned = staffRows.reduce((sum, r) => sum + (r[6] as number), 0)
    const totalActual = staffRows.reduce((sum, r) => sum + (r[7] as number), 0)

    const staffSummary = [
        [],
        ['ПІДСУМОК', '', '', '', '', '', totalPlanned, totalActual, '', ''],
    ]

    const wsStaffData = [...staffHeaders, ...staffRows, ...staffSummary]
    const wsStaff = XLSX.utils.aoa_to_sheet(wsStaffData)

    wsStaff['!cols'] = [
        { wch: 32 }, { wch: 28 }, { wch: 8 }, { wch: 22 },
        { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 15 },
        { wch: 14 }, { wch: 12 },
    ]

    wsStaff['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } },
    ]

    XLSX.utils.book_append_sheet(wb, wsStaff, 'НПП')

    // ===== Аркуш 2 — Розподіл =====
    const assignHeaders = [
        ['Розподіл навчального навантаження по дисциплінах'],
        [`Кафедра № ${deptNumber} — ${deptName}`],
        [`Навчальний рік: 2025-2026`],
        [],
        ['НПП', 'Дисципліна', 'Навч. рік', 'Планове (год)', 'Фактичне (год)', 'Різниця (год)', 'Виконання (%)'],
    ]

    const assignRows = assignments.map(a => {
        const s = staff.find(st => st.id === a.staff_id)
        const diff = (a.actual_hours || 0) - a.planned_hours
        const percent = a.planned_hours > 0
            ? Math.round(((a.actual_hours || 0) / a.planned_hours) * 100)
            : 0

        return [
            s?.full_name || '',
            a.discipline_name,
            a.academic_year,
            a.planned_hours,
            a.actual_hours || 0,
            diff,
            `${percent}%`,
        ]
    })

    const totalAssignPlanned = assignRows.reduce((sum, r) => sum + (r[3] as number), 0)
    const totalAssignActual = assignRows.reduce((sum, r) => sum + (r[4] as number), 0)
    const totalDiff = totalAssignActual - totalAssignPlanned

    const assignSummary = [
        [],
        ['ПІДСУМОК', '', '', totalAssignPlanned, totalAssignActual, totalDiff, ''],
    ]

    const wsAssignData = [...assignHeaders, ...assignRows, ...assignSummary]
    const wsAssign = XLSX.utils.aoa_to_sheet(wsAssignData)

    wsAssign['!cols'] = [
        { wch: 32 }, { wch: 45 }, { wch: 14 },
        { wch: 14 }, { wch: 15 }, { wch: 14 }, { wch: 14 },
    ]

    wsAssign['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    ]

    XLSX.utils.book_append_sheet(wb, wsAssign, 'Розподіл')

    XLSX.writeFile(wb, `Кафедра_№${deptNumber}_НПП_2025_2026.xlsx`)
}