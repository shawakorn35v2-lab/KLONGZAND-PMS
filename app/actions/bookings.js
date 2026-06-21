'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { getTodayString } from '@/lib/dateUtils'

export async function createBooking({ roomId, customerId, newCustomer, channel, checkinDate, checkoutDate, price, deposit, note }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  let cid = customerId
  if (!cid && newCustomer?.full_name) {
    const { data, error } = await supabase
      .from('customers')
      .insert({ full_name: newCustomer.full_name, phone: newCustomer.phone || null, note: newCustomer.note || null })
      .select('id')
      .single()
    if (error) return { error: error.message }
    cid = data.id
  }

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      room_id: roomId,
      customer_id: cid,
      channel,
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      price: Number(price),
      deposit: Number(deposit) || 0,
      note,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (bookingErr) return { error: bookingErr.message }

  if (Number(deposit) > 0) {
    await supabase.from('transactions').insert({
      tx_date: checkinDate,
      tx_type: 'income',
      category: 'ค่ามัดจำ',
      amount: Number(deposit),
      note: `มัดจำการจองห้อง`,
      booking_id: booking.id,
      created_by: user.id,
    })
  }

  revalidatePath('/bookings')
  revalidatePath('/transactions')
  return { success: true }
}

export async function checkinBooking(bookingId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('price, deposit, room_id')
    .eq('id', bookingId)
    .single()
  if (fetchErr) return { error: fetchErr.message }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'checked_in' })
    .eq('id', bookingId)
  if (error) return { error: error.message }

  const remaining = Number(booking.price) - Number(booking.deposit)
  if (remaining > 0) {
    await supabase.from('transactions').insert({
      tx_date: getTodayString(),
      tx_type: 'income',
      category: 'ค่าห้อง',
      amount: remaining,
      note: `รับเงินเช็คอิน (ส่วนที่เหลือ)`,
      booking_id: bookingId,
      created_by: user.id,
    })
  }

  revalidatePath('/bookings')
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function checkoutBooking(bookingId) {
  const supabase = await createClient()

  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('room_id')
    .eq('id', bookingId)
    .single()
  if (fetchErr) return { error: fetchErr.message }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'checked_out' })
    .eq('id', bookingId)
  if (error) return { error: error.message }

  await supabase
    .from('rooms')
    .update({ housekeeping_status: 'dirty' })
    .eq('id', booking.room_id)

  revalidatePath('/bookings')
  revalidatePath('/rooms')
  revalidatePath('/housekeeping')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function cancelBooking(bookingId) {
  const supabase = await createClient()

  // ลบ transactions ที่ยังไม่ปิดยอดที่ผูกกับ booking นี้
  await supabase
    .from('transactions')
    .delete()
    .eq('booking_id', bookingId)
    .eq('is_closed', false)

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
  if (error) return { error: error.message }

  revalidatePath('/bookings')
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function adminUpdateBooking(bookingId, fields, adminName, oldRoomNo, newRoomNo, oldRoomId, transferReason) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'ไม่มีสิทธิ์ดำเนินการนี้' }

  const roomChanged = oldRoomId && fields.room_id && fields.room_id !== oldRoomId

  // Auto-append room transfer log to note
  let note = fields.note ?? ''
  if (roomChanged && oldRoomNo && newRoomNo) {
    const reasonPart = transferReason ? ` เหตุผล: ${transferReason}` : ''
    const logLine = `ย้ายจากห้อง ${oldRoomNo} → ${newRoomNo} เมื่อ ${getTodayString()} โดย ${adminName}${reasonPart}`
    note = note ? `${note}\n${logLine}` : logLine
  }

  const { error } = await supabase.from('bookings').update({
    room_id: fields.room_id,
    channel: fields.channel,
    checkin_date: fields.checkin_date,
    checkout_date: fields.checkout_date,
    price: Number(fields.price) || 0,
    deposit: Number(fields.deposit) || 0,
    status: fields.status,
    note: note || null,
  }).eq('id', bookingId)

  if (error) return { error: error.message }

  // เมื่อย้ายห้อง: ตั้งห้องเก่าเป็น dirty + บันทึก housekeeping log
  if (roomChanged) {
    const hkNote = `ลูกค้าย้ายออกไปห้อง ${newRoomNo}${transferReason ? ` (${transferReason})` : ''}`
    await supabase.from('rooms').update({ housekeeping_status: 'dirty' }).eq('id', oldRoomId)
    await supabase.from('housekeeping_log').insert({
      room_id: oldRoomId,
      status: 'dirty',
      note: hkNote,
      updated_by: user.id,
    })
    revalidatePath('/housekeeping')
    revalidatePath('/rooms')
  }

  revalidatePath('/bookings')
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function adminDeleteBooking(bookingId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'ไม่มีสิทธิ์ดำเนินการนี้' }

  // แอดมินลบทุก transaction ที่ผูกกับ booking นี้ (รวมที่ปิดยอดแล้ว)
  await supabase
    .from('transactions')
    .delete()
    .eq('booking_id', bookingId)

  const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
  if (error) return { error: error.message }

  revalidatePath('/bookings')
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}
