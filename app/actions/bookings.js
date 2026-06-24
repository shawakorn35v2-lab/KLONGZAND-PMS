'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { getTodayString } from '@/lib/dateUtils'

export async function createBooking({ roomId, customerId, newCustomer, channel, checkinDate, checkoutDate, price, deposit, note, idCardUrl, vehicleRegUrl, stayType, checkinTime, checkoutTime }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const resolvedStayType = stayType || 'overnight'

  // Server-side conflict check for temporary stays
  if (resolvedStayType === 'temporary') {
    if (!checkinTime || !checkoutTime) return { error: 'กรุณากรอกเวลาเข้าและเวลาออก' }
    if (checkoutTime <= checkinTime) return { error: 'เวลาออกต้องหลังเวลาเข้า' }

    const { data: overnightConflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .eq('stay_type', 'overnight')
      .neq('status', 'cancelled')
      .lte('checkin_date', checkinDate)
      .gt('checkout_date', checkinDate)

    if ((overnightConflicts ?? []).length > 0) {
      return { error: 'ห้องนี้มีผู้เข้าพักค้างคืนในวันดังกล่าว' }
    }

    const { data: tempConflicts } = await supabase
      .from('bookings')
      .select('checkin_time, checkout_time')
      .eq('room_id', roomId)
      .eq('checkin_date', checkinDate)
      .eq('stay_type', 'temporary')
      .neq('status', 'cancelled')

    const hasTimeConflict = (tempConflicts ?? []).some(c =>
      checkinTime < c.checkout_time && c.checkin_time < checkoutTime
    )
    if (hasTimeConflict) return { error: 'มีการจองชั่วคราวในช่วงเวลานี้แล้ว' }
  }

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
      checkout_date: resolvedStayType === 'temporary' ? checkinDate : checkoutDate,
      price: Number(price),
      deposit: Number(deposit) || 0,
      note,
      id_card_url: idCardUrl || null,
      vehicle_reg_url: vehicleRegUrl || null,
      stay_type: resolvedStayType,
      checkin_time: resolvedStayType === 'temporary' ? checkinTime : null,
      checkout_time: resolvedStayType === 'temporary' ? checkoutTime : null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (bookingErr) return { error: bookingErr.message }

  if (Number(deposit) > 0) {
    const { data: roomData } = await supabase.from('rooms').select('room_no').eq('id', roomId).single()
    const roomNo = roomData?.room_no ?? ''
    await supabase.from('transactions').insert({
      tx_date: checkinDate,
      tx_type: 'income',
      category: 'ค่ามัดจำ',
      amount: Number(deposit),
      note: roomNo ? `มัดจำการจองห้อง ห้อง ${roomNo}` : `มัดจำการจองห้อง`,
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
    .select('price, deposit, room_id, rooms(room_no)')
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
    const roomNo = booking.rooms?.room_no ?? ''
    await supabase.from('transactions').insert({
      tx_date: getTodayString(),
      tx_type: 'income',
      category: 'ค่าห้อง',
      amount: remaining,
      note: roomNo ? `รับเงินเช็คอิน ห้อง ${roomNo} (ส่วนที่เหลือ)` : `รับเงินเช็คอิน (ส่วนที่เหลือ)`,
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
  if (!['admin', 'staff'].includes(profile?.role)) return { error: 'ไม่มีสิทธิ์ดำเนินการนี้' }

  // Fetch old booking to detect price/deposit change for transaction sync
  const { data: oldBooking } = await supabase
    .from('bookings')
    .select('price, deposit')
    .eq('id', bookingId)
    .single()

  const roomChanged = oldRoomId && fields.room_id && fields.room_id !== oldRoomId

  // Auto-append room transfer log to note
  let note = fields.note ?? ''
  if (roomChanged && oldRoomNo && newRoomNo) {
    const reasonPart = transferReason ? ` เหตุผล: ${transferReason}` : ''
    const logLine = `ย้ายจากห้อง ${oldRoomNo} → ${newRoomNo} เมื่อ ${getTodayString()} โดย ${adminName}${reasonPart}`
    note = note ? `${note}\n${logLine}` : logLine
  }

  const newPrice = Number(fields.price) || 0
  const newDeposit = Number(fields.deposit) || 0

  const { error } = await supabase.from('bookings').update({
    room_id: fields.room_id,
    channel: fields.channel,
    checkin_date: fields.checkin_date,
    checkout_date: fields.checkout_date,
    price: newPrice,
    deposit: newDeposit,
    status: fields.status,
    note: note || null,
    id_card_url: fields.id_card_url ?? null,
    vehicle_reg_url: fields.vehicle_reg_url ?? null,
    stay_type: fields.stay_type ?? 'overnight',
    checkin_time: fields.stay_type === 'temporary' ? (fields.checkin_time || null) : null,
    checkout_time: fields.stay_type === 'temporary' ? (fields.checkout_time || null) : null,
  }).eq('id', bookingId)

  if (error) return { error: error.message }

  // Auto-sync transaction amounts when price or deposit changes
  if (oldBooking && (newPrice !== Number(oldBooking.price) || newDeposit !== Number(oldBooking.deposit))) {
    if (newDeposit >= 0) {
      await supabase.from('transactions')
        .update({ amount: newDeposit })
        .eq('booking_id', bookingId)
        .eq('category', 'ค่ามัดจำ')
    }
    const newRemaining = newPrice - newDeposit
    if (newRemaining >= 0) {
      await supabase.from('transactions')
        .update({ amount: newRemaining })
        .eq('booking_id', bookingId)
        .eq('category', 'ค่าห้อง')
    }
  }

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

  // ลบทุก transaction ที่ผูกกับ booking นี้ (รวมที่ปิดยอดแล้ว) ก่อนลบ booking
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
