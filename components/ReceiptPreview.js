'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/dateUtils'

function fmt(n) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const GREEN = '#2d5016'

export default function ReceiptPreview({ receipt }) {
  const receiptRef = useRef(null)
  const [printing, setPrinting] = useState(false)

  const items = receipt.items ?? []
  const padded = [...items]
  while (padded.length < 10) padded.push(null)

  async function handlePrint() {
    setPrinting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { default: jsPDF } = await import('jspdf')

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const imgData = canvas.toDataURL('image/png')
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, w, Math.min(h, pdf.internal.pageSize.getHeight()))
      pdf.save(`ใบเสร็จ-${receipt.receipt_no}.pdf`)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/receipts" className="text-sm text-blue-600 hover:text-blue-800">← กลับไปรายการใบเสร็จ</Link>
        <button onClick={handlePrint} disabled={printing} className="btn-primary">
          {printing ? 'กำลังสร้าง PDF...' : '🖨 พิมพ์/ดาวน์โหลด PDF'}
        </button>
      </div>

      <div className="flex justify-center">
        <div
          ref={receiptRef}
          className="bg-white p-8 shadow border border-gray-200"
          style={{ width: '210mm', minHeight: '297mm', color: '#111' }}
        >
          {/* Header */}
          <div
            className="flex justify-between items-start pb-3 mb-4"
            style={{ borderBottom: `3px solid ${GREEN}` }}
          >
            <div className="flex items-start gap-3">
              {/* Plain <img> avoids next/image lazy-loading issues with html2canvas */}
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
              <p className="text-lg font-bold" style={{ color: GREEN }}>ใบเสร็จรับเงิน</p>
              <p className="text-sm text-gray-600">RECEIPT</p>
              <div className="mt-3 text-sm text-gray-800 space-y-0.5">
                <p><span className="text-gray-500">เลขที่ / No:</span> <span className="font-semibold">{receipt.receipt_no}</span></p>
                <p><span className="text-gray-500">วันที่ / Date:</span> <span className="font-medium">{formatDate(receipt.created_at)}</span></p>
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="mb-4 text-sm space-y-1.5">
            <div className="flex">
              <span className="text-gray-600 w-36 shrink-0">ชื่อลูกค้า / Name:</span>
              <span className="flex-1 border-b border-gray-300 px-2 font-medium">{receipt.customer_name || ' '}</span>
            </div>
            <div className="flex">
              <span className="text-gray-600 w-36 shrink-0">ที่อยู่ / Address:</span>
              <span className="flex-1 border-b border-gray-300 px-2">{receipt.customer_address || ' '}</span>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-1">
                <span className="text-gray-600 w-36 shrink-0">เบอร์โทร / Tel:</span>
                <span className="flex-1 border-b border-gray-300 px-2">{receipt.customer_tel || ' '}</span>
              </div>
              <div className="flex flex-1">
                <span className="text-gray-600 shrink-0">เลขผู้เสียภาษี:</span>
                <span className="flex-1 border-b border-gray-300 px-2 ml-2">{receipt.customer_tax_id || ' '}</span>
              </div>
            </div>
          </div>

          {/* Items table */}
          <table
            className="w-full text-sm mb-4"
            style={{ borderCollapse: 'collapse', border: `1px solid ${GREEN}` }}
          >
            <thead>
              <tr style={{ backgroundColor: GREEN, color: '#ffffff' }}>
                <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', width: '48px' }}>ลำดับ<br/><span className="text-[10px] font-normal">No.</span></th>
                <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', textAlign: 'left' }}>รายการ<br/><span className="text-[10px] font-normal">Description</span></th>
                <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', width: '80px' }}>จำนวน<br/><span className="text-[10px] font-normal">Quantity</span></th>
                <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', width: '110px' }}>ราคาต่อหน่วย<br/><span className="text-[10px] font-normal">Unit Price</span></th>
                <th style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', width: '130px' }}>จำนวนเงิน (บาท)<br/><span className="text-[10px] font-normal">Amount</span></th>
              </tr>
            </thead>
            <tbody>
              {padded.map((it, i) => (
                <tr key={i}>
                  <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', textAlign: 'center', color: '#374151' }}>{i + 1}</td>
                  <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px' }}>{it?.description || ' '}</td>
                  <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', textAlign: 'right' }}>{it ? fmt(it.quantity) : ' '}</td>
                  <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', textAlign: 'right' }}>{it ? fmt(it.unit_price) : ' '}</td>
                  <td style={{ border: `1px solid ${GREEN}`, padding: '6px 8px', textAlign: 'right', fontWeight: 500 }}>{it ? fmt(it.amount) : ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Payment + summary */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 border border-gray-400 p-3 text-sm">
              <p className="font-semibold mb-2 text-gray-800">ชำระโดย / Paid by:</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span style={{
                    display: 'inline-block', width: '14px', height: '14px',
                    border: '1.5px solid #374151', textAlign: 'center', lineHeight: '12px',
                    fontSize: '11px', fontWeight: 700,
                  }}>{receipt.payment_method === 'cash' ? '✓' : ''}</span>
                  <span>เงินสด (Cash)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{
                    display: 'inline-block', width: '14px', height: '14px',
                    border: '1.5px solid #374151', textAlign: 'center', lineHeight: '12px',
                    fontSize: '11px', fontWeight: 700,
                  }}>{receipt.payment_method === 'transfer' ? '✓' : ''}</span>
                  <span>โอนเงิน (Transfer)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{
                    display: 'inline-block', width: '14px', height: '14px',
                    border: '1.5px solid #374151', textAlign: 'center', lineHeight: '12px',
                    fontSize: '11px', fontWeight: 700,
                  }}>{receipt.payment_method === 'other' ? '✓' : ''}</span>
                  <span>อื่นๆ (Other){receipt.payment_other_note ? ` — ${receipt.payment_other_note}` : ''}</span>
                </div>
              </div>
              {receipt.remark && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">หมายเหตุ / Remark:</p>
                  <p className="whitespace-pre-wrap">{receipt.remark}</p>
                </div>
              )}
            </div>
            <div className="w-64 text-sm space-y-2">
              <div className="flex justify-between border-b border-gray-300 pb-1">
                <span className="text-gray-700">รวมเงิน / Sub-total</span>
                <span className="font-medium">{fmt(receipt.subtotal)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-1">
                <span className="text-gray-700">ส่วนลด / Discount</span>
                <span className="font-medium">{fmt(receipt.discount)}</span>
              </div>
              <div
                className="flex justify-between px-3 py-2 rounded font-bold text-base"
                style={{ backgroundColor: GREEN, color: '#ffffff' }}
              >
                <span>รับเงินแล้ว</span>
                <span>{fmt(receipt.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex gap-8 mt-10 mb-8 text-sm">
            <div className="flex-1 text-center">
              <div className="border-t border-gray-500 mx-6" />
              <p className="text-gray-700 mt-1">ผู้รับเงิน / Received by</p>
            </div>
            <div className="flex-1 text-center">
              <div className="border-t border-gray-500 mx-6" />
              <p className="text-gray-700 mt-1">ผู้ชำระเงิน / Paid by</p>
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
