import React,{useCallback,useState} from 'react';
import {ActivityIndicator,ScrollView,StyleSheet,Text,TouchableOpacity,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {getMyBookings, type BookingHistoryItem} from '../../services/api';
import {getSavedToken} from '../../services/authStorage';
import {getBookingItinerary} from '../../services/bookingItinerary';
export default function BookingDetailScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      try {
        const token = await getSavedToken();
        if (!token) throw new Error('Vui lòng đăng nhập.');
        const result = await getMyBookings(token);
        const found = result.data.find((item) => item._id === bookingId);
        if (!found) throw new Error('Không tìm thấy booking.');
        if (active) setBooking(found);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không thể tải booking.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [bookingId]));

  if (loading) {
    return <View style={s.center}><ActivityIndicator /><Text>Đang tải booking…</Text></View>;
  }

  if (!booking) {
    return <View style={s.center}><Text>{error}</Text><TouchableOpacity onPress={() => router.replace('/booking-history')}><Text style={s.link}>Quay lại</Text></TouchableOpacity></View>;
  }

  const itinerary = getBookingItinerary(booking);

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.card}>
        <Text style={s.label}>MÃ ĐẶT CHỖ CHUNG</Text>
        <Text style={s.pnr}>{booking.bookingCode}</Text>
        {itinerary.map((leg, index) => (
          <View key={`${leg.flight.flightNumber}-${index}`}>
            <Text style={s.route}>Chặng {index + 1}: {leg.flight.origin?.code} → {leg.flight.destination?.code}</Text>
            <Text style={s.body}>{leg.flight.origin?.city} đến {leg.flight.destination?.city}</Text>
            <Text style={s.body}>Chuyến bay: {leg.flight.flightNumber || '--'}</Text>
            <Text style={s.body}>Khởi hành: {leg.flight.departureAt ? new Date(leg.flight.departureAt).toLocaleString('vi-VN') : '--'}</Text>
            <Text style={s.body}>Ghế: {leg.seats.join(', ') || 'Chưa chọn'}</Text>
          </View>
        ))}
        <Text style={s.body}>Hành khách: {booking.passengers.map((passenger) => `${passenger.firstName} ${passenger.lastName}`).join(', ')}</Text>
        <Text style={s.body}>Đặt vé: {booking.bookingStatus} · Thanh toán: {booking.paymentStatus}</Text>
        <Text style={s.total}>{Number(booking.pricing.total).toLocaleString('vi-VN')} {booking.pricing.currency}</Text>
      </View>
      {booking.paymentStatus === 'paid' && booking.bookingStatus === 'confirmed' && <TouchableOpacity style={s.primary} onPress={() => router.push({ pathname: '/booking/ticket', params: { bookingId: booking._id } })}><Text style={s.white}>Mở vé điện tử / QR</Text></TouchableOpacity>}
      {booking.bookingStatus === 'pending' && booking.paymentStatus === 'pending' && <TouchableOpacity style={s.primary} onPress={() => router.push({ pathname: '/booking/payment', params: { bookingId: booking._id } })}><Text style={s.white}>Tiếp tục thanh toán</Text></TouchableOpacity>}
      <Text style={s.note}>Hủy/đổi vé chỉ khả dụng khi backend cung cấp API và chính sách tương ứng. Ứng dụng không tự đổi trạng thái booking ở phía client.</Text>
    </ScrollView>
  );
};const s=StyleSheet.create({container:{padding:16,backgroundColor:'#F3F6FB',flexGrow:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},card:{backgroundColor:'#FFF',borderRadius:16,padding:20,borderWidth:1,borderColor:'#E2E8F0'},label:{fontSize:11,color:'#64748B',fontWeight:'700'},pnr:{fontSize:28,fontWeight:'900',color:'#2563EB',marginTop:4},route:{fontSize:22,fontWeight:'800',color:'#172B4D',marginTop:24},body:{fontSize:14,color:'#475569',marginTop:12,lineHeight:21},total:{fontSize:20,fontWeight:'900',color:'#172B4D',marginTop:18},primary:{backgroundColor:'#2563EB',padding:16,borderRadius:12,alignItems:'center',marginTop:14},white:{color:'#FFF',fontWeight:'800'},note:{fontSize:12,color:'#64748B',lineHeight:18,marginTop:18},link:{color:'#2563EB',marginTop:14}});
