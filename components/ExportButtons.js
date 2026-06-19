'use client'

import { useState } from 'react'

// format คือ string-key เท่านั้น — ห้ามส่ง function เป็น prop จาก Server Component
const FORMATTERS = {
  txtype: (v) => v === 'income' ? 'รายรับ' : 'รายจ่าย',
  number2: (v) => Number(v ?? 0).toFixed(2),
  currency: (v) => Number(v ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
  date: (v) => v ?? '',
  nullable: (v) => v ?? '',
  text: (v) => String(v ?? ''),
}

function applyFormat(col, value) {
  if (!col.format) return String(value ?? '')
  const fn = FORMATTERS[col.format]
  return fn ? fn(value) : String(value ?? '')
}

export default function ExportButtons({ data, filename, columns, title }) {
  const [loadingXlsx, setLoadingXlsx] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)

  async function exportExcel() {
    setLoadingXlsx(true)
    try {
      const XLSX = (await import('xlsx')).default || await import('xlsx')
      const rows = data.map(row => {
        const out = {}
        columns.forEach(col => { out[col.header] = applyFormat(col, row[col.key]) })
        return out
      })
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูล')
      XLSX.writeFile(wb, `${filename}.xlsx`)
    } catch (e) {
      console.error(e)
      alert('ไม่สามารถส่งออก Excel ได้')
    }
    setLoadingXlsx(false)
  }

  async function exportPdf() {
    setLoadingPdf(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(14)
      doc.text(title || filename, 14, 16)
      doc.setFontSize(9)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 23)

      const head = [columns.map(c => c.header)]
      const body = data.map(row =>
        columns.map(col => applyFormat(col, row[col.key]))
      )

      autoTable(doc, {
        head,
        body,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      })
      doc.save(`${filename}.pdf`)
    } catch (e) {
      console.error(e)
      alert('ไม่สามารถส่งออก PDF ได้')
    }
    setLoadingPdf(false)
  }

  return (
    <div className="flex gap-2">
      <button onClick={exportExcel} disabled={loadingXlsx} className="btn-secondary text-green-700 border-green-300 hover:bg-green-50">
        {loadingXlsx ? '...' : '📊'} Excel
      </button>
      <button onClick={exportPdf} disabled={loadingPdf} className="btn-secondary text-red-700 border-red-300 hover:bg-red-50">
        {loadingPdf ? '...' : '📄'} PDF
      </button>
    </div>
  )
}
