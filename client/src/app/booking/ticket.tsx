import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ExpoLinking from 'expo-linking';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';
import { getMyBookings } from '../../services/api';
import { getSavedToken } from '../../services/authStorage';
import {
  cacheOfflineTicket,
  getOfflineTicket,
} from '../../services/offlineTickets';
import { getBookingItinerary } from '../../services/bookingItinerary';

function wrapTicketText(value: string, maxLength: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const currentLine = lines[lines.length - 1];
    if (!currentLine || `${currentLine} ${word}`.length > maxLength) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${currentLine} ${word}`;
    }
  }

  return lines.length ? lines : ['Theo hồ sơ đặt vé'];
}

export default function ETicketScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [savingImage, setSavingImage] = useState(false);
  const ticketImageRef = useRef<Svg | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadTicket = async () => {
        setLoading(true);
        setError('');

        try {
          const token = await getSavedToken();

          if (token) {
            const response = await getMyBookings(token);
            const item = response.data.find(
              (booking) => booking._id === bookingId,
            );

            if (item) {
              if (
                item.paymentStatus !== 'paid' ||
                item.bookingStatus !== 'confirmed'
              ) {
                throw new Error(
                  'Vé chỉ được phát hành sau khi thanh toán đã xác nhận.',
                );
              }

              let cacheWarning = '';

              try {
                await cacheOfflineTicket(item);
              } catch {
                cacheWarning =
                  'Không thể lưu bản vé offline trên thiết bị. Bạn vẫn có thể xem vé trực tuyến.';
              }

              if (active) {
                setTicket(item);
                setOffline(false);
                setError(cacheWarning);
              }
              return;
            }
          }

          const cachedTicket = await getOfflineTicket(bookingId);

          if (cachedTicket && active) {
            setTicket(cachedTicket);
            setOffline(true);
            setError('');
          } else if (active) {
            setError('Không tìm thấy vé trực tuyến hoặc bản lưu offline.');
          }
        } catch (loadError) {
          const cachedTicket = await getOfflineTicket(bookingId);

          if (cachedTicket && active) {
            setTicket(cachedTicket);
            setOffline(true);
            setError('');
          } else if (active) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : 'Không thể tải vé.',
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void loadTicket();

      return () => {
        active = false;
      };
    }, [bookingId]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Đang tải vé...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Không mở được vé</Text>
        <Text style={styles.muted}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/booking-history')}
        >
          <Text style={styles.white}>Lịch sử đặt vé</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const itinerary = getBookingItinerary(ticket);
  const flight = itinerary[0]?.flight ?? ticket.flight;
  const qrData = ExpoLinking.createURL('booking/ticket', {
    queryParams: { bookingId: ticket._id },
  });
  const passengerNames =
    ticket.passengers
      ?.map((passenger: { firstName?: string; lastName?: string }) =>
        `${passenger.firstName || ''} ${passenger.lastName || ''}`.trim(),
      )
      .filter(Boolean)
      .join(', ') || 'Theo hồ sơ đặt vé';
  const passengerLines = wrapTicketText(passengerNames, 58);
  const qrTop = 390 + itinerary.length * 150 + (passengerLines.length - 1) * 26;
  const ticketImageHeight = qrTop + 280;

  const saveOfflineTicketImage = async () => {
    if (savingImage) return;
    if (!ticketImageRef.current) {
      Alert.alert('Không thể lưu ảnh vé', 'Ảnh vé chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    setSavingImage(true);
    try {
      const base64Image = await new Promise<string>((resolve, reject) => {
        const svg = ticketImageRef.current;
        if (!svg) {
          reject(new Error('Không thể tạo ảnh vé.'));
          return;
        }
        svg.toDataURL(resolve);
      });

      if (Platform.OS === 'web') {
        const link = window.document.createElement('a');
        link.href = `data:image/png;base64,${base64Image}`;
        link.download = `ve-${ticket.bookingCode}.png`;
        link.click();
        return;
      }

      const file = new File(Paths.document, `ve-${ticket.bookingCode}.png`);
      file.create({ intermediates: true, overwrite: true });
      await file.write(base64Image, { encoding: 'base64' });

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error(
          `Ảnh vé đã lưu trong bộ nhớ ứng dụng nhưng không thể mở bảng chia sẻ. Đường dẫn: ${file.uri}`,
        );
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Lưu hoặc chia sẻ ảnh vé',
      });
      Alert.alert(
        'Đã tạo ảnh vé',
        'Ảnh vé đã được lưu trong ứng dụng. Chọn lưu vào Ảnh hoặc Tệp trong bảng chia sẻ để lưu ra thiết bị.',
      );
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Không thể tạo hoặc lưu ảnh vé.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Không thể lưu ảnh vé', message);
      }
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Svg
        ref={ticketImageRef}
        width={760}
        height={ticketImageHeight}
        viewBox={`0 0 760 ${ticketImageHeight}`}
        style={styles.exportImage}
        pointerEvents="none"
      >
        <Rect width="760" height={ticketImageHeight} fill="#F7FAFC" />
        <Rect x="24" y="24" width="712" height={ticketImageHeight - 48} rx="28" fill="#FFFFFF" />
        <SvgText x="60" y="88" fill="#2878B9" fontSize="24" fontWeight="bold">
          SKYHAVEN AIR
        </SvgText>
        <SvgText x="60" y="156" fill="#123B5D" fontSize="18" fontWeight="bold">
          MÃ ĐẶT CHỖ
        </SvgText>
        <SvgText x="60" y="208" fill="#123B5D" fontSize="42" fontWeight="bold">
          {ticket.bookingCode}
        </SvgText>
        <SvgText x="60" y="250" fill="#15803D" fontSize="17" fontWeight="bold">
          {offline ? 'BẢN LƯU OFFLINE' : 'ĐÃ XÁC NHẬN'}
        </SvgText>
        {itinerary.map((leg, index) => {
          const y = 320 + index * 150;
          return (
            <G key={`${leg.flight.flightNumber}-${index}`}>
              <SvgText x="60" y={y} fill="#123B5D" fontSize="30" fontWeight="bold">
                {leg.flight.origin?.code || '---'}  →  {leg.flight.destination?.code || '---'}
              </SvgText>
              <SvgText x="60" y={y + 36} fill="#526C80" fontSize="18">
                {leg.flight.flightNumber || '--'} · {leg.flight.airline?.name || '--'}
              </SvgText>
              <SvgText x="60" y={y + 68} fill="#526C80" fontSize="16">
                {leg.flight.departureAt
                  ? new Date(leg.flight.departureAt).toLocaleString('vi-VN')
                  : '--'}
              </SvgText>
              <SvgText x="60" y={y + 100} fill="#526C80" fontSize="16">
                Ghế: {leg.seats.join(', ') || 'Chưa chỉ định'}
              </SvgText>
            </G>
          );
        })}
        <SvgText x="60" y={350 + itinerary.length * 150} fill="#123B5D" fontSize="17" fontWeight="bold">
          HÀNH KHÁCH:
        </SvgText>
        {passengerLines.map((line, index) => (
          <SvgText
            key={`passenger-${index}`}
            x="60"
            y={376 + itinerary.length * 150 + index * 26}
            fill="#526C80"
            fontSize="16"
          >
            {line}
          </SvgText>
        ))}
        <G x="280" y={qrTop}>
          <QRCode
            value={qrData}
            size={200}
            backgroundColor="white"
            color="#123B5D"
          />
        </G>
        <SvgText
          x="380"
          y={qrTop + 232}
          fill="#62798B"
          fontSize="14"
          textAnchor="middle"
        >
          QUÉT QR ĐỂ MỞ GIAO DIỆN VÉ
        </SvgText>
      </Svg>

      <View style={styles.ticket}>
        <View style={styles.top}>
          <Text style={styles.brand}>SKYHAVEN AIR</Text>
          <Text style={styles.status}>
            ✓ {offline ? 'BẢN LƯU OFFLINE' : 'ĐÃ XÁC NHẬN'}
          </Text>
        </View>

        <Text style={styles.pnr}>{ticket.bookingCode}</Text>
        <Text style={styles.label}>MÃ ĐẶT CHỖ</Text>

        <View style={styles.route}>
          <View>
            <Text style={styles.airport}>
              {flight?.origin?.code || '---'}
            </Text>
            <Text style={styles.city}>{flight?.origin?.city || ''}</Text>
          </View>
          <Text style={styles.plane}>✈</Text>
          <View style={styles.destination}>
            <Text style={styles.airport}>
              {flight?.destination?.code || '---'}
            </Text>
            <Text style={styles.city}>
              {flight?.destination?.city || ''}
            </Text>
          </View>
        </View>

        <View style={styles.line} />
        <Text style={styles.field}>
          CHUYẾN BAY <Text style={styles.value}>{flight?.flightNumber || '--'}</Text>
        </Text>
        <Text style={styles.field}>
          HÃNG BAY <Text style={styles.value}>{flight?.airline?.name || '--'}</Text>
        </Text>
        <Text style={styles.field}>
          KHỞI HÀNH{' '}
          <Text style={styles.value}>
            {flight?.departureAt
              ? new Date(flight.departureAt).toLocaleString('vi-VN')
              : '--'}
          </Text>
        </Text>
        <Text style={styles.field}>
          HÀNH KHÁCH{' '}
          <Text style={styles.value}>
            {passengerNames}
          </Text>
        </Text>
        <Text style={styles.field}>
          GHẾ <Text style={styles.value}>{ticket.seats?.join(', ') || 'Chưa chỉ định'}</Text>
        </Text>

        {itinerary.slice(1).map((leg, index) => (
          <React.Fragment key={`${leg.flight.flightNumber}-${index}`}>
            <View style={styles.line} />
            <Text style={styles.field}>
              CHẶNG {index + 2}{' '}
              <Text style={styles.value}>
                {leg.flight.origin?.code || '---'} → {leg.flight.destination?.code || '---'}
              </Text>
            </Text>
            <Text style={styles.field}>
              CHUYẾN BAY{' '}
              <Text style={styles.value}>
                {leg.flight.flightNumber || '--'}
              </Text>
            </Text>
            <Text style={styles.field}>
              KHỞI HÀNH{' '}
              <Text style={styles.value}>
                {leg.flight.departureAt
                  ? new Date(leg.flight.departureAt).toLocaleString('vi-VN')
                  : '--'}
              </Text>
            </Text>
            <Text style={styles.field}>
              GHẾ <Text style={styles.value}>{leg.seats.join(', ') || 'Chưa chỉ định'}</Text>
            </Text>
          </React.Fragment>
        ))}

        <View style={styles.qrBox}>
          <QRCode
            value={qrData}
            size={190}
            backgroundColor="white"
            color="#123B5D"
          />
          <Text style={styles.qrCaption}>
            Mở giao diện vé trong ứng dụng · Không chứa thông tin thanh toán
          </Text>
        </View>

        {error ? <Text style={styles.warning}>{error}</Text> : null}
        <Text style={styles.disclaimer}>
          Quét QR để mở lại giao diện vé. Trên Expo Go, dự án cần đang chạy và
          điện thoại có thể kết nối máy chủ phát triển. QR không thay thế việc
          check-in và xác thực của hãng bay.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, savingImage && styles.disabled]}
        onPress={saveOfflineTicketImage}
        disabled={savingImage}
      >
        {savingImage ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.white}>Thông tin vé offline</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondary}
        onPress={() => router.replace('/booking-history')}
      >
        <Text style={styles.dark}>Quay lại lịch sử đặt vé</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 36,
    backgroundColor: '#F7FAFC',
  },
  exportImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0.01,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  ticket: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DCE8F1',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontWeight: '900',
    color: '#2878B9',
    letterSpacing: 1,
  },
  status: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  pnr: {
    fontSize: 32,
    fontWeight: '900',
    color: '#123B5D',
    marginTop: 22,
  },
  label: {
    fontSize: 10,
    color: '#62798B',
    letterSpacing: 1,
    fontWeight: '700',
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 22,
  },
  airport: {
    fontSize: 27,
    fontWeight: '900',
    color: '#123B5D',
  },
  city: {
    color: '#62798B',
    marginTop: 4,
  },
  destination: {
    alignItems: 'flex-end',
  },
  plane: {
    fontSize: 24,
    color: '#2878B9',
  },
  line: {
    height: 1,
    backgroundColor: '#DCE8F1',
    marginBottom: 16,
  },
  field: {
    fontSize: 11,
    color: '#62798B',
    marginVertical: 8,
    fontWeight: '700',
  },
  value: {
    fontSize: 13,
    color: '#123B5D',
    fontWeight: '700',
  },
  qrBox: {
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
  },
  qrCaption: {
    fontSize: 10,
    color: '#62798B',
    marginTop: 12,
    textAlign: 'center',
  },
  warning: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 16,
  },
  disclaimer: {
    fontSize: 11,
    color: '#62798B',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 16,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#2878B9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  white: {
    color: '#FFF',
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  secondary: {
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  dark: {
    color: '#526C80',
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#123B5D',
  },
  muted: {
    color: '#62798B',
    marginTop: 10,
    textAlign: 'center',
  },
});
