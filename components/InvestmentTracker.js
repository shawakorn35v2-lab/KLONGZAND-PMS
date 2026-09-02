'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateResortSettings } from '@/app/actions/resortSettings'
import { formatLongDate } from '@/lib/dateUtils'

function fmt(n) {
  return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function InvestmentTracker({
  investmentCost,
  investmentStartDate,
  cumulativeNet,
  avgMonthlyNet,
  hasError,
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    investment_cost: String(investmentCost ?? 0),
    investment_start_date: investmentStartDate ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const cost = Number(investmentCost || 0)
  const net = Number(cumulativeNet || 0)
  const paidBack = cost > 0 && net >= cost
  const remaining = Math.max(0, cost - net)
  const percentRaw = cost > 0 ? (net / cost) * 100 : 0
  const percentClamped = Math.min(100, Math.max(0, percentRaw))
  const percentDisplay = cost > 0 ? percentRaw.toFixed(1) : '0.0'

  let etaText = '—'
  if (hasError) {
    etaText = 'โหลดข้อมูลไม่สำเร็จ'
  } else if (paidBack) {
    etaText = 'คืนทุนแล้ว 🎉'
  } else if (cost > 0) {
    if (avgMonthlyNet > 0) {
      const months = Math.ceil(remaining / avgMonthlyNet)
      etaText = `อีกประมาณ ${months.toLocaleString('th-TH')} เดือน`
    } else {
      etaText = 'ยังไม่มีกำไรเฉลี่ย (ต้องสร้างกำไรเพิ่ม)'
    }
  }

  function openEdit() {
    setForm({
      investment_cost: String(investmentCost ?? 0),
      investment_start_date: investmentStartDate ?? '',
    })
    setError('')
    setEditing(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const result = await updateResortSettings({
      investment_cost: Number(form.investment_cost),
      investment_start_date: form.investment_start_date,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="card border-t-4 border-t-amber-500">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ติดตามการคืนทุน</p>
          <p className="text-xs text-gray-500 mt-0.5">
            เริ่มนับกำไรตั้งแต่ {investmentStartDate ? formatLongDate(investmentStartDate) : '—'}
          </p>
        </div>
        <button type="button" onClick={openEdit} className="text-xs text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap">
          ✏ แก้ไขข้อมูลทุน
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-500">ต้นทุนลงทุนทั้งหมด</p>
          <p className="text-lg font-bold text-gray-900">{fmt(cost)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">กำไรสุทธิสะสม</p>
          <p className={`text-lg font-bold ${hasError ? 'text-red-600' : (net >= 0 ? 'text-green-700' : 'text-red-600')}`}>
            {hasError ? 'โหลดข้อมูลไม่สำเร็จ' : fmt(net)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{paidBack ? 'สถานะ' : 'ยังขาดอีก'}</p>
          <p className={`text-lg font-bold ${paidBack ? 'text-green-700' : 'text-blue-700'}`}>
            {hasError ? '—' : (paidBack ? 'คืนทุนแล้ว!' : fmt(remaining))}
          </p>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>ความคืบหน้าคืนทุน</span>
          <span className="font-semibold">{percentDisplay}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${paidBack ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${percentClamped}%` }}
          />
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
        <span className="text-gray-500">ประมาณการ:</span>{' '}
        <span className="font-semibold">{etaText}</span>
        {!paidBack && cost > 0 && (
          <span className="text-xs text-gray-500 block mt-0.5">
            (คำนวณจากกำไรเฉลี่ย 3 เดือนล่าสุด: {fmt(avgMonthlyNet)}/เดือน)
          </span>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setEditing(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">แก้ไขข้อมูลทุน</h3>
              <button type="button" onClick={() => setEditing(false)} disabled={saving} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">ต้นทุนปรับปรุงรวม (บาท)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.investment_cost}
                  onChange={e => setForm(p => ({ ...p, investment_cost: e.target.value }))}
                  onWheel={e => e.currentTarget.blur()}
                  className="input"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="label">วันที่เริ่มนับกำไรสะสม</label>
                <input
                  type="date"
                  required
                  value={form.investment_start_date}
                  onChange={e => setForm(p => ({ ...p, investment_start_date: e.target.value }))}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">กำไรสุทธิสะสมจะนับจากรายรับ-รายจ่ายตั้งแต่วันนี้เป็นต้นไป</p>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setEditing(false)} disabled={saving} className="btn-secondary">
                  ยกเลิก
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
