
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ApiRequestError,
  getFlightSeats,
  holdSeats,
  releaseSeats,
  type FlightSeatInfo,
} from '../../services/api';
import type { CabinClass } from '../../types/flight';
import { clearAuthData, getSavedToken } from '../../services/authStorage';
import { BookingSettingsNotice } from '../../components/booking-settings-notice';
import { usePublicSettings } from '../../hooks/use-public-settings';

const SEAT_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F'];

function parseSelectedSeats(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (seat): seat is string =>
          typeof seat === 'string' && seat.trim().length > 0,
      ).map((seat) => seat.trim());
    }
  } catch {
    return [];
  }

  return [];
}

function parseMultiSeats(value: string | string[] | undefined): { flightId: string; seats: string[] }[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((leg): leg is { flightId: string; seats: string[] } =>
      typeof leg === 'object' &&
      leg !== null &&
      'flightId' in leg &&
      typeof leg.flightId === 'string' &&
      'seats' in leg &&
      Array.isArray(leg.seats) &&
      leg.seats.every((seat: unknown) => typeof seat === 'string'),
    );
  } catch {
    return [];
  }
}

function parseCabinClass(value: string | string[] | undefined): CabinClass {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'premium_economy' || raw === 'business' || raw === 'first'
    ? raw
    : 'economy';
}

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function formatPrice(price: number) {
  return `${price.toLocaleString('vi-VN')} đ`;
}

export default function SeatsScreen() {
  const router = useRouter();
  const settingsQuery = usePublicSettings();
  const settings = settingsQuery.data;
  const bookingUnavailable =
    settings?.maintenanceMode === true ||
    settings?.bookingEnabled === false;
  const params = useLocalSearchParams<{
    id?: string | string[];
    flightId?: string | string[];
    seats?: string | string[];
    leg?: string | string[];
    returnFlightId?: string | string[];
    outboundFlightId?: string | string[];
    outboundSeats?: string | string[];
    returnSeats?: string | string[];
    passengerCount?: string | string[];
    multiFlightIds?: string | string[];
    multiSeats?: string | string[];
    legIndex?: string | string[];
    passengerTypes?: string | string[];
    cabinClass?: string | string[];
  }>();

  const routeFlightId = params.flightId ?? params.id ?? '';
  const legacyFlightId = Array.isArray(routeFlightId)
    ? routeFlightId[0] ?? ''
    : routeFlightId;
  const multiFlightIds = parseSelectedSeats(params.multiFlightIds);
  const multiSeats = useMemo(() => parseMultiSeats(params.multiSeats), [params.multiSeats]);
  const multiLegIndex = Number(Array.isArray(params.legIndex) ? params.legIndex[0] : params.legIndex) || 0;
  const isMultiCity = multiFlightIds.length >= 2;
  const flightId = isMultiCity ? multiFlightIds[multiLegIndex] ?? '' : legacyFlightId;
  const cabinClass = parseCabinClass(params.cabinClass);
  const leg = Array.isArray(params.leg) ? params.leg[0] : params.leg;
  const returnFlightId = Array.isArray(params.returnFlightId)
    ? params.returnFlightId[0]
    : params.returnFlightId;
  const outboundFlightId = Array.isArray(params.outboundFlightId)
    ? params.outboundFlightId[0]
    : params.outboundFlightId;
  const passengerCountParam = Array.isArray(params.passengerCount)
    ? params.passengerCount[0]
    : params.passengerCount;
  const passengerCount = Number(passengerCountParam) || undefined;

  const [seats, setSeats] = useState<FlightSeatInfo[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>(() =>
    isMultiCity
      ? multiSeats[multiLegIndex]?.seats ?? []
      : parseSelectedSeats(params.seats),
  );
  const [loading, setLoading] = useState(true);
  const [loadedFlightId, setLoadedFlightId] = useState('');
  const [busySeat, setBusySeat] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  const redirectToLoginOnUnauthorized = async (error: unknown) => {
    if (!(error instanceof ApiRequestError) || error.status !== 401) {
      return false;
    }

    await clearAuthData();
    setToken(null);
    showMessage(
      'Phiên đăng nhập hết hạn',
      'Vui lòng đăng nhập lại để tiếp tục đặt vé.',
    );
    router.replace('/login');
    return true;
  };

  useEffect(() => {
    const restoredSeats = isMultiCity
      ? multiSeats[multiLegIndex]?.seats ?? []
      : parseSelectedSeats(params.seats);

    const timer = setTimeout(() => {
      setSelectedSeats(restoredSeats);
    }, 0);

    return () => clearTimeout(timer);
  }, [flightId, params.seats, multiSeats, multiLegIndex, isMultiCity]);

  const loadSeats = useCallback(async (isActive: () => boolean = () => true) => {
    if (!flightId) {
      if (isActive()) {
        setLoadError('Không tìm thấy mã chuyến bay.');
        setLoading(false);
      }
      return;
    }

    try {
      const [response, savedToken] = await Promise.all([
        getFlightSeats(flightId),
        getSavedToken(),
      ]);

      if (isActive()) {
        setLoadError('');
        setSeats(response.data);
        setToken(savedToken);
        setLoadedFlightId(flightId);
      }
    } catch (error) {
      if (isActive()) {
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Không thể tải sơ đồ ghế.',
        );
        setLoadedFlightId(flightId);
      }
    } finally {
      if (isActive()) {
        setLoading(false);
      }
    }
  }, [flightId]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void loadSeats(() => active);
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadSeats]);

  const handleToggleSeat = async (seat: FlightSeatInfo) => {
    if (busySeat || submitting) return;

    const isSelected = selectedSeats.includes(seat.seatNumber);

    if (!isSelected && bookingUnavailable) {
      showMessage(
        settings?.maintenanceMode ? 'Hệ thống đang bảo trì' : 'Tạm ngừng đặt vé',
        settings?.maintenanceMode
          ? 'Vui lòng quay lại sau.'
          : 'Hiện tại hệ thống chưa nhận đặt vé mới.',
      );
      return;
    }

    // Bỏ chọn: chỉ nhả ghế đang do tài khoản này giữ.
    if (isSelected) {
      if (!token) {
        showMessage('Cần đăng nhập', 'Vui lòng đăng nhập lại để nhả ghế.');
        return;
      }

      setBusySeat(seat.seatNumber);

      try {
        await releaseSeats(flightId, [seat.seatNumber], token);

        setSelectedSeats((current) =>
          current.filter((number) => number !== seat.seatNumber),
        );
      } catch (error) {
        if (await redirectToLoginOnUnauthorized(error)) return;

        showMessage(
          'Không thể nhả ghế',
          error instanceof Error ? error.message : 'Vui lòng thử lại.',
        );
      } finally {
        setBusySeat(null);
      }

      return;
    }

    if (seat.status !== 'available') {
      showMessage(
        'Ghế không khả dụng',
        'Ghế này đã được đặt và không thể chọn.',
      );
      return;
    }

    if (seat.cabinClass !== cabinClass) {
      showMessage('Khác hạng ghế', 'Vui lòng chọn ghế thuộc hạng đã tìm kiếm.');
      return;
    }

    if (selectedSeats.length >= (passengerCount ?? 9)) {
      showMessage('Đã đủ số ghế', `Bạn chỉ cần chọn ${passengerCount ?? 9} ghế.`);
      return;
    }

    if (!token) {
      showMessage(
        'Cần đăng nhập',
        'Bạn cần đăng nhập trước khi giữ ghế.',
      );
      router.push('/login');
      return;
    }

    setBusySeat(seat.seatNumber);

    try {
      // Chỉ giữ ghế mới chọn để tránh yêu cầu giữ lại các khóa cũ.
      await holdSeats(flightId, [seat.seatNumber], token);

      setSelectedSeats((current) =>
        current.includes(seat.seatNumber)
          ? current
          : [...current, seat.seatNumber],
      );
    } catch (error) {
      if (await redirectToLoginOnUnauthorized(error)) return;

      showMessage(
        'Không thể giữ ghế',
        error instanceof Error
          ? error.message
          : 'Không thể xác nhận trạng thái giữ ghế. Vui lòng thử lại.',
      );

      // Đồng bộ lại tình trạng ghế sau khi có xung đột.
      try {
        const response = await getFlightSeats(flightId);
        setSeats(response.data);
      } catch {
        // Giữ nguyên lỗi ban đầu để hiển thị cho người dùng.
      }
    } finally {
      setBusySeat(null);
    }
  };

  const handleContinue = async () => {
    if (passengerCount && selectedSeats.length !== passengerCount) {
      showMessage(
        'Chưa đủ ghế',
        `Vui lòng chọn đúng ${passengerCount} ghế cho ${passengerCount} hành khách.`,
      );
      return;
    }

    if (selectedSeats.length === 0) {
      showMessage('Chưa chọn ghế', 'Vui lòng chọn ít nhất một ghế.');
      return;
    }

    if (!token) {
      showMessage('Cần đăng nhập', 'Vui lòng đăng nhập để tiếp tục.');
      router.push('/login');
      return;
    }

    setSubmitting(true);

    try {
      if (isMultiCity) {
        const completedLegs = multiFlightIds.map((id, index) => ({
          flightId: id,
          seats: index === multiLegIndex
            ? selectedSeats
            : multiSeats[index]?.seats ?? [],
        }));
        const seatedPassengerCount = passengerCount ?? selectedSeats.length;

        if (completedLegs.some((item, index) => index <= multiLegIndex && item.seats.length !== seatedPassengerCount)) {
          showMessage('Chưa đủ ghế', 'Vui lòng chọn đủ ghế cho từng chặng trước khi tiếp tục.');
          return;
        }

        await Promise.all(completedLegs
          .slice(0, multiLegIndex + 1)
          .map((item) => holdSeats(item.flightId, item.seats, token)));

        const passengerTypes = Array.isArray(params.passengerTypes)
          ? params.passengerTypes[0]
          : params.passengerTypes;
        if (multiLegIndex < multiFlightIds.length - 1) {
          router.push({
            pathname: '/booking/seats' as never,
            params: {
              multiFlightIds: JSON.stringify(multiFlightIds),
              multiSeats: JSON.stringify(completedLegs),
              legIndex: String(multiLegIndex + 1),
              passengerCount: String(seatedPassengerCount),
              passengerTypes,
              cabinClass,
            },
          });
        } else {
          router.push({
            pathname: '/booking/passenger' as never,
            params: {
              multiLegs: JSON.stringify(completedLegs),
              passengerCount: String(seatedPassengerCount),
              passengerTypes,
              cabinClass,
            },
          });
        }
        return;
      }

      if (leg === 'outbound' && returnFlightId) {
        await holdSeats(flightId, selectedSeats, token);
        router.push({
          pathname: '/booking/seats' as never,
          params: {
            flightId: returnFlightId,
            leg: 'return',
            outboundFlightId: flightId,
            outboundSeats: JSON.stringify(selectedSeats),
            seats: JSON.stringify(parseSelectedSeats(params.returnSeats)),
            passengerCount: passengerCount ? String(passengerCount) : undefined,
            passengerTypes: params.passengerTypes,
            cabinClass,
          },
        });
        return;
      }

      if (leg === 'return' && outboundFlightId) {
        const outboundSeats = parseSelectedSeats(params.outboundSeats);
        if (outboundSeats.length !== selectedSeats.length) {
          showMessage(
            'Số ghế không khớp',
            'Vui lòng chọn cùng số ghế cho chiều đi và chiều về.',
          );
          return;
        }

        await Promise.all([
          holdSeats(outboundFlightId, outboundSeats, token),
          holdSeats(flightId, selectedSeats, token),
        ]);

        router.push({
          pathname: '/booking/passenger' as never,
          params: {
            flightId: outboundFlightId,
            seats: JSON.stringify(outboundSeats),
            returnFlightId: flightId,
            returnSeats: JSON.stringify(selectedSeats),
            passengerTypes: params.passengerTypes,
            cabinClass,
          },
        });
        return;
      }

      // The selected seats already have Redis holds; continue without reacquiring them.
      router.push({
        pathname: '/booking/passenger' as never,
        params: {
          flightId,
          seats: JSON.stringify(selectedSeats),
          passengerTypes: params.passengerTypes,
          cabinClass,
        },
      });
    } catch (error) {
      if (await redirectToLoginOnUnauthorized(error)) return;

      showMessage(
        'Không thể tiếp tục',
        error instanceof Error ? error.message : 'Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalSeatFee = seats
    .filter((seat) => selectedSeats.includes(seat.seatNumber))
    .reduce((total, seat) => total + seat.extraPrice, 0);

  const rows = Array.from(
    new Set(
      seats
        .map((seat) => Number.parseInt(seat.seatNumber, 10))
        .filter(Number.isFinite),
    ),
  ).sort((a, b) => a - b);

  if (loading || loadedFlightId !== flightId) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2878B9" />
        <Text style={styles.muted}>Đang tải sơ đồ ghế...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{loadError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setLoading(true);
          void loadSeats();
        }}>
          <Text style={styles.primaryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <BookingSettingsNotice
          settings={settings}
          error={settingsQuery.isError ? 'Không tải được cài đặt.' : undefined}
        />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isMultiCity) {
              const nextMultiSeats = multiFlightIds.map((id, index) => ({
                flightId: id,
                seats: index === multiLegIndex
                  ? selectedSeats
                  : multiSeats[index]?.seats ?? [],
              }));
              if (multiLegIndex > 0) {
                router.replace({
                  pathname: '/booking/seats' as never,
                  params: {
                    multiFlightIds: JSON.stringify(multiFlightIds),
                    multiSeats: JSON.stringify(nextMultiSeats),
                    legIndex: String(multiLegIndex - 1),
                    passengerCount: passengerCountParam,
                    passengerTypes: params.passengerTypes,
                    cabinClass,
                  },
                });
              } else {
                router.replace('/explore');
              }
              return;
            }

            if (leg === 'return' && outboundFlightId) {
              router.replace({
                pathname: '/booking/seats' as never,
                params: {
                  flightId: outboundFlightId,
                  seats: params.outboundSeats,
                  leg: 'outbound',
                  returnFlightId: flightId,
                  returnSeats: JSON.stringify(selectedSeats),
                  passengerCount: passengerCountParam,
                  passengerTypes: params.passengerTypes,
                  cabinClass,
                },
              });
              return;
            }

            if (leg === 'outbound' && returnFlightId) {
              router.back();
              return;
            }

            if (flightId) {
              router.replace({
                pathname: '/flights/[id]' as never,
                params: { id: flightId, passengerCount: passengerCountParam },
              });
            } else {
              router.replace('/explore');
            }
          }}
        >
          <Text style={styles.backText}>‹ Quay lại</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {isMultiCity
            ? `Chọn ghế · Chặng ${multiLegIndex + 1}/${multiFlightIds.length}`
            : leg === 'return'
              ? 'Chọn ghế chiều về'
              : 'Chọn ghế chiều đi'}
        </Text>
        <Text style={styles.subtitle}>
          {passengerCount
            ? `Chọn ${passengerCount} ghế thuộc hạng ${cabinClass.replace('_', ' ')}.`
            : 'Chọn ghế phù hợp cho chuyến bay của bạn.'}
        </Text>

        <View style={styles.legend}>
          <Legend color="#FFFFFF" border="#CBD5E1" label="Còn trống" />
          <Legend color="#2878B9" label="Đang chọn" />
          <Legend color="#D1D5DB" label="Đã đặt" />
          <Legend color="#FDE68A" label="Đang giữ" />
        </View>

        <View style={styles.plane}>
          <View style={styles.cockpit}>
            <Text style={styles.cockpitText}>✈ ĐẦU MÁY BAY</Text>
          </View>

          <View style={styles.columnLabels}>
            {SEAT_COLUMNS.map((letter, index) => (
              <React.Fragment key={letter}>
                {index === 3 && <View style={styles.aisle} />}
                <Text style={styles.columnLabel}>{letter}</Text>
              </React.Fragment>
            ))}
          </View>

          {rows.length === 0 ? (
            <Text style={styles.muted}>
              Chuyến bay chưa có dữ liệu ghế.
            </Text>
          ) : (
            rows.map((row) => (
              <View key={row} style={styles.seatRow}>
                <Text style={styles.rowNumber}>{row}</Text>

                {SEAT_COLUMNS.map((letter, index) => {
                  const seatNumber = `${row}${letter}`;
                  const seat = seats.find(
                    (item) => item.seatNumber === seatNumber,
                  );

                  if (index === 3) {
                    // Lối đi giữa hai cụm ghế.
                    return (
                      <React.Fragment key={letter}>
                        <View style={styles.aisle} />
                        <SeatButton
                          seat={seat}
                          selected={selectedSeats.includes(seatNumber)}
                          busy={busySeat === seatNumber}
                          onPress={() => {
                            if (seat) void handleToggleSeat(seat);
                          }}
                          disabled={bookingUnavailable || seat?.cabinClass !== cabinClass}
                        />
                      </React.Fragment>
                    );
                  }

                  return (
                    <SeatButton
                      key={letter}
                      seat={seat}
                      selected={selectedSeats.includes(seatNumber)}
                      busy={busySeat === seatNumber}
                      onPress={() => {
                        if (seat) void handleToggleSeat(seat);
                      }}
                      disabled={bookingUnavailable || seat?.cabinClass !== cabinClass}
                    />
                  );
                })}

                <Text style={styles.rowNumber}>{row}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Ghế đã chọn</Text>
          <Text style={styles.selectedText}>
            {selectedSeats.length > 0
              ? selectedSeats.join(', ')
              : 'Chưa chọn ghế'}
          </Text>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.muted}>Phụ phí ghế</Text>
            <Text style={styles.price}>{formatPrice(totalSeatFee)}</Text>
          </View>

          <Text style={styles.note}>
            Ghế được giữ tạm thời tối đa 10 phút. Hãy hoàn tất thông tin đặt
            vé trong thời gian này.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.muted}>Số ghế đã chọn</Text>
          <Text style={styles.bottomCount}>{selectedSeats.length} ghế</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            (selectedSeats.length === 0 || submitting || !!busySeat) &&
              styles.disabled,
          ]}
          disabled={
            selectedSeats.length === 0 ||
            submitting ||
            !!busySeat ||
            bookingUnavailable
          }
          onPress={() => void handleContinue()}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              Tiếp tục →
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Legend({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendBox,
          { backgroundColor: color, borderColor: border ?? color },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function SeatButton({
  seat,
  selected,
  busy,
  disabled,
  onPress,
}: {
  seat?: FlightSeatInfo;
  selected: boolean;
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  if (!seat) {
    return <View style={styles.seatPlaceholder} />;
  }

  const unavailable = seat.status !== 'available';

  let backgroundColor = '#FFFFFF';
  let borderColor = '#CBD5E1';
  let textColor = '#526C80';

  if (selected) {
    backgroundColor = '#2878B9';
    borderColor = '#2878B9';
    textColor = '#FFFFFF';
  } else if (seat.status === 'booked') {
    backgroundColor = '#D1D5DB';
    borderColor = '#D1D5DB';
    textColor = '#62798B';
  } else if (seat.held) {
    backgroundColor = '#FDE68A';
    borderColor = '#F59E0B';
    textColor = '#92400E';
  }

  return (
    <TouchableOpacity
      style={[
        styles.seat,
        { backgroundColor, borderColor },
        unavailable && !selected && styles.unavailable,
      ]}
      disabled={busy || (disabled && !selected) || (unavailable && !selected)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ghế ${seat.seatNumber}`}
    >
      {busy ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.seatText, { color: textColor }]}>
          {seat.seatNumber}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  content: { padding: 18, paddingBottom: 30 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  muted: { color: '#62798B', fontSize: 13 },
  error: { color: '#DC2626', textAlign: 'center', marginBottom: 16 },
  backButton: { marginBottom: 18, alignSelf: 'flex-start' },
  backText: { color: '#2878B9', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: '#123B5D' },
  subtitle: { marginTop: 7, marginBottom: 20, color: '#62798B' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendBox: {
    width: 15,
    height: 15,
    borderWidth: 1,
    borderRadius: 4,
  },
  legendText: { fontSize: 11, color: '#526C80' },
  plane: {
    backgroundColor: '#EAF4FC',
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 20,
    alignItems: 'center',
  },
  cockpit: {
    width: '65%',
    paddingVertical: 15,
    marginBottom: 20,
    alignItems: 'center',
    borderTopLeftRadius: 65,
    borderTopRightRadius: 65,
    borderWidth: 2,
    borderColor: '#A9CDE5',
    backgroundColor: '#EAF4FC',
  },
  cockpitText: { color: '#2878B9', fontWeight: '700', fontSize: 12 },
  columnLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 10,
  },
  columnLabel: {
    width: 37,
    textAlign: 'center',
    color: '#62798B',
    fontWeight: '700',
  },
  aisle: { width: 18 },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  rowNumber: {
    width: 17,
    textAlign: 'center',
    fontSize: 11,
    color: '#62798B',
  },
  seat: {
    width: 37,
    height: 37,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatText: { fontSize: 10, fontWeight: '700' },
  seatPlaceholder: { width: 37, height: 37 },
  unavailable: { opacity: 0.9 },
  summary: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCE8F1',
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#123B5D' },
  selectedText: {
    marginTop: 8,
    color: '#2878B9',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: { height: 1, backgroundColor: '#DCE8F1', marginVertical: 14 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: { fontWeight: '700', color: '#123B5D' },
  note: { marginTop: 12, fontSize: 12, lineHeight: 18, color: '#62798B' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#DCE8F1',
  },
  bottomCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#123B5D',
    marginTop: 3,
  },
  continueButton: {
    backgroundColor: '#2878B9',
    minWidth: 145,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
  retryButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2878B9',
  },
});
