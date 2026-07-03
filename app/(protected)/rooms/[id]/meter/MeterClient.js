'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { saveMeterReading, deleteMeterReading, updateRoom } from '@/app/actions/rooms'

import { formatMonth, formatDate, getTodayString } from '@/lib/dateUtils'

function fmt(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }
function fmtN(n) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

export default function MeterClient({ readings, room }) {
  const router = useRouter()

  // Monthly rent editor
  const [editingRent, setEditingRent] = useState(false)
  const [rentVal, setRentVal] = useState(room.monthly_rent ?? 0)
  const [rentLoading, setRentLoading] = useState(false)

  // Edit meter row
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete
  const [deletingId, setDeletingId] = useState(null)

  // Print invoice
  const [printRow, setPrintRow] = useState(null)
  const [deductions, setDeductions] = useState([{ desc: '', amount: '' }])
  const [printing, setPrinting] = useState(false)
  const invoiceRef = useRef(null)

  // Live preview for edit modal
  const editUnits = useMemo(() =>
    Math.max(0, Number(editForm.curr_reading || 0) - Number(editForm.prev_reading || 0)),
    [editForm.curr_reading, editForm.prev_reading]
  )
  const editElectric = editUnits * Number(editForm.unit_price || 0)
  const editTotal = editElectric + Number(editForm.water_flat_fee || 0)

  // Print totals
  const validDeductions = deductions.filter(d => d.desc.trim() && Number(d.amount) > 0)
  const deductionTotal = validDeductions.reduce((s, d) => s + Number(d.amount), 0)
  const grandTotal = printRow
    ? Number(rentVal || 0) + Number(printRow.electric_cost || 0) + Number(printRow.water_flat_fee || 0) + deductionTotal
    : 0

  async function handleSaveRent() {
    setRentLoading(true)
    const result = await updateRoom(room.id, { monthly_rent: Number(rentVal) })
    setRentLoading(false)
    if (result.error) { alert(result.error); return }
    setEditingRent(false)
    router.refresh()
  }

  function openEdit(r) {
    setEditRow(r)
    setEditForm({
      billing_month: r.billing_month,
      prev_reading: r.prev_reading ?? '',
      curr_reading: r.curr_reading ?? '',
      unit_price: r.unit_price ?? '7.50',
      water_flat_fee: r.water_flat_fee ?? '0',
    })
    setEditError('')
  }

  async function handleEditSave(e) {
    e.preventDefault()
    if (Number(editForm.curr_reading) < Number(editForm.prev_reading)) {
      setEditError('ค่ามิเตอร์ปัจจุบันต้องไม่น้อยกว่าค่าก่อนหน้า')
      return
    }
    setEditLoading(true)
    const result = await saveMeterReading({
      room_id: room.id,
      billing_month: editForm.billing_month,
      prev_reading: Number(editForm.prev_reading),
      curr_reading: Number(editForm.curr_reading),
      unit_price: Number(editForm.unit_price),
      water_flat_fee: Number(editForm.water_flat_fee),
    })
    setEditLoading(false)
    if (result.error) { setEditError(result.error); return }
    setEditRow(null)
    router.refresh()
  }

  async function handleDelete(r) {
    if (!confirm(`ลบข้อมูลมิเตอร์รอบ ${formatMonth(r.billing_month)}?`)) return
    setDeletingId(r.id)
    const result = await deleteMeterReading(r.id, room.id)
    setDeletingId(null)
    if (result.error) alert(result.error)
    else router.refresh()
  }

  function openPrint(r) {
    setPrintRow(r)
    setDeductions([{ desc: '', amount: '' }])
  }

  async function handlePrintPDF() {
    if (!printRow) return
    setPrinting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { default: jsPDF } = await import('jspdf')

      const element = invoiceRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * pageWidth) / canvas.width

      const yOffset = imgHeight < pageHeight ? (pageHeight - imgHeight) / 2 : 0
      pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, Math.min(imgHeight, pageHeight))
      pdf.save(`ใบแจ้งหนี้-ห้อง${room.room_no}-${printRow.billing_month}.pdf`)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <>
      {/* Monthly rent editor */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-600">ค่าเช่ารายเดือน:</span>
        {editingRent ? (
          <>
            <input
              type="number" min="0" step="0.01"
              value={rentVal}
              onChange={e => setRentVal(e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              className="input max-w-[140px] text-sm"
            />
            <button onClick={handleSaveRent} disabled={rentLoading} className="btn-primary text-xs py-1.5">
              {rentLoading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button onClick={() => { setEditingRent(false); setRentVal(room.monthly_rent ?? 0) }} className="btn-secondary text-xs py-1.5">ยกเลิก</button>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-gray-900">{fmt(room.monthly_rent)}/เดือน</span>
            <button onClick={() => setEditingRent(true)} className="text-xs text-blue-600 hover:text-blue-800 underline">แก้ไข</button>
          </>
        )}
      </div>

      {/* History table */}
      {readings.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">ยังไม่มีประวัติมิเตอร์</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">รอบบิล</th>
                <th className="table-th text-right">มิเตอร์ก่อน</th>
                <th className="table-th text-right">มิเตอร์หลัง</th>
                <th className="table-th text-right">หน่วย</th>
                <th className="table-th text-right">ราคา/หน่วย</th>
                <th className="table-th text-right">ค่าไฟ</th>
                <th className="table-th text-right">ค่าน้ำ</th>
                <th className="table-th text-right font-bold">รวม</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {readings.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{formatMonth(r.billing_month)}</td>
                  <td className="table-td text-right">{fmtN(r.prev_reading)}</td>
                  <td className="table-td text-right">{fmtN(r.curr_reading)}</td>
                  <td className="table-td text-right">{fmtN(r.curr_reading - r.prev_reading)}</td>
                  <td className="table-td text-right">{fmt(r.unit_price)}</td>
                  <td className="table-td text-right">{fmt(r.electric_cost)}</td>
                  <td className="table-td text-right">{fmt(r.water_flat_fee)}</td>
                  <td className="table-td text-right font-semibold text-blue-700">{fmt(r.total_amount)}</td>
                  <td className="table-td">
                    <div className="flex gap-1.5 flex-nowrap">
                      <button onClick={() => openEdit(r)} className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600">✏ แก้ไข</button>
                      <button onClick={() => openPrint(r)} className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-900">🖨 พิมพ์</button>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.id}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Meter Modal */}
      {editRow && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              แก้ไขมิเตอร์ — {formatMonth(editRow.billing_month)}
            </h3>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="label">รอบบิล (เดือน)</label>
                <input type="date" required value={editForm.billing_month}
                  onChange={e => setEditForm(p => ({ ...p, billing_month: e.target.value }))}
                  className="input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">มิเตอร์ก่อนหน้า</label>
                  <input type="number" min="0" step="0.01" required
                    value={editForm.prev_reading}
                    onChange={e => setEditForm(p => ({ ...p, prev_reading: e.target.value }))}
                    onWheel={e => e.currentTarget.blur()}
                    className="input" />
                </div>
                <div>
                  <label className="label">มิเตอร์ปัจจุบัน</label>
                  <input type="number" min="0" step="0.01" required
                    value={editForm.curr_reading}
                    onChange={e => setEditForm(p => ({ ...p, curr_reading: e.target.value }))}
                    onWheel={e => e.currentTarget.blur()}
                    className="input" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">ราคาต่อหน่วย (บาท)</label>
                  <input type="number" min="0" step="0.01" required
                    value={editForm.unit_price}
                    onChange={e => setEditForm(p => ({ ...p, unit_price: e.target.value }))}
                    onWheel={e => e.currentTarget.blur()}
                    className="input" />
                </div>
                <div>
                  <label className="label">ค่าน้ำเหมา (บาท)</label>
                  <input type="number" min="0" step="0.01"
                    value={editForm.water_flat_fee}
                    onChange={e => setEditForm(p => ({ ...p, water_flat_fee: e.target.value }))}
                    onWheel={e => e.currentTarget.blur()}
                    className="input" />
                </div>
              </div>

              {/* Live preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>หน่วยที่ใช้</span><span className="font-medium">{fmtN(editUnits)} หน่วย</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>ค่าไฟ</span><span className="font-medium">{fmt(editElectric)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>ค่าน้ำ</span><span className="font-medium">{fmt(editForm.water_flat_fee)}</span>
                </div>
                <div className="flex justify-between text-blue-800 font-bold border-t border-blue-200 pt-1">
                  <span>รวม (ไฟ+น้ำ)</span><span>{fmt(editTotal)}</span>
                </div>
              </div>

              {editError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={editLoading} className="btn-primary flex-1 justify-center">
                  {editLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
                <button type="button" onClick={() => setEditRow(null)} className="btn-secondary">ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Invoice Modal */}
      {printRow && (() => {
        const GREEN = '#2d5016'
        const units = Number(printRow.curr_reading) - Number(printRow.prev_reading)
        const invoiceRef2 = `IV-${String(printRow.billing_month).slice(0, 7)}-${room.room_no}`
        const lineItems = []
        if (Number(rentVal) > 0) {
          lineItems.push({
            label: 'ค่าเช่าห้องรายเดือน',
            sub: 'Monthly rent',
            amount: Number(rentVal),
          })
        }
        lineItems.push({
          label: 'ค่าไฟฟ้า',
          sub: `${fmtN(units)} หน่วย × ${fmt(printRow.unit_price)} (มิเตอร์ ${fmtN(printRow.prev_reading)} → ${fmtN(printRow.curr_reading)})`,
          amount: Number(printRow.electric_cost || 0),
        })
        lineItems.push({
          label: 'ค่าน้ำ (เหมา)',
          sub: 'Water (flat fee)',
          amount: Number(printRow.water_flat_fee || 0),
        })
        validDeductions.forEach(d => {
          lineItems.push({
            label: d.desc,
            sub: 'รายการเพิ่มเติม / Additional charge',
            amount: Number(d.amount),
          })
        })
        return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-5xl p-4 sm:p-6 my-4 max-h-[95vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 mb-1">ใบแจ้งหนี้ค่าเช่า</h3>
            <p className="text-sm text-gray-500 mb-4">ห้อง {room.room_no} — {formatMonth(printRow.billing_month)}</p>

            {/* Deductions input (not part of the printed invoice) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">รายการหักเพิ่มเติม</label>
                <button onClick={() => setDeductions(p => [...p, { desc: '', amount: '' }])} className="text-xs text-blue-600 hover:text-blue-800">+ เพิ่มรายการ</button>
              </div>
              <div className="space-y-2">
                {deductions.map((d, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="text" value={d.desc} onChange={e => setDeductions(p => p.map((x, idx) => idx === i ? { ...x, desc: e.target.value } : x))}
                      placeholder="รายการ เช่น ของใช้ชำรุด" className="input flex-1 text-sm" />
                    <input type="number" min="0" step="0.01" value={d.amount} onChange={e => setDeductions(p => p.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))}
                      onWheel={e => e.currentTarget.blur()}
                      placeholder="0.00" className="input w-28 text-sm text-right" />
                    {deductions.length > 1 && (
                      <button onClick={() => setDeductions(p => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invoice preview — captured by html2canvas and exported to PDF */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ตัวอย่างใบแจ้งหนี้</p>
            <div className="flex justify-center">
              <div
                ref={invoiceRef}
                className="bg-white p-8 shadow border border-gray-200"
                style={{ width: '210mm', minHeight: '297mm', color: '#111' }}
              >
                {/* Header */}
                <div
                  className="flex justify-between items-start pb-3 mb-4"
                  style={{ borderBottom: `3px solid ${GREEN}` }}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src="/logo-full.png" alt="KLONG ZAND RESORT PHALA"
                      style={{ width: '140px', height: 'auto', objectFit: 'contain' }}
                    />
                    <div className="text-xs text-gray-700 mt-1 leading-relaxed">
                      <p className="font-bold text-sm" style={{ color: GREEN }}>KLONG ZAND RESORT PHALA</p>
                      <p>โทร 095-8697918, 096-6762535</p>
                      <p>156/29 หมู่ 6 ตำบลพลา</p>
                      <p>อำเภอบ้านฉาง จังหวัดระยอง 21130</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: GREEN }}>ใบแจ้งหนี้ค่าเช่า</p>
                    <p className="text-sm text-gray-600">MONTHLY RENTAL INVOICE</p>
                    <div className="mt-3 text-sm text-gray-800 space-y-0.5">
                      <p><span className="text-gray-500">เลขที่ / No:</span> <span className="font-semibold">{invoiceRef2}</span></p>
                      <p><span className="text-gray-500">รอบบิล / Period:</span> <span className="font-medium">{formatMonth(printRow.billing_month)}</span></p>
                      <p><span className="text-gray-500">วันที่พิมพ์:</span> <span className="font-medium">{formatDate(getTodayString())}</span></p>
                    </div>
                  </div>
                </div>

                {/* Room info */}
                <div className="mb-4 text-sm space-y-1.5">
                  <div className="flex gap-4">
                    <div className="flex flex-1">
                      <span className="text-gray-600 w-36 shrink-0">ห้อง / Room:</span>
                      <span className="flex-1 border-b border-gray-300 px-2 font-semibold">{room.room_no}</span>
                    </div>
                    <div className="flex flex-1">
                      <span className="text-gray-600 shrink-0">อาคาร / Building:</span>
                      <span className="flex-1 border-b border-gray-300 px-2 ml-2">{room.building}</span>
                    </div>
                  </div>
                  {Number(rentVal) > 0 && (
                    <div className="flex">
                      <span className="text-gray-600 w-36 shrink-0">ค่าเช่ารายเดือน:</span>
                      <span className="flex-1 border-b border-gray-300 px-2 font-medium">{fmt(rentVal)} / เดือน</span>
                    </div>
                  )}
                </div>

                {/* Line-items table */}
                <table
                  className="w-full text-sm mb-4"
                  style={{ borderCollapse: 'collapse', border: `1px solid ${GREEN}` }}
                >
                  <thead>
                    <tr style={{ backgroundColor: GREEN, color: '#ffffff' }}>
                      <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', width: '48px' }}>ลำดับ<br/><span className="text-[10px] font-normal">No.</span></th>
                      <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', textAlign: 'left' }}>รายการ<br/><span className="text-[10px] font-normal">Description</span></th>
                      <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', width: '150px' }}>จำนวนเงิน (บาท)<br/><span className="text-[10px] font-normal">Amount</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((it, i) => (
                      <tr key={i}>
                        <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', textAlign: 'center', color: '#374151' }}>{i + 1}</td>
                        <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px' }}>
                          <div className="font-medium">{it.label}</div>
                          {it.sub && <div className="text-[11px] text-gray-500 mt-0.5">{it.sub}</div>}
                        </td>
                        <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', textAlign: 'right', fontWeight: 500 }}>{fmt(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals strip */}
                <div className="flex justify-end mb-6">
                  <div className="w-72 text-sm space-y-2">
                    <div
                      className="flex justify-between px-3 py-2 rounded font-bold text-base"
                      style={{ backgroundColor: GREEN, color: '#ffffff' }}
                    >
                      <span>รวมทั้งสิ้น / Grand Total</span>
                      <span>{fmt(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment note */}
                <div className="mb-6 text-xs text-gray-600 border border-gray-300 rounded p-3">
                  <p className="font-semibold mb-1" style={{ color: GREEN }}>วิธีชำระเงิน / Payment methods</p>
                  <p>เงินสด (Cash) หรือโอนเงินเข้าบัญชีธนาคารตามที่แจ้ง</p>
                  <p>กรุณาชำระภายในวันที่กำหนด — Please pay by the due date.</p>
                </div>

                {/* Signatures */}
                <div className="flex gap-8 mt-10 mb-8 text-sm">
                  <div className="flex-1 text-center">
                    <div className="border-t border-gray-500 mx-6" />
                    <p className="text-gray-700 mt-1">ผู้ทำรายการ / Staff</p>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="border-t border-gray-500 mx-6" />
                    <p className="text-gray-700 mt-1">ผู้รับใบแจ้งหนี้ / Received by</p>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="text-center font-semibold pt-2"
                  style={{ borderTop: `2px solid ${GREEN}`, color: GREEN }}
                >
                  <p className="text-sm">ขอบคุณที่ใช้บริการ</p>
                  <p className="text-xs">THANK YOU FOR YOUR SUPPORT</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={handlePrintPDF} disabled={printing} className="btn-primary flex-1 justify-center">
                {printing ? 'กำลังสร้าง PDF...' : '🖨 ดาวน์โหลด PDF'}
              </button>
              <button onClick={() => setPrintRow(null)} className="btn-secondary">ปิด</button>
            </div>
          </div>
        </div>
        )
      })()}
    </>
  )
}
