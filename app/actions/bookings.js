'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

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
      tx_date: new Date().toISOString().split('T')[0],
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
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
  if (error) return { error: error.message }
  revalidatePath('/bookings')
  return { success: true }
}
