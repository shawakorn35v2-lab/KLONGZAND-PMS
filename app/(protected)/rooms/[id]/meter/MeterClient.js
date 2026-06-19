'use client'

import { useState } from 'react'

function fmt(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }
function fmtUnits(n) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }
function fmtMonth(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
}

export default function MeterClient({ readings, room }) {
  const [printRow, setPrintRow] = useState(null)
  const [deductions, setDeductions] = useState([{ desc: '', amount: '' }])
  const [printing, setPrinting] = useState(false)

  function openPrint(r) {
    setPrintRow(r)
    setDeductions([{ desc: '', amount: '' }])
  }

  function addDeduction() {
    setDeductions(p => [...p, { desc: '', amount: '' }])
  }

  function removeDeduction(i) {
    setDeductions(p => p.filter((_, idx) => idx !== i))
  }

  function setDeductionField(i, field, val) {
    setDeductions(p => p.map((d, idx) => idx === i ? { ...d, [field]: val } : d))
  }

  const validDeductions = deductions.filter(d => d.desc.trim() && Number(d.amount) > 0)
  const deductionTotal = validDeductions.reduce((s, d) => s + Number(d.amount), 0)
  const grandTotal = printRow
    ? Number(room.monthly_rent || 0) + Number(printRow.electric_cost || 0) + Number(printRow.water_flat_fee || 0) + deductionTotal
    : 0

  async function handlePrintPDF() {
    if (!printRow) return
    setPrinting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()

      // Header
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('KLONGZAND PMS', pageW / 2, 20, { align: 'center' })

      doc.setFontSize(13)
      doc.text('ใบแจ้งหนี้ค่าเช่า', pageW / 2, 29, { align: 'center' })

      doc.setDrawColor(200, 200, 200)
      doc.line(14, 33, pageW - 14, 33)

      // Room info
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`ห้อง ${room.room_no}  อาคาร ${room.building}`, 14, 41)
      doc.text(`รอบบิล: ${fmtMonth(printRow.billing_month)}`, 14, 48)
      doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}`, pageW - 14, 48, { align: 'right' })

      // Bill table
      const rows = []
      if (Number(room.monthly_rent) > 0) {
        rows.push(['ค่าเช่าห้องรายเดือน', '', '', fmt(room.monthly_rent)])
      }

      const units = Number(printRow.curr_reading) - Number(printRow.prev_reading)
      rows.push([
        'ค่าไฟฟ้า',
        `${fmtUnits(printRow.prev_reading)} → ${fmtUnits(printRow.curr_reading)}`,
        `${fmtUnits(units)} หน่วย × ${fmt(printRow.unit_price)}`,
        fmt(printRow.electric_cost),
      ])

      rows.push(['ค่าน้ำ (เหมา)', '', '', fmt(printRow.water_flat_fee)])

      validDeductions.forEach(d => {
        rows.push([d.desc, '', '', fmt(d.amount)])
      })

      autoTable(doc, {
        head: [['รายการ', 'มิเตอร์', 'รายละเอียด', 'จำนวนเงิน']],
        body: rows,
        startY: 55,
        styles: { fontSize: 9, font: 'helvetica' },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })

      const finalY = doc.lastAutoTable.finalY + 6

      // Grand total box
      doc.setFillColor(37, 99, 235)
      doc.setTextColor(255, 255, 255)
      doc.roundedRect(pageW - 80, finalY, 66, 12, 2, 2, 'F')
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('รวมทั้งสิ้น', pageW - 74, finalY + 8)
      doc.text(fmt(grandTotal), pageW - 16, finalY + 8, { align: 'right' })

      // Footer
      doc.setTextColor(150, 150, 150)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('KLONGZAND PMS — ใบแจ้งหนี้นี้ออกโดยระบบอัตโนมัติ', pageW / 2, 285, { align: 'center' })

      doc.save(`ใบแจ้งหนี้-ห้อง${room.room_no}-${printRow.billing_month}.pdf`)
    } finally {
      setPrinting(false)
    }
  }

  if ((readings ?? []).length === 0) {
    return <p className="text-center text-gray-400 py-8 text-sm">ยังไม่มีประวัติมิเตอร์</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th">รอบบิล</th>
              <th className="table-th text-right">มิเตอร์ก่อน</th>
              <th className="table-th text-right">มิเตอร์หลัง</th>
              <th className="table-th text-right">หน่วยที่ใช้</th>
              <th className="table-th text-right">ราคา/หน่วย</th>
              <th className="table-th text-right">ค่าไฟ</th>
              <th className="table-th text-right">ค่าน้ำ</th>
              <th className="table-th text-right">ค่าเช่า</th>
              <th className="table-th text-right font-bold">รวม (ไฟ+น้ำ)</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {readings.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{fmtMonth(r.billing_month)}</td>
                <td className="table-td text-right">{fmtUnits(r.prev_reading)}</td>
                <td className="table-td text-right">{fmtUnits(r.curr_reading)}</td>
                <td className="table-td text-right">{fmtUnits(r.curr_reading - r.prev_reading)}</td>
                <td className="table-td text-right">{fmt(r.unit_price)}</td>
                <td className="table-td text-right">{fmt(r.electric_cost)}</td>
                <td className="table-td text-right">{fmt(r.water_flat_fee)}</td>
                <td className="table-td text-right text-gray-500">{fmt(room.monthly_rent)}</td>
                <td className="table-td text-right font-semibold text-blue-700">{fmt(r.total_amount)}</td>
                <td className="table-td">
                  <button
                    onClick={() => openPrint(r)}
                    className="px-2.5 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-900 whitespace-nowrap"
                  >
                    🖨 พิมพ์ใบแจ้งหนี้
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Print / Invoice Modal */}
      {printRow && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 mb-1">ใบแจ้งหนี้ค่าเช่า</h3>
            <p className="text-sm text-gray-500 mb-4">
              ห้อง {room.room_no} — {fmtMonth(printRow.billing_month)}
            </p>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
              {Number(room.monthly_rent) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">ค่าเช่าห้องรายเดือน</span>
                  <span className="font-medium">{fmt(room.monthly_rent)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">
                  ค่าไฟ ({fmtUnits(printRow.curr_reading - printRow.prev_reading)} หน่วย × {fmt(printRow.unit_price)})
                </span>
                <span className="font-medium">{fmt(printRow.electric_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ค่าน้ำ (เหมา)</span>
                <span className="font-medium">{fmt(printRow.water_flat_fee)}</span>
              </div>
            </div>

            {/* Additional deductions */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">รายการหักเพิ่มเติม</label>
                <button onClick={addDeduction} className="text-xs text-blue-600 hover:text-blue-800">+ เพิ่มรายการ</button>
              </div>
              <div className="space-y-2">
                {deductions.map((d, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={d.desc}
                      onChange={e => setDeductionField(i, 'desc', e.target.value)}
                      placeholder="รายการ เช่น ของใช้ชำรุด"
                      className="input flex-1 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={d.amount}
                      onChange={e => setDeductionField(i, 'amount', e.target.value)}
                      placeholder="0.00"
                      className="input w-28 text-sm text-right"
                    />
                    {deductions.length > 1 && (
                      <button onClick={() => removeDeduction(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Grand total */}
            <div className="border-t-2 border-blue-600 pt-3 mb-4">
              <div className="flex justify-between text-base font-bold text-blue-700">
                <span>รวมทั้งสิ้น</span>
                <span>{fmt(grandTotal)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePrintPDF}
                disabled={printing}
                className="btn-primary flex-1 justify-center"
              >
                {printing ? 'กำลังสร้าง PDF...' : '🖨 ดาวน์โหลด PDF'}
              </button>
              <button onClick={() => setPrintRow(null)} className="btn-secondary">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
