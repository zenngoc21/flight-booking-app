import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getMyBookings, type BookingHistoryItem } from '../../services/api';
import { getSavedToken } from '../../services/authStorage';
import { cacheOfflineTicket } from '../../services/offlineTickets';
import { getBookingItinerary } from '../../services/bookingItinerary';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; (async () => {
    try {
      const token = await getSavedToken();
      if (!token) throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
      const result = await getMyBookings(token);
      const item = result.data.find(b => b._id === bookingId);
      if (!item) throw new Error('Không tìm thấy vé trong lịch sử đặt chỗ.');
      if (item.paymentStatus !== 'paid' || item.bookingStatus !== 'confirmed') throw new Error('Máy chủ chưa xác nhận thanh toán. Hãy tải lại sau ít giây.');
      let cacheWarning = '';
      try {
        await cacheOfflineTicket(item);
      } catch {
        cacheWarning = 'Vé đã xác nhận nhưng không thể lưu bản xem offline trên thiết bị.';
      }
      if (active) {
        setBooking(item);
        setError(cacheWarning);
      }
    } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Không thể xác minh vé.'); }
    finally { if (active) setLoading(false); }
  })(); return () => { active = false; }; }, [bookingId]);
  if (loading) return <View style={s.center}><ActivityIndicator size="large"/><Text style={s.muted}>Đang xác minh thanh toán từ máy chủ…</Text></View>;
  const itinerary = booking ? getBookingItinerary(booking) : [];
  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.emoji}>{booking ? '✅' : '⚠️'}</Text>
    <Text style={s.title}>{booking ? 'Đặt vé thành công!' : 'Chưa thể xác nhận vé'}</Text>
    <Text style={s.muted}>{booking ? 'Thanh toán đã được máy chủ xác nhận.' : error}</Text>
    {booking && error ? <Text style={s.warning}>{error}</Text> : null}
    {booking && !error ? <Text style={s.muted}>Vé đã được lưu để xem offline.</Text> : null}
    {booking && <View style={s.card}><Text style={s.label}>MÃ ĐẶT CHỖ CHUNG</Text><Text style={s.pnr}>{booking.bookingCode}</Text>{itinerary.map((leg,index)=><View key={`${leg.flight.flightNumber}-${index}`}><Text style={s.route}>Chặng {index+1}: {leg.flight.origin?.code} → {leg.flight.destination?.code}</Text><Text style={s.muted}>{leg.flight.flightNumber} · Ghế {leg.seats.join(', ')||'Chưa chọn'}</Text></View>)}<Text style={s.price}>Tổng đã thanh toán: {Number(booking.pricing.total).toLocaleString('vi-VN')} {booking.pricing.currency}</Text></View>}
    {booking && <TouchableOpacity style={s.primary} onPress={() => router.push({ pathname: '/booking/ticket', params: { bookingId: booking._id } })}><Text style={s.primaryText}>Xem vé điện tử & QR</Text></TouchableOpacity>}
    <TouchableOpacity style={s.secondary} onPress={() => router.replace('/booking-history')}><Text style={s.secondaryText}>Lịch sử đặt vé</Text></TouchableOpacity>
    <TouchableOpacity onPress={() => router.replace('/')}><Text style={s.link}>Về trang chủ</Text></TouchableOpacity>
  </ScrollView>;
}
const s=StyleSheet.create({container:{flexGrow:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#F4F7FB'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},emoji:{fontSize:60,marginBottom:12},title:{fontSize:27,fontWeight:'800',color:'#172B4D',textAlign:'center'},muted:{color:'#64748B',textAlign:'center',marginTop:8,lineHeight:21},warning:{color:'#B45309',textAlign:'center',marginTop:8,lineHeight:21},card:{width:'100%',backgroundColor:'#FFF',borderRadius:18,padding:20,marginVertical:24,borderWidth:1,borderColor:'#E2E8F0'},label:{fontSize:11,color:'#64748B',fontWeight:'700',letterSpacing:1},pnr:{fontSize:28,fontWeight:'900',color:'#2563EB',marginTop:6},route:{fontSize:20,fontWeight:'800',color:'#172B4D',marginTop:18},price:{fontSize:20,fontWeight:'800',color:'#172B4D',marginTop:14},primary:{width:'100%',padding:16,borderRadius:12,backgroundColor:'#2563EB',alignItems:'center',marginBottom:10},primaryText:{color:'#FFF',fontWeight:'800'},secondary:{width:'100%',padding:15,borderRadius:12,borderWidth:1,borderColor:'#CBD5E1',alignItems:'center'},secondaryText:{fontWeight:'700',color:'#334155'},link:{marginTop:18,color:'#2563EB',fontWeight:'700'}});
