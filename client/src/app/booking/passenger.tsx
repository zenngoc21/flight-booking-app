import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  createBooking,
  holdSeats,
  type BookingLegInput,
  type PassengerInput,
} from '../../services/api';
import type { CabinClass } from '../../types/flight';
import { BookingSettingsNotice } from '../../components/booking-settings-notice';
import { usePublicSettings } from '../../hooks/use-public-settings';
import {
  getSavedToken,
  getSavedUser,
  type CurrentUser,
} from '../../services/authStorage';

type PassengerForm = PassengerInput;
type SearchParam = string | string[] | undefined;
type PassengerType = NonNullable<PassengerInput['passengerType']>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function firstParam(value: SearchParam): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseSeats(value: SearchParam): string[] {
  if (Array.isArray(value) && value.length > 1) {
    return value.map((seat) => seat.trim()).filter(Boolean);
  }

  const raw = firstParam(value).trim();

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
    return [raw];
  }

  return [];
}

function parsePassengerTypes(value: SearchParam, fallbackCount: number): PassengerType[] {
  const raw = firstParam(value);
  if (!raw) return Array.from({ length: fallbackCount }, () => 'adult');

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const validTypes = parsed.filter((type): type is PassengerType =>
        type === 'adult' || type === 'child' || type === 'infant');
      if (validTypes.length === parsed.length) return validTypes;
    }
  } catch {
    return Array.from({ length: fallbackCount }, () => 'adult');
  }
  return Array.from({ length: fallbackCount }, () => 'adult');
}

function parseCabinClass(value: SearchParam): CabinClass {
  const raw = firstParam(value);
  return raw === 'premium_economy' || raw === 'business' || raw === 'first'
    ? raw
    : 'economy';
}

function parseBookingLegs(value: SearchParam): BookingLegInput[] {
  const raw = firstParam(value);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((leg) => {
      if (
        typeof leg !== 'object' ||
        leg === null ||
        !('flightId' in leg) ||
        typeof leg.flightId !== 'string' ||
        !('seats' in leg) ||
        !Array.isArray(leg.seats) ||
        !leg.seats.every((seat: unknown) => typeof seat === 'string')
      ) {
        return [];
      }

      return [{
        flightId: leg.flightId,
        seats: leg.seats,
        cabinClass: parseCabinClass('cabinClass' in leg ? String(leg.cabinClass) : undefined),
        checkedBagCount: 'checkedBagCount' in leg && typeof leg.checkedBagCount === 'number'
          ? leg.checkedBagCount
          : 0,
      }];
    });
  } catch {
    return [];
  }
}

function splitName(fullName: string | undefined) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  const firstName = parts.length > 0 ? parts[parts.length - 1] : '';

  return {
    firstName,
    lastName: parts.slice(0, -1).join(' '),
  };
}

function createPassenger(user: CurrentUser | null): PassengerForm {
  const name = splitName(user?.fullName);

  return {
    firstName: name.firstName,
    lastName: name.lastName,
    gender: 'other',
    passengerType: 'adult',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  };
}

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message);
  }
}

function formatPrice(price: number) {
  return `${price.toLocaleString('vi-VN')} đ`;
}

export default function PassengerScreen() {
  const router = useRouter();
  const settingsQuery = usePublicSettings();
  const settings = settingsQuery.data;
  const bookingUnavailable =
    settings?.maintenanceMode === true ||
    settings?.bookingEnabled === false;
  const params = useLocalSearchParams<{
    flightId?: string | string[];
    seats?: string | string[];
    returnFlightId?: string | string[];
    returnSeats?: string | string[];
    multiLegs?: string | string[];
    passengerTypes?: string | string[];
    passengerCount?: string | string[];
    cabinClass?: string | string[];
  }>();
  const multiLegs = useMemo(() => parseBookingLegs(params.multiLegs), [params.multiLegs]);
  const flightId = firstParam(params.flightId) || multiLegs[0]?.flightId || '';
  const seats = useMemo(() => parseSeats(params.seats), [params.seats]);
  const returnFlightId = firstParam(params.returnFlightId);
  const returnSeats = useMemo(
    () => parseSeats(params.returnSeats),
    [params.returnSeats],
  );
  const passengerTypes = useMemo(
    () => parsePassengerTypes(params.passengerTypes, multiLegs[0]?.seats.length ?? seats.length),
    [params.passengerTypes, multiLegs, seats.length],
  );
  const multiCity = multiLegs.length >= 2;
  const primarySeats = multiCity ? multiLegs[0]?.seats ?? [] : seats;

  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [outboundCheckedBagCount, setOutboundCheckedBagCount] = useState(0);
  const [returnCheckedBagCount, setReturnCheckedBagCount] = useState(0);
  const [multiCheckedBagCounts, setMultiCheckedBagCounts] = useState<number[]>([]);
  const [protectionEnabled, setProtectionEnabled] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  const goBackToSeats = () => {
    if (multiCity) {
      router.replace({
        pathname: '/booking/seats' as never,
        params: {
          multiFlightIds: JSON.stringify(multiLegs.map((leg) => leg.flightId)),
          multiSeats: JSON.stringify(multiLegs),
          legIndex: String(multiLegs.length - 1),
          passengerCount: String(multiLegs[0]?.seats.length ?? 0),
          passengerTypes: JSON.stringify(passengerTypes),
          cabinClass: firstParam(params.cabinClass),
        },
      });
      return;
    }

    if (!flightId) {
      router.replace('/explore');
      return;
    }

    if (returnFlightId) {
      router.replace({
        pathname: '/booking/seats' as never,
        params: {
          flightId: returnFlightId,
          leg: 'return',
          outboundFlightId: flightId,
          outboundSeats: JSON.stringify(seats),
          seats: JSON.stringify(returnSeats),
          passengerCount: String(seats.length),
          passengerTypes: JSON.stringify(passengerTypes),
          cabinClass: firstParam(params.cabinClass),
        },
      });
      return;
    }

    router.replace({
      pathname: '/booking/seats' as never,
      params: {
        flightId,
        seats: JSON.stringify(seats),
        passengerCount: String(seats.length),
        passengerTypes: JSON.stringify(passengerTypes),
        cabinClass: firstParam(params.cabinClass),
      },
    });
  };

  useEffect(() => {
    let active = true;

    async function loadSavedDetails() {
      try {
        const [savedToken, savedUser] = await Promise.all([
          getSavedToken(),
          getSavedUser(),
        ]);

        if (active) {
          setToken(savedToken);
          setPassengers(
            passengerTypes.map((passengerType) => ({
              ...createPassenger(savedUser),
              passengerType,
            })),
          );
          setMultiCheckedBagCounts(multiLegs.map((leg) => leg.checkedBagCount ?? 0));
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Không thể tải thông tin tài khoản.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSavedDetails();

    return () => {
      active = false;
    };
  }, [seats, passengerTypes, multiLegs]);

  const updatePassenger = (
    index: number,
    updates: Partial<PassengerForm>,
  ) => {
    setPassengers((current) =>
      current.map((passenger, passengerIndex) =>
        passengerIndex === index
          ? { ...passenger, ...updates }
          : passenger,
      ),
    );
  };

  const handleSubmit = async () => {
    const bookingSeats = multiCity ? multiLegs[0]?.seats ?? [] : seats;
    const adultCount = passengers.filter((passenger) => passenger.passengerType === 'adult').length;
    const infantCount = passengers.filter((passenger) => passenger.passengerType === 'infant').length;

    if (bookingUnavailable) {
      showMessage(
        settings?.maintenanceMode ? 'Hệ thống đang bảo trì' : 'Tạm ngừng đặt vé',
        settings?.maintenanceMode
          ? 'Vui lòng quay lại sau.'
          : 'Hiện tại hệ thống chưa nhận đặt vé mới.',
      );
      return;
    }

    if (
      !flightId ||
      bookingSeats.length === 0 ||
      passengers.length !== passengerTypes.length ||
      passengers.filter((passenger) => passenger.passengerType !== 'infant').length !== bookingSeats.length ||
      (multiCity && multiLegs.some((leg) => leg.seats.length !== bookingSeats.length)) ||
      (returnFlightId && returnSeats.length !== seats.length)
    ) {
      showMessage(
        'Thiếu thông tin chuyến bay',
        'Vui lòng quay lại chọn đủ chuyến bay và ghế cho từng chặng trước khi tiếp tục.',
      );
      return;
    }

    if (
      new Set(bookingSeats).size !== bookingSeats.length ||
      new Set(returnSeats).size !== returnSeats.length ||
      bookingSeats.length > 9 ||
      (multiCity && multiLegs.some((leg) => new Set(leg.seats).size !== leg.seats.length))
    ) {
      showMessage(
        'Danh sách ghế không hợp lệ',
        'Vui lòng quay lại chọn lại ghế cho từng chuyến bay.',
      );
      return;
    }

    const normalizedPassengers = passengers.map((passenger) => ({
      ...passenger,
      firstName: passenger.firstName.trim(),
      lastName: passenger.lastName.trim(),
      email: passenger.email.trim().toLowerCase(),
      phone: passenger.phone.trim(),
    }));

    const invalidPassengerIndex = normalizedPassengers.findIndex(
      (passenger) =>
        !passenger.firstName ||
        !passenger.lastName ||
        !EMAIL_PATTERN.test(passenger.email) ||
        passenger.phone.length < 6 ||
        passenger.phone.length > 20,
    );

    if (invalidPassengerIndex !== -1) {
      showMessage(
        'Thông tin chưa hợp lệ',
        `Vui lòng kiểm tra họ tên, email và số điện thoại của hành khách ${invalidPassengerIndex + 1}.`,
      );
      return;
    }

    if (adultCount === 0 || infantCount > adultCount) {
      showMessage(
        'Loại hành khách không hợp lệ',
        'Cần ít nhất một người lớn và mỗi người lớn chỉ được đi cùng tối đa một trẻ sơ sinh.',
      );
      return;
    }

    if (!token) {
      showMessage(
        'Cần đăng nhập',
        'Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.',
      );
      router.push('/login');
      return;
    }

    setSubmitting(true);

    try {
      await Promise.all([
        ...(multiCity
          ? multiLegs.map((leg) => holdSeats(leg.flightId, leg.seats, token))
          : [holdSeats(flightId, seats, token)]),
        ...(!multiCity && returnFlightId ? [holdSeats(returnFlightId, returnSeats, token)] : []),
      ]);

      const result = await createBooking({
        ...(multiCity
          ? {
              legs: multiLegs.map((leg, index) => ({
                ...leg,
                cabinClass: parseCabinClass(params.cabinClass),
                checkedBagCount: multiCheckedBagCounts[index] ?? 0,
              })),
            }
          : {
              flightId,
              seats,
              ...(returnFlightId ? { returnFlightId, returnSeats } : {}),
            }),
        passengers: normalizedPassengers,
        checkedBagCount: multiCity ? 0 : outboundCheckedBagCount,
        ...(multiCity
          ? {}
          : {
              ...(returnFlightId ? { returnCheckedBagCount } : {}),
            }),
        protectionEnabled,
      });

      router.replace({
        pathname: '/booking/payment',
        params: {
          bookingId: result.data.id,
        },
      });
    } catch (error) {
      showMessage(
        'Không thể tạo đặt chỗ',
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi tạo đặt chỗ. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const baggageOptions = multiCity
    ? multiLegs.map((_, index) => ({
        key: `leg-${index}`,
        label: `Chặng ${index + 1}`,
        count: multiCheckedBagCounts[index] ?? 0,
        setCount: (update: React.SetStateAction<number>) =>
          setMultiCheckedBagCounts((current) => current.map((count, itemIndex) =>
            itemIndex === index
              ? typeof update === 'function' ? update(count) : update
              : count,
          )),
      }))
    : [
        {
          key: 'outbound',
          label: returnFlightId ? 'Chiều đi' : 'Chuyến bay',
          count: outboundCheckedBagCount,
          setCount: setOutboundCheckedBagCount,
        },
        ...(returnFlightId
          ? [{
              key: 'return',
              label: 'Chiều về',
              count: returnCheckedBagCount,
              setCount: setReturnCheckedBagCount,
            }]
          : []),
      ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.muted}>Đang tải thông tin...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{loadError}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={goBackToSeats}
        >
          <Text style={styles.primaryButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBackToSeats}
        >
          <Text style={styles.backText}>‹ Quay lại chọn ghế</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {multiCity
            ? 'Thông tin hành khách nhiều chặng'
            : returnFlightId
            ? 'Thông tin hành khách khứ hồi'
            : 'Thông tin hành khách'}
        </Text>
        <Text style={styles.subtitle}>
          Điền thông tin chính xác theo giấy tờ tùy thân.
        </Text>

        <BookingSettingsNotice
          settings={settings}
          error={settingsQuery.isError ? 'Không tải được cài đặt.' : undefined}
        />

        {settings?.cancellationPolicy ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Chính sách hủy vé</Text>
            <Text style={styles.muted}>{settings.cancellationPolicy}</Text>
          </View>
        ) : null}

        {!flightId || primarySeats.length === 0 || (multiCity && multiLegs.some((leg) => leg.seats.length !== primarySeats.length)) ? (
          <View style={styles.errorCard}>
            <Text style={styles.error}>
              Không tìm thấy mã chuyến bay hoặc danh sách ghế.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={goBackToSeats}
            >
              <Text style={styles.primaryButtonText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>Ghế đã chọn</Text>
              {multiCity ? multiLegs.map((leg, index) => (
                <Text key={leg.flightId} style={styles.selectedSeats}>
                  Chặng {index + 1}: {leg.seats.join(', ')}
                </Text>
              )) : <Text style={styles.selectedSeats}>{seats.join(', ')}</Text>}
              {Boolean(returnFlightId) && (
                <Text style={styles.selectedSeats}>
                  Ghế chiều về: {returnSeats.join(', ')}
                </Text>
              )}
              <Text style={styles.muted}>
                {passengers.length} hành khách · {primarySeats.length} ghế (trẻ sơ sinh không có ghế riêng)
              </Text>
            </View>

            {passengers.map((passenger, index) => (
              <View key={`passenger-${index}`} style={styles.card}>
                <Text style={styles.sectionTitle}>
                  Hành khách {index + 1} · {passenger.passengerType === 'infant' ? 'Trẻ sơ sinh · không có ghế' : `Ghế ${primarySeats[index]}`}
                </Text>

                <Text style={styles.label}>Loại hành khách *</Text>
                {passenger.passengerType === 'infant' ? (
                  <Text style={styles.muted}>Trẻ sơ sinh · giá demo bằng 10% giá vé người lớn, không chiếm ghế.</Text>
                ) : (
                  <>
                    <View style={styles.genderRow}>{([['adult','Người lớn'],['child','Trẻ em']] as const).map(([type,label]) => <TouchableOpacity key={type} style={[styles.genderOption, passenger.passengerType===type && styles.genderOptionSelected]} onPress={() => updatePassenger(index,{passengerType:type})} disabled={submitting}><Text style={[styles.genderText,passenger.passengerType===type&&styles.genderTextSelected]}>{label}</Text></TouchableOpacity>)}</View>
                    <Text style={styles.muted}>Vé trẻ em được tính 75% giá vé cơ bản (chưa gồm phụ phí).</Text>
                  </>
                )}

                <Text style={styles.label}>Họ và tên đệm *</Text>
                <TextInput
                  style={styles.input}
                  value={passenger.lastName}
                  onChangeText={(lastName) =>
                    updatePassenger(index, { lastName })
                  }
                  placeholder="Nguyễn Văn"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  editable={!submitting}
                />

                <Text style={styles.label}>Tên *</Text>
                <TextInput
                  style={styles.input}
                  value={passenger.firstName}
                  onChangeText={(firstName) =>
                    updatePassenger(index, { firstName })
                  }
                  placeholder="An"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  editable={!submitting}
                />

                <Text style={styles.label}>Giới tính *</Text>
                <View style={styles.genderRow}>
                  {([
                    ['male', 'Nam'],
                    ['female', 'Nữ'],
                    ['other', 'Khác'],
                  ] as const).map(([gender, label]) => {
                    const selected = passenger.gender === gender;

                    return (
                      <TouchableOpacity
                        key={gender}
                        style={[
                          styles.genderOption,
                          selected && styles.genderOptionSelected,
                        ]}
                        onPress={() => updatePassenger(index, { gender })}
                        disabled={submitting}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            selected && styles.genderTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={passenger.email}
                  onChangeText={(email) => updatePassenger(index, { email })}
                  placeholder="email@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                />

                <Text style={styles.label}>Số điện thoại *</Text>
                <TextInput
                  style={styles.input}
                  value={passenger.phone}
                  onChangeText={(phone) => updatePassenger(index, { phone })}
                  placeholder="0901234567"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  editable={!submitting}
                />
              </View>
            ))}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Dịch vụ bổ sung</Text>

              {baggageOptions.map(({ key, label, count, setCount }) => (
                <View key={key}>
                  <TouchableOpacity
                    style={styles.protectionRow}
                    onPress={() =>
                      setCount((current) => current > 0 ? 0 : 1)
                    }
                    disabled={submitting}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: count > 0 }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        count > 0 && styles.checkboxSelected,
                      ]}
                    >
                      {count > 0 && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.optionDescription}>
                      <Text style={styles.optionTitle}>
                        Hành lý ký gửi · {label}
                      </Text>
                      <Text style={styles.muted}>
                        {formatPrice(300_000)} / kiện
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {count > 0 && (
                    <View style={styles.optionRow}>
                      <View style={styles.optionDescription}>
                        <Text style={styles.optionTitle}>
                          Số kiện · {label}
                        </Text>
                      </View>
                      <View style={styles.counter}>
                        <TouchableOpacity
                          style={styles.counterButton}
                          onPress={() =>
                            setCount((current) => Math.max(0, current - 1))
                          }
                          disabled={submitting}
                          accessibilityLabel={`Giảm số kiện hành lý ${label}`}
                        >
                          <Text style={styles.counterText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.counterValue}>{count}</Text>
                        <TouchableOpacity
                          style={styles.counterButton}
                          onPress={() =>
                            setCount((current) => Math.min(9, current + 1))
                          }
                          disabled={count === 9 || submitting}
                          accessibilityLabel={`Tăng số kiện hành lý ${label}`}
                        >
                          <Text style={styles.counterText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={styles.protectionRow}
                onPress={() => setProtectionEnabled((enabled) => !enabled)}
                disabled={submitting}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: protectionEnabled }}
              >
                <View
                  style={[
                    styles.checkbox,
                    protectionEnabled && styles.checkboxSelected,
                  ]}
                >
                  {protectionEnabled && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <View style={styles.optionDescription}>
                  <Text style={styles.optionTitle}>Bảo hiểm chuyến đi</Text>
                  <Text style={styles.muted}>
                    Phí bảo vệ được tính khi xác nhận đặt chỗ.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {!token && (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Bạn cần đăng nhập để hoàn tất đặt chỗ.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/login')}
                  disabled={submitting}
                >
                  <Text style={styles.noticeLink}>Đăng nhập</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (submitting || bookingUnavailable) && styles.disabled,
              ]}
              onPress={() => void handleSubmit()}
              disabled={submitting || bookingUnavailable}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Tiếp tục thanh toán →
                </Text>
              )}
            </TouchableOpacity>
            <Text style={styles.footnote}>
              Ghế được giữ tối đa 10 phút. Vui lòng hoàn tất đặt chỗ trong thời gian này.
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: 18,
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  backButton: { alignSelf: 'flex-start', marginBottom: 18 },
  backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  title: { color: '#0F172A', fontSize: 26, fontWeight: '800' },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#172D50',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  selectedSeats: {
    color: '#2563EB',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 5,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    paddingHorizontal: 13,
    fontSize: 15,
    marginBottom: 15,
  },
  genderRow: { flexDirection: 'row', gap: 9, marginBottom: 17 },
  genderOption: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  genderOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  genderText: { color: '#475569', fontWeight: '600' },
  genderTextSelected: { color: '#1D4ED8' },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  optionDescription: { flex: 1, paddingRight: 12 },
  optionTitle: { color: '#1E293B', fontWeight: '600', marginBottom: 4 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  counterButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  counterText: { color: '#1D4ED8', fontSize: 20, fontWeight: '700' },
  counterValue: {
    minWidth: 18,
    color: '#0F172A',
    textAlign: 'center',
    fontWeight: '700',
  },
  protectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    marginTop: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  checkboxSelected: { borderColor: '#2563EB', backgroundColor: '#2563EB' },
  checkmark: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  notice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  noticeText: { flex: 1, color: '#92400E', fontSize: 13 },
  noticeLink: { color: '#1D4ED8', fontWeight: '700' },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    marginTop: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  footnote: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 12,
  },
  muted: { color: '#64748B', fontSize: 13, lineHeight: 19 },
  error: {
    color: '#B91C1C',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 14,
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
});