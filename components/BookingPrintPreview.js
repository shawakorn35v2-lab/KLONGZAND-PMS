'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { formatDate, formatDateTime } from '@/lib/dateUtils'

const GREEN = '#2d5016'

function fmt(n) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const CHANNEL_LABELS = {
  walkin: 'Walk-in',
  agoda: 'Agoda',
  line: 'Line',
  facebook: 'Facebook',
  sale: 'Sale',
}

function shortRef(bookings) {
  const id = bookings[0]?.id
  if (!id) return ''
  return 'BK-' + String(id).replace(/-/g, '').slice(0, 8).toUpperCase()
}

async function fetchSignedUrl(path) {
  if (!path) return null
  const supabase = createClient()
  const { data } = await supabase.storage.from('booking-documents').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

export default function BookingPrintPreview({ bookings, onClose }) {
  const printableRef = useRef(null)
  const [printing, setPrinting] = useState(false)
  const [idCardUrl, setIdCardUrl] = useState(null)
  const [idCardReady, setIdCardReady] = useState(false)

  const first = bookings[0]
  const customerName = first?.customers?.full_name ?? '—'
  const customerPhone = first?.customers?.phone ?? ''
  const vehicleReg = first?.vehicle_reg_url ?? ''
  const channelLabel = CHANNEL_LABELS[first?.channel] ?? first?.channel ?? '—'
  const note = first?.note ?? ''
  const idCardPath = first?.id_card_url ?? null
  const isIdCardPdf = typeof idCardPath === 'string' && idCardPath.toLowerCase().endsWith('.pdf')

  const totalPrice = bookings.reduce((s, b) => s + Number(b.price || 0), 0)
  const totalDeposit = bookings.reduce((s, b) => s + Number(b.deposit || 0), 0)
  const balance = Math.max(0, totalPrice - totalDeposit)
  const isTemporary = first?.stay_type === 'temporary'
  const bookingRef = shortRef(bookings)
  const roomNos = bookings.map(b => b.rooms?.room_no ?? '?').join('-')

  useEffect(() => {
    let cancelled = false
    if (!idCardPath || isIdCardPdf) {
      setIdCardReady(true)
      return
    }
    fetchSignedUrl(idCardPath).then(url => {
      if (!cancelled) setIdCardUrl(url)
    })
    return () => { cancelled = true }
  }, [idCardPath])

  async function handlePrint() {
    if (idCardPath && !idCardReady) {
      await new Promise(r => setTimeout(r, 300))
    }
    setPrinting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { default: jsPDF } = await import('jspdf')

      const canvas = await html2canvas(printableRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
      })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const imgData = canvas.toDataURL('image/png')
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW = pageW
      const imgH = (canvas.height * imgW) / canvas.width

      if (imgH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH)
      } else {
        let y = 0
        while (y < imgH) {
          pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH)
          y += pageH
          if (y < imgH) pdf.addPage()
        }
      }
      pdf.save(`ใบยืนยันการจอง-${customerName}-${roomNos}.pdf`)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
        <p className="text-sm font-semibold text-green-800">✅ บันทึกการจองสำเร็จ</p>
        <p className="text-xs text-green-700 mt-0.5">
          กด "🖨 พิมพ์ / ดาวน์โหลด PDF" เพื่อพิมพ์ใบยืนยันการจอง หรือกด "ปิด" เพื่อกลับไปหน้าหลัก
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button onClick={handlePrint} disabled={printing} className="btn-primary">
          {printing ? 'กำลังสร้าง PDF...' : '🖨 พิมพ์ / ดาวน์โหลด PDF'}
        </button>
        <button onClick={onClose} className="btn-secondary">ปิด</button>
      </div>

      <div className="flex justify-center">
        <div
          ref={printableRef}
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
              <p className="text-lg font-bold" style={{ color: GREEN }}>ใบยืนยันการจอง</p>
              <p className="text-sm text-gray-600">BOOKING CONFIRMATION</p>
              <div className="mt-3 text-sm text-gray-800 space-y-0.5">
                <p><span className="text-gray-500">เลขที่จอง / Ref:</span> <span className="font-semibold">{bookingRef}</span></p>
                <p><span className="text-gray-500">วันที่ทำรายการ:</span> <span className="font-medium">{formatDateTime(first?.created_at)}</span></p>
                <p><span className="text-gray-500">ช่องทาง:</span> <span className="font-medium">{channelLabel}</span></p>
              </div>
            </div>
          </div>

          {/* Guest info */}
          <div className="mb-4 text-sm space-y-1.5">
            <div className="flex">
              <span className="text-gray-600 w-36 shrink-0">ชื่อลูกค้า / Name:</span>
              <span className="flex-1 border-b border-gray-300 px-2 font-medium">{customerName || ' '}</span>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-1">
                <span className="text-gray-600 w-36 shrink-0">เบอร์โทร / Tel:</span>
                <span className="flex-1 border-b border-gray-300 px-2">{customerPhone || ' '}</span>
              </div>
              <div className="flex flex-1">
                <span className="text-gray-600 shrink-0">ทะเบียนรถ:</span>
                <span className="flex-1 border-b border-gray-300 px-2 ml-2">{vehicleReg || ' '}</span>
              </div>
            </div>
          </div>

          {/* Rooms table */}
          <table
            className="w-full text-sm mb-4"
            style={{ borderCollapse: 'collapse', border: `1px solid ${GREEN}` }}
          >
            <thead>
              <tr style={{ backgroundColor: GREEN, color: '#ffffff' }}>
                <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', width: '40px' }}>ลำดับ</th>
                <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', width: '110px' }}>ห้อง<br/><span className="text-[10px] font-normal">Room</span></th>
                <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px' }}>เช็คอิน<br/><span className="text-[10px] font-normal">Check-in</span></th>
                <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px' }}>เช็คเอาท์<br/><span className="text-[10px] font-normal">Check-out</span></th>
                <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', width: '110px' }}>ราคา<br/><span className="text-[10px] font-normal">Price</span></th>
                <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', width: '110px' }}>มัดจำ<br/><span className="text-[10px] font-normal">Deposit</span></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={b.id}>
                  <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px' }}>
                    <div className="font-semibold">ห้อง {b.rooms?.room_no ?? '?'}</div>
                    <div className="text-xs text-gray-500">อาคาร {b.rooms?.building ?? '—'}</div>
                  </td>
                  <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px' }}>
                    {formatDate(b.checkin_date)}
                    {b.stay_type === 'temporary' && b.checkin_time && (
                      <div className="text-xs text-gray-500">เวลา {b.checkin_time.slice(0, 5)}</div>
                    )}
                  </td>
                  <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px' }}>
                    {formatDate(b.checkout_date)}
                    {b.stay_type === 'temporary' && b.checkout_time && (
                      <div className="text-xs text-gray-500">เวลา {b.checkout_time.slice(0, 5)}</div>
                    )}
                  </td>
                  <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', textAlign: 'right' }}>{fmt(b.price)}</td>
                  <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', textAlign: 'right' }}>{fmt(b.deposit)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-4">
            <div className="w-72 text-sm space-y-2">
              <div className="flex justify-between border-b border-gray-300 pb-1">
                <span className="text-gray-700">รวมราคา / Sub-total</span>
                <span className="font-medium">{fmt(totalPrice)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-1">
                <span className="text-gray-700">รวมมัดจำ / Deposit</span>
                <span className="font-medium">{fmt(totalDeposit)}</span>
              </div>
              <div
                className="flex justify-between px-3 py-2 rounded font-bold text-base"
                style={{ backgroundColor: GREEN, color: '#ffffff' }}
              >
                <span>ยอดคงเหลือ / Balance</span>
                <span>{fmt(balance)}</span>
              </div>
            </div>
          </div>

          {/* ประเภทการพัก */}
          <div className="mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">ประเภทการพัก:</span>
              <span className="font-medium">
                {isTemporary ? 'พักชั่วคราว (Temporary)' : 'พักค้างคืน (Overnight)'}
              </span>
            </div>
            {note && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">หมายเหตุ / Remark:</p>
                <p className="whitespace-pre-wrap border border-gray-300 rounded px-3 py-2 mt-1">{note}</p>
              </div>
            )}
          </div>

          {/* ID card image (only when uploaded) */}
          {idCardPath && (
            <div className="mb-4 border border-gray-300 rounded p-3">
              <p className="text-sm font-semibold mb-2" style={{ color: GREEN }}>
                รูปบัตรประชาชน / ID Card
              </p>
              {isIdCardPdf ? (
                <p className="text-xs text-gray-500 italic">
                  ไฟล์บัตรประชาชนอยู่ในรูปแบบ PDF — ไม่แสดงในใบพิมพ์
                </p>
              ) : idCardUrl ? (
                <img
                  src={idCardUrl}
                  alt="ID Card"
                  crossOrigin="anonymous"
                  onLoad={() => setIdCardReady(true)}
                  onError={() => setIdCardReady(true)}
                  style={{
                    display: 'block',
                    maxHeight: '380px',
                    maxWidth: '100%',
                    margin: '0 auto',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <p className="text-xs text-gray-500 italic">กำลังโหลดรูปภาพ...</p>
              )}
            </div>
          )}

          {/* Signatures */}
          <div className="flex gap-8 mt-10 mb-8 text-sm">
            <div className="flex-1 text-center">
              <div className="border-t border-gray-500 mx-6" />
              <p className="text-gray-700 mt-1">ผู้ทำรายการ / Staff</p>
            </div>
            <div className="flex-1 text-center">
              <div className="border-t border-gray-500 mx-6" />
              <p className="text-gray-700 mt-1">ลูกค้า / Guest</p>
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
    </div>
  )
}
