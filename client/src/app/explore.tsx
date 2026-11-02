
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { searchAirports, searchFlights, type AirportSuggestion } from '../services/api';
import { BookingSettingsNotice } from '../components/booking-settings-notice';
import { usePublicSettings } from '../hooks/use-public-settings';
import type {
  CabinClass,
  Flight,
  FlightSearchParams,
  FlightSort,
} from '../types/flight';

type SearchSegment = { from: string; to: string; date: string };

function getDefaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isValidCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function getTodayDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getDateForCalendar(value: string) {
  if (isValidCalendarDate(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date();
}

function DateField({
  value,
  onChange,
  minimumDate = getTodayDate(),
}: {
  value: string;
  onChange: (value: string) => void;
  minimumDate?: string;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => getDateForCalendar(value));
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const calendarDays = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);

  function showCalendar() {
    setVisibleMonth(getDateForCalendar(value));
    setCalendarOpen((open) => !open);
  }

  function formatDateForInput(day: number) {
    const year = visibleMonth.getFullYear();
    const month = String(visibleMonth.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-${String(day).padStart(2, '0')}`;
  }

  return (
    <View>
      <View style={styles.dateInputRow}>
        <TextInput
          style={[styles.input, styles.dateTextInput]}
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          accessibilityLabel="Ngày bay (YYYY-MM-DD)"
        />
        <Pressable
          style={styles.calendarButton}
          onPress={showCalendar}
          accessibilityRole="button"
          accessibilityLabel={calendarOpen ? 'Đóng lịch' : 'Mở lịch chọn ngày'}
        >
          <Text style={styles.calendarButtonText}>▦</Text>
        </Pressable>
      </View>
      {calendarOpen && (
        <View style={styles.calendar}>
          <View style={styles.calendarHeader}>
            <Pressable
              style={styles.calendarNavButton}
              disabled={previousMonth < currentMonth}
              onPress={() => setVisibleMonth(previousMonth)}
              accessibilityLabel="Tháng trước"
            >
              <Text style={[styles.calendarNavText, previousMonth < currentMonth && styles.calendarNavDisabled]}>‹</Text>
            </Pressable>
            <Text style={styles.calendarMonth}>
              {visibleMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable
              style={styles.calendarNavButton}
              onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              accessibilityLabel="Tháng sau"
            >
              <Text style={styles.calendarNavText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.calendarGrid}>
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((weekday) => (
              <Text key={weekday} style={styles.calendarWeekday}>{weekday}</Text>
            ))}
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.calendarDayCell} />;
              }

              const dateValue = formatDateForInput(day);
              const isSelected = dateValue === value;
              const isDisabled = dateValue < minimumDate;

              return (
                <Pressable
                  key={dateValue}
                  style={[
                    styles.calendarDayCell,
                    styles.calendarDayButton,
                    isSelected && styles.calendarDaySelected,
                    isDisabled && styles.calendarDayDisabled,
                  ]}
                  disabled={isDisabled}
                  onPress={() => {
                    onChange(dateValue);
                    setCalendarOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={dateValue}
                >
                  <Text style={[
                    styles.calendarDayText,
                    isSelected && styles.calendarDaySelectedText,
                    isDisabled && styles.calendarDayDisabledText,
                  ]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function hasValidAirlineCodes(value: string) {
  const normalized = value.trim().replace(/\s+/g, '').toUpperCase();
  return !normalized || /^[A-Z0-9]{2,3}(,[A-Z0-9]{2,3})*$/.test(normalized);
}

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price.toLocaleString('vi-VN')} ${currency}`;
  }
}

function formatTime(value: string, timeZone: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString('vi-VN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: string, timeZone: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function FlightCard({
  flight,
  onPress,
  currency,
  timeZone,
  selected = false,
  disabled = false,
}: {
  flight: Flight;
  onPress: () => void;
  currency: string;
  timeZone: string;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.flightCard,
        selected && styles.flightCardSelected,
        disabled && styles.flightCardDisabled,
        pressed && styles.pressed,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={styles.flightTop}>
        <View style={styles.airlineBadge}>
          <Text style={styles.airlineCode}>{flight.airline.code}</Text>
        </View>

        <View style={styles.airlineInfo}>
          <Text style={styles.airlineName}>{flight.airline.name}</Text>
          <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
        </View>

        <Text style={styles.price}>
          {formatPrice(flight.basePrice, flight.currency || currency)}
        </Text>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routePoint}>
          <Text style={styles.time}>
            {formatTime(flight.departureAt, timeZone)}
          </Text>
          <Text style={styles.airportCode}>{flight.origin.code}</Text>
          <Text style={styles.city} numberOfLines={1}>
            {flight.origin.city}
          </Text>
        </View>

        <View style={styles.routeMiddle}>
          <Text style={styles.durationLabel}>
            {flight.stops === 0 ? 'Bay thẳng' : `${flight.stops} điểm dừng`}
          </Text>
          <View style={styles.routeLine}>
            <View style={styles.routeDot} />
            <View style={styles.routeDash} />
            <Text style={styles.plane}>✈</Text>
            <View style={styles.routeDash} />
            <View style={styles.routeDot} />
          </View>
          <Text style={styles.durationLabel}>
            {formatDate(flight.departureAt, timeZone)}
          </Text>
        </View>

        <View style={[styles.routePoint, styles.routeEnd]}>
          <Text style={styles.time}>
            {formatTime(flight.arrivalAt, timeZone)}
          </Text>
          <Text style={styles.airportCode}>{flight.destination.code}</Text>
          <Text style={styles.city} numberOfLines={1}>
            {flight.destination.city}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.baggage}>
          Hành lý: {flight.baggageAllowanceKg} kg
        </Text>
        <Text style={styles.detailLink}>
          {selected ? 'Đã chọn ✓' : 'Xem chi tiết ›'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const settingsQuery = usePublicSettings();
  const settings = settingsQuery.data;
  const currency = settings?.currency ?? 'VND';
  const timeZone = settings?.timezone ?? 'Asia/Ho_Chi_Minh';

  const [from, setFrom] = useState('SGN');
  const [to, setTo] = useState('HKG');
  const [date, setDate] = useState(getDefaultDate());
  const [tripType, setTripType] = useState<'oneway' | 'roundtrip' | 'multicity'>('oneway');
  const [returnDate, setReturnDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 10); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);
  const [cabinClass, setCabinClass] = useState<CabinClass>('economy');
  const [airlineCodesInput, setAirlineCodesInput] = useState('');
  const [multiCitySegments, setMultiCitySegments] = useState<SearchSegment[]>([
    { from: 'SGN', to: 'HKG', date: getDefaultDate() },
    { from: 'HKG', to: 'SIN', date: getDefaultDate() },
  ]);
  const [submittedMultiSegments, setSubmittedMultiSegments] = useState<SearchSegment[] | null>(null);
  const [selectedMultiFlights, setSelectedMultiFlights] = useState<(Flight | null)[]>([]);
  const [activeMultiIndex, setActiveMultiIndex] = useState(0);
  const [selectedOutboundFlight, setSelectedOutboundFlight] = useState<Flight | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null);
  const [activeAirportField, setActiveAirportField] = useState<'from' | 'to' | null>(null);
  const [airportSuggestions, setAirportSuggestions] = useState<AirportSuggestion[]>([]);
  const [sort, setSort] = useState<FlightSort>('best');
  const [directOnly, setDirectOnly] = useState(false);
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [submitted, setSubmitted] = useState<FlightSearchParams | null>(null);
  const [validationError, setValidationError] = useState('');

  const passengerCount = adultCount + childCount;
  const passengerTypes = [
    ...Array.from({ length: adultCount }, () => 'adult'),
    ...Array.from({ length: childCount }, () => 'child'),
    ...Array.from({ length: infantCount }, () => 'infant'),
  ];
  const totalPassengerCount = passengerTypes.length;
  const airlineCodes = airlineCodesInput
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

  function updateMultiCitySegments(update: (current: SearchSegment[]) => SearchSegment[]) {
    setMultiCitySegments(update);
    setSubmittedMultiSegments(null);
  }

  const returnFlightsQuery = useQuery({
    queryKey: ['return-flights-search', submitted],
    queryFn: () => searchFlights({
      from: submitted!.to,
      to: submitted!.from,
      date: submitted!.returnDate!,
      sort: submitted!.sort,
      stops: submitted!.stops,
      maxPrice: submitted!.maxPrice,
      cabinClass: submitted!.cabinClass,
      airlines: submitted!.airlines,
    }),
    enabled: submitted !== null && Boolean(submitted.returnDate),
    staleTime: 0, retry: 1,
  });

  const flightsQuery = useQuery({
    queryKey: ['flights-search', submitted],
    queryFn: () => searchFlights(submitted!),
    enabled: submitted !== null && !submittedMultiSegments,
    staleTime: 0,
    retry: 1,
  });

  const multiCityFlightsQuery = useQuery({
    queryKey: ['multi-city-flights', submittedMultiSegments, sort, directOnly, cabinClass, airlineCodes, maxPriceInput],
    queryFn: async () => {
      const maxPrice = maxPriceInput.trim() ? Number(maxPriceInput) : undefined;
      return Promise.all(submittedMultiSegments!.map((segment) => searchFlights({
        from: segment.from,
        to: segment.to,
        date: segment.date,
        sort,
        stops: directOnly ? 'direct' : 'any',
        maxPrice,
        cabinClass,
        airlines: airlineCodes,
      })));
    },
    enabled: submittedMultiSegments !== null,
    staleTime: 0,
    retry: 1,
  });
  async function loadAirportSuggestions(field: 'from' | 'to', value: string) {
    setActiveAirportField(field);
    const query = value.trim();
    if (query.length < 2) { setAirportSuggestions([]); return; }
    try { setAirportSuggestions(await searchAirports(query)); } catch { setAirportSuggestions([]); }
  }

  function chooseAirport(field: 'from' | 'to', airport: AirportSuggestion) {
    (field === 'from' ? setFrom : setTo)(airport.code);
    setAirportSuggestions([]); setActiveAirportField(null);
  }

  function handleSearch() {
    if (tripType === 'multicity') {
      if (multiCitySegments.length < 2 || multiCitySegments.length > 4) {
        setValidationError('Hành trình nhiều chặng cần từ 2 đến 4 chặng.');
        return;
      }

      for (let index = 0; index < multiCitySegments.length; index += 1) {
        const segment = multiCitySegments[index];
        const normalizedFrom = segment.from.trim().toUpperCase();
        const normalizedTo = segment.to.trim().toUpperCase();

        if (!/^[A-Z]{3}$/.test(normalizedFrom) || !/^[A-Z]{3}$/.test(normalizedTo) || normalizedFrom === normalizedTo) {
          setValidationError(`Chặng ${index + 1} cần có mã sân bay đi/đến hợp lệ và khác nhau.`);
          return;
        }
        if (!isValidCalendarDate(segment.date)) {
          setValidationError(`Ngày bay chặng ${index + 1} không hợp lệ.`);
          return;
        }
        if (segment.date < getTodayDate()) {
          setValidationError(`Ngày bay chặng ${index + 1} không được nằm trong quá khứ.`);
          return;
        }
        if (index > 0) {
          const previous = multiCitySegments[index - 1];
          if (previous.to.trim().toUpperCase() !== normalizedFrom) {
            setValidationError(`Điểm đi chặng ${index + 1} phải trùng điểm đến chặng trước.`);
            return;
          }
          if (segment.date < previous.date) {
            setValidationError('Ngày các chặng phải theo thứ tự tăng dần.');
            return;
          }
        }
      }

      if (adultCount < 1 || infantCount > adultCount || totalPassengerCount > 9) {
        setValidationError('Cần ít nhất 1 người lớn, tối đa 9 hành khách và không quá 1 trẻ sơ sinh trên mỗi người lớn.');
        return;
      }
      if (!hasValidAirlineCodes(airlineCodesInput)) {
        setValidationError('Mã hãng bay phải gồm 2–3 ký tự, phân cách bằng dấu phẩy.');
        return;
      }
      if (maxPriceInput.trim() && (!Number.isFinite(Number(maxPriceInput)) || Number(maxPriceInput) <= 0)) {
        setValidationError('Giá tối đa phải là số lớn hơn 0.');
        return;
      }

      setValidationError('');
      setSelectedMultiFlights(Array(multiCitySegments.length).fill(null));
      setActiveMultiIndex(0);
      setSubmitted(null);
      setSubmittedMultiSegments(multiCitySegments.map((segment) => ({
        ...segment,
        from: segment.from.trim().toUpperCase(),
        to: segment.to.trim().toUpperCase(),
      })));
      return;
    }

    const normalizedFrom = from.trim().toUpperCase();
    const normalizedTo = to.trim().toUpperCase();
    const normalizedDate = date.trim();

    if (!/^[A-Z]{3}$/.test(normalizedFrom)) {
      setValidationError('Mã sân bay đi phải gồm 3 chữ cái, ví dụ SGN.');
      return;
    }

    if (!/^[A-Z]{3}$/.test(normalizedTo)) {
      setValidationError('Mã sân bay đến phải gồm 3 chữ cái, ví dụ HKG.');
      return;
    }

    if (normalizedFrom === normalizedTo) {
      setValidationError('Điểm đi và điểm đến không được trùng nhau.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      setValidationError('Ngày bay phải theo định dạng YYYY-MM-DD.');
      return;
    }

    const [year, month, day] = normalizedDate.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      setValidationError('Ngày bay không hợp lệ.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedLocalDate = new Date(year, month - 1, day);

    if (selectedLocalDate < today) {
      setValidationError('Ngày bay không được nằm trong quá khứ.');
      return;
    }

    if (tripType === 'roundtrip') {
      const [ry, rm, rd] = returnDate.split('-').map(Number);
      const parsedReturn = new Date(Date.UTC(ry, rm - 1, rd));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate) || parsedReturn.getUTCFullYear() !== ry || parsedReturn.getUTCMonth() !== rm - 1 || parsedReturn.getUTCDate() !== rd || returnDate < normalizedDate) {
        setValidationError('Ngày về phải là ngày hợp lệ và không trước ngày đi.'); return;
      }
    }

    if (adultCount < 1 || infantCount > adultCount || totalPassengerCount > 9) {
      setValidationError('Cần ít nhất 1 người lớn, tối đa 9 hành khách và không quá 1 trẻ sơ sinh trên mỗi người lớn.');
      return;
    }

    if (!hasValidAirlineCodes(airlineCodesInput)) {
      setValidationError('Mã hãng bay phải gồm 2–3 ký tự, phân cách bằng dấu phẩy.');
      return;
    }

    let maxPrice: number | undefined;

    if (maxPriceInput.trim()) {
      maxPrice = Number(maxPriceInput);

      if (!Number.isFinite(maxPrice) || maxPrice <= 0) {
        setValidationError('Giá tối đa phải là số lớn hơn 0.');
        return;
      }
    }

    setValidationError('');
    setSelectedOutboundFlight(null);
    setSelectedReturnFlight(null);
    setSubmittedMultiSegments(null);
    setSubmitted({
      from: normalizedFrom,
      to: normalizedTo,
      date: normalizedDate,
      sort,
      stops: directOnly ? 'direct' : 'any',
      maxPrice,
      cabinClass,
      airlines: airlineCodes,
      returnDate: tripType === 'roundtrip' ? returnDate : undefined,
    });
  }

  function openFlightDetail(flight: Flight) {
    router.push({
      pathname: '/flights/[id]',
      params: {
        id: flight._id,
        passengerCount: String(passengerCount),
        passengerTypes: JSON.stringify(passengerTypes),
        cabinClass,
      },
    } as any);
  }

  function startRoundTripBooking() {
    if (!selectedOutboundFlight || !selectedReturnFlight) {
      setValidationError('Vui lòng chọn đủ chuyến bay chiều đi và chiều về.');
      return;
    }

    if (
      selectedOutboundFlight.origin.code !== selectedReturnFlight.destination.code ||
      selectedOutboundFlight.destination.code !== selectedReturnFlight.origin.code ||
      new Date(selectedReturnFlight.departureAt) <= new Date(selectedOutboundFlight.arrivalAt)
    ) {
      setValidationError('Chuyến bay chiều về phải đúng chiều và khởi hành sau khi chuyến đi đến nơi.');
      return;
    }

    setValidationError('');
    router.push({
      pathname: '/booking/seats',
      params: {
        flightId: selectedOutboundFlight._id,
        returnFlightId: selectedReturnFlight._id,
        passengerCount: String(passengerCount),
        passengerTypes: JSON.stringify(passengerTypes),
        cabinClass,
        leg: 'outbound',
      },
    });
  }

  function canSelectMultiCityFlight(index: number, flight: Flight) {
    const previous = selectedMultiFlights[index - 1];
    const next = selectedMultiFlights[index + 1];
    return (!previous || (
      previous.destination.code === flight.origin.code &&
      new Date(flight.departureAt) > new Date(previous.arrivalAt)
    )) && (!next || (
      flight.destination.code === next.origin.code &&
      new Date(next.departureAt) > new Date(flight.arrivalAt)
    ));
  }

  function selectMultiCityFlight(index: number, flight: Flight) {
    setSelectedMultiFlights((current) => current.map((item, itemIndex) => itemIndex === index ? flight : item));
    setValidationError('');
    if (index < multiCitySegments.length - 1) {
      setActiveMultiIndex(index + 1);
    }
  }

  function startMultiCityBooking() {
    const legs = selectedMultiFlights.filter((flight): flight is Flight => flight !== null);
    if (legs.length !== submittedMultiSegments?.length) {
      setValidationError('Vui lòng chọn một chuyến bay cho mỗi chặng.');
      return;
    }

    router.push({
      pathname: '/booking/seats',
      params: {
        multiFlightIds: JSON.stringify(legs.map((flight) => flight._id)),
        passengerCount: String(passengerCount),
        passengerTypes: JSON.stringify(passengerTypes),
        cabinClass,
        legIndex: '0',
        multiSeats: JSON.stringify([]),
      },
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heading}>
        <Text style={styles.title}>Tìm chuyến bay</Text>
        <Text style={styles.subtitle}>
          Tìm chuyến bay từ dữ liệu MongoDB của hệ thống
        </Text>
      </View>

      <BookingSettingsNotice
        settings={settings}
        error={settingsQuery.isError ? 'Không tải được cài đặt.' : undefined}
      />

      <View style={styles.searchCard}>
        {tripType !== 'multicity' && (
          <>
        <Text style={styles.label}>Điểm đi (mã sân bay)</Text>
        <TextInput
          style={styles.input}
          value={from}
          onFocus={() => setActiveAirportField('from')}
          onChangeText={(value) => { setFrom(value.toUpperCase()); void loadAirportSuggestions('from', value); }}
          placeholder="Mã hoặc tên sân bay / thành phố"
          autoCapitalize="characters"
        />
        {activeAirportField === 'from' && airportSuggestions.map((airport) => (
          <Pressable key={`from-${airport.code}`} style={styles.suggestion} onPress={() => chooseAirport('from', airport)}>
            <Text style={styles.suggestionCode}>{airport.code}</Text><View style={{flex:1}}><Text style={styles.suggestionCity}>{airport.city}</Text><Text style={styles.suggestionAirport}>{airport.airport}</Text></View>
          </Pressable>
        ))}

        <Text style={styles.label}>Điểm đến (mã sân bay)</Text>
        <TextInput
          style={styles.input}
          value={to}
          onFocus={() => setActiveAirportField('to')}
          onChangeText={(value) => { setTo(value.toUpperCase()); void loadAirportSuggestions('to', value); }}
          placeholder="Mã hoặc tên sân bay / thành phố"
          autoCapitalize="characters"
        />
        {activeAirportField === 'to' && airportSuggestions.map((airport) => (
          <Pressable key={`to-${airport.code}`} style={styles.suggestion} onPress={() => chooseAirport('to', airport)}>
            <Text style={styles.suggestionCode}>{airport.code}</Text><View style={{flex:1}}><Text style={styles.suggestionCity}>{airport.city}</Text><Text style={styles.suggestionAirport}>{airport.airport}</Text></View>
          </Pressable>
        ))}
          </>
        )}

        {tripType === 'multicity' && (
          <>
            {multiCitySegments.map((segment, index) => (
              <View key={`multi-city-${index}`} style={styles.segmentCard}>
                <View style={styles.segmentHeading}>
                  <Text style={styles.segmentTitle}>Chặng {index + 1}</Text>
                  {multiCitySegments.length > 2 && (
                    <Pressable onPress={() => updateMultiCitySegments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                      <Text style={styles.removeSegment}>Xóa</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.label}>Điểm đi</Text>
                <TextInput
                  style={styles.input}
                  value={segment.from}
                  onChangeText={(value) => updateMultiCitySegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, from: value.toUpperCase() } : item))}
                  placeholder="Mã sân bay"
                  autoCapitalize="characters"
                  maxLength={3}
                />
                <Text style={styles.label}>Điểm đến</Text>
                <TextInput
                  style={styles.input}
                  value={segment.to}
                  onChangeText={(value) => updateMultiCitySegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, to: value.toUpperCase() } : item))}
                  placeholder="Mã sân bay"
                  autoCapitalize="characters"
                  maxLength={3}
                />
                <Text style={styles.label}>Ngày bay (YYYY-MM-DD)</Text>
                <DateField
                  value={segment.date}
                  onChange={(value) => updateMultiCitySegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, date: value } : item))}
                />
              </View>
            ))}
            <Pressable
              style={styles.addSegmentButton}
              disabled={multiCitySegments.length >= 4}
              onPress={() => updateMultiCitySegments((current) => [
                ...current,
                {
                  from: current[current.length - 1].to,
                  to: '',
                  date: current[current.length - 1].date,
                },
              ])}
            >
              <Text style={styles.addSegmentText}>
                {multiCitySegments.length >= 4 ? 'Tối đa 4 chặng' : '+ Thêm chặng'}
              </Text>
            </Pressable>
          </>
        )}

        <Text style={styles.label}>Loại hành trình</Text>
        <View style={styles.sortRow}>
          {([['oneway','Một chiều'],['roundtrip','Khứ hồi'],['multicity','Nhiều chặng']] as const).map(([value,label]) => <Pressable key={value} onPress={() => { setTripType(value); setSubmitted(null); setSubmittedMultiSegments(null); }} style={[styles.sortButton, tripType===value && styles.sortButtonActive]}><Text style={[styles.sortText,tripType===value&&styles.sortTextActive]}>{label}</Text></Pressable>)}
        </View>
        <Text style={styles.label}>Hành khách (tối đa 9)</Text>
        {[
          { key: 'adult', label: 'Người lớn · từ 12 tuổi', count: adultCount, setCount: setAdultCount, min: 1 },
          { key: 'child', label: 'Trẻ em · 2–11 tuổi', count: childCount, setCount: setChildCount, min: 0 },
          { key: 'infant', label: 'Trẻ sơ sinh · dưới 2 tuổi', count: infantCount, setCount: setInfantCount, min: 0 },
        ].map((traveller) => (
          <View key={traveller.label} style={styles.travellerRow}>
            <Text style={styles.travellerLabel}>{traveller.label}</Text>
            <View style={styles.counter}>
              <Pressable
                style={styles.countButton}
                disabled={traveller.count <= traveller.min || (traveller.key === 'adult' && adultCount <= infantCount)}
                onPress={() => traveller.setCount((count) => Math.max(traveller.min, count - 1))}
                accessibilityLabel={`Giảm ${traveller.label}`}
              >
                <Text style={styles.countButtonText}>−</Text>
              </Pressable>
              <Text style={styles.passengerCount}>{traveller.count}</Text>
              <Pressable
                style={styles.countButton}
                disabled={totalPassengerCount >= 9 || (traveller.key === 'infant' && infantCount >= adultCount)}
                onPress={() => traveller.setCount((count) => count + 1)}
                accessibilityLabel={`Tăng ${traveller.label}`}
              >
                <Text style={styles.countButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <Text style={styles.passengerHint}>
          Trẻ sơ sinh không chiếm ghế riêng; giá demo bằng 10% giá vé người lớn và cần đi cùng người lớn.
        </Text>
        <Text style={styles.label}>Hạng ghế</Text>
        <View style={styles.sortRow}>
          {([
            ['economy', 'Phổ thông'],
            ['premium_economy', 'Phổ thông cao cấp'],
            ['business', 'Thương gia'],
            ['first', 'Hạng nhất'],
          ] as const).map(([value, label]) => (
            <Pressable key={value} onPress={() => setCabinClass(value)} style={[styles.sortButton, styles.cabinButton, cabinClass === value && styles.sortButtonActive]}>
              <Text style={[styles.sortText, cabinClass === value && styles.sortTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {tripType !== 'multicity' && <><Text style={styles.label}>Ngày đi (YYYY-MM-DD)</Text>
        <DateField value={date} onChange={setDate} />

        {tripType === 'roundtrip' && <><Text style={styles.label}>Ngày về (YYYY-MM-DD)</Text><DateField value={returnDate} onChange={setReturnDate} minimumDate={date} /></>}</>}

        <Text style={styles.label}>Giá tối đa (không bắt buộc)</Text>
        <TextInput
          style={styles.input}
          value={maxPriceInput}
          onChangeText={setMaxPriceInput}
          placeholder="Ví dụ: 3000000"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Sắp xếp</Text>
        <View style={styles.sortRow}>
          {([
            ['best', 'Phù hợp'],
            ['cheapest', 'Giá thấp'],
            ['fastest', 'Bay nhanh'],
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setSort(value)}
              style={[
                styles.sortButton,
                sort === value && styles.sortButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.sortText,
                  sort === value && styles.sortTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Hãng bay (mã, cách nhau bằng dấu phẩy)</Text>
        <TextInput
          style={styles.input}
          value={airlineCodesInput}
          onChangeText={setAirlineCodesInput}
          placeholder="Ví dụ: VN,VJ"
          autoCapitalize="characters"
        />

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setDirectOnly((value) => !value)}
        >
          <View
            style={[
              styles.checkbox,
              directOnly && styles.checkboxChecked,
            ]}
          >
            {directOnly && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Chỉ chuyến bay thẳng</Text>
        </Pressable>

        {validationError ? (
          <Text style={styles.validationError}>{validationError}</Text>
        ) : null}

        <Pressable style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Tìm chuyến bay</Text>
        </Pressable>
      </View>

      {flightsQuery.isFetching && !submittedMultiSegments && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#246BFD" />
          <Text style={styles.loadingText}>Đang tìm chuyến bay...</Text>
        </View>
      )}

      {submittedMultiSegments && multiCityFlightsQuery.isFetching && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#246BFD" />
          <Text style={styles.loadingText}>Đang tìm chuyến bay cho từng chặng...</Text>
        </View>
      )}

      {submittedMultiSegments && multiCityFlightsQuery.isError && !multiCityFlightsQuery.isFetching && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Không thể tìm chuyến bay</Text>
          <Text style={styles.errorText}>
            {multiCityFlightsQuery.error instanceof Error
              ? multiCityFlightsQuery.error.message
              : 'Đã xảy ra lỗi khi tìm một trong các chặng.'}
          </Text>
          <Pressable onPress={() => void multiCityFlightsQuery.refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      )}

      {submittedMultiSegments && multiCityFlightsQuery.data && !multiCityFlightsQuery.isFetching && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Chọn chuyến bay từng chặng</Text>
          <Text style={styles.resultsSubtitle}>Chọn đủ {submittedMultiSegments.length} chuyến theo đúng thứ tự hành trình.</Text>
          <View style={styles.segmentTabs}>
            {submittedMultiSegments.map((segment, index) => (
              <Pressable
                key={`${segment.from}-${segment.to}-${index}`}
                style={[styles.segmentTab, activeMultiIndex === index && styles.segmentTabActive]}
                onPress={() => setActiveMultiIndex(index)}
              >
                <Text style={[styles.segmentTabText, activeMultiIndex === index && styles.segmentTabTextActive]}>
                  {index + 1}. {segment.from} → {segment.to}
                </Text>
                <Text style={styles.segmentTabDate}>{segment.date}</Text>
              </Pressable>
            ))}
          </View>
          {selectedMultiFlights.map((flight, index) => flight && (
            <Pressable key={`selected-leg-${flight._id}`} onPress={() => setActiveMultiIndex(index)}>
              <Text style={styles.selectedFlightSummary}>
                Chặng {index + 1}: {flight.flightNumber} · {flight.origin.code} → {flight.destination.code} · Đổi
              </Text>
            </Pressable>
          ))}
          <Text style={styles.resultsCount}>
            Chặng {activeMultiIndex + 1} · tìm thấy {multiCityFlightsQuery.data[activeMultiIndex]?.count ?? 0} chuyến
          </Text>
          {multiCityFlightsQuery.data[activeMultiIndex]?.data.length ? (
            multiCityFlightsQuery.data[activeMultiIndex].data.map((flight) => (
              <FlightCard
                key={flight._id}
                flight={flight}
                selected={selectedMultiFlights[activeMultiIndex]?._id === flight._id}
                disabled={!canSelectMultiCityFlight(activeMultiIndex, flight)}
                onPress={() => selectMultiCityFlight(activeMultiIndex, flight)}
                currency={currency}
                timeZone={timeZone}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Không tìm thấy chuyến bay</Text>
              <Text style={styles.emptyText}>Không có chuyến phù hợp với chặng này. Hãy thử ngày khác hoặc bỏ bớt bộ lọc.</Text>
            </View>
          )}
          <Pressable
            style={[styles.searchButton, selectedMultiFlights.some((flight) => !flight) && styles.buttonDisabled]}
            disabled={selectedMultiFlights.some((flight) => !flight)}
            onPress={startMultiCityBooking}
          >
            <Text style={styles.searchButtonText}>Tiếp tục chọn ghế</Text>
          </Pressable>
        </View>
      )}

      {flightsQuery.isError && !submittedMultiSegments && !flightsQuery.isFetching && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Không thể tìm chuyến bay</Text>
          <Text style={styles.errorText}>
            {flightsQuery.error instanceof Error
              ? flightsQuery.error.message
              : 'Đã xảy ra lỗi kết nối đến máy chủ.'}
          </Text>
          <Pressable
            onPress={() => void flightsQuery.refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      )}

      {flightsQuery.data && !submittedMultiSegments && !flightsQuery.isFetching && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Kết quả tìm kiếm</Text>
          <Text style={styles.resultsSubtitle}>
            {submitted?.from} → {submitted?.to} · {submitted?.date}
          </Text>
          <Text style={styles.resultsCount}>
            Tìm thấy {flightsQuery.data.count} chuyến bay
          </Text>
          {submitted?.returnDate && (
            <Text style={styles.mutedRoundTrip}>
              Chọn chuyến đi, chuyến về, sau đó chọn ghế riêng cho từng chặng.
            </Text>
          )}

          {flightsQuery.data.data.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Không tìm thấy chuyến bay</Text>
              <Text style={styles.emptyText}>
                Không có chuyến bay phù hợp với ngày và điều kiện bạn chọn.
                Hãy thử ngày khác hoặc bỏ lọc chuyến bay thẳng.
              </Text>
            </View>
          ) : (
            flightsQuery.data.data.map((flight) => (
              <FlightCard
                key={flight._id}
                flight={flight}
                selected={selectedOutboundFlight?._id === flight._id}
                onPress={() => {
                  if (submitted?.returnDate) {
                    setSelectedOutboundFlight(flight);
                    setSelectedReturnFlight(null);
                    setValidationError('');
                  } else {
                    openFlightDetail(flight);
                  }
                }}
                currency={currency}
                timeZone={timeZone}
              />
            ))
          )}

          {submitted?.returnDate && <View style={{ marginTop: 18 }}>
            <Text style={styles.resultsTitle}>Chuyến bay chiều về</Text>
            <Text style={styles.resultsSubtitle}>{submitted.to} → {submitted.from} · {submitted.returnDate}</Text>
            {returnFlightsQuery.isError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>
                  {returnFlightsQuery.error instanceof Error
                    ? returnFlightsQuery.error.message
                    : 'Không thể tìm chuyến bay chiều về.'}
                </Text>
                <Pressable
                  onPress={() => void returnFlightsQuery.refetch()}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Tìm lại chuyến về</Text>
                </Pressable>
              </View>
            ) : returnFlightsQuery.isFetching ? (
              <ActivityIndicator color="#246BFD" />
            ) : returnFlightsQuery.data?.data.length ? (
              returnFlightsQuery.data.data.map((flight) => {
                const departsAfterOutbound = Boolean(selectedOutboundFlight) &&
                  new Date(flight.departureAt) > new Date(selectedOutboundFlight!.arrivalAt);
                const returnsToOrigin = Boolean(selectedOutboundFlight) &&
                  flight.origin.code === selectedOutboundFlight!.destination.code &&
                  flight.destination.code === selectedOutboundFlight!.origin.code;
                const validReturn = departsAfterOutbound && returnsToOrigin;

                return (
                  <FlightCard
                    key={`return-${flight._id}`}
                    flight={flight}
                    selected={selectedReturnFlight?._id === flight._id}
                    disabled={!validReturn}
                    onPress={() => setSelectedReturnFlight(flight)}
                    currency={currency}
                    timeZone={timeZone}
                  />
                );
              })
            ) : (
              <Text style={styles.emptyText}>Không tìm thấy chuyến bay chiều về cho ngày đã chọn.</Text>
            )}
            {selectedOutboundFlight && (
              <Text style={styles.selectedFlightSummary}>
                Chiều đi: {selectedOutboundFlight.flightNumber} · {selectedOutboundFlight.origin.code} → {selectedOutboundFlight.destination.code}
              </Text>
            )}
            {selectedReturnFlight && (
              <Text style={styles.selectedFlightSummary}>
                Chiều về: {selectedReturnFlight.flightNumber} · {selectedReturnFlight.origin.code} → {selectedReturnFlight.destination.code}
              </Text>
            )}
            <Pressable
              style={[
                styles.searchButton,
                (!selectedOutboundFlight || !selectedReturnFlight) && styles.buttonDisabled,
              ]}
              disabled={!selectedOutboundFlight || !selectedReturnFlight}
              onPress={startRoundTripBooking}
            >
              <Text style={styles.searchButtonText}>Tiếp tục chọn ghế chiều đi và chiều về</Text>
            </Pressable>
          </View>}

          <Text style={styles.sourceText}>
            Nguồn dữ liệu: {flightsQuery.data.source === 'cache'
              ? 'bộ nhớ đệm'
              : 'MongoDB'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FB' },
  content: { padding: 18, paddingBottom: 40 },
  heading: { marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '800', color: '#172B4D' },
  subtitle: { fontSize: 14, color: '#667085', marginTop: 6 },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  flightCardSelected: { borderColor: '#246BFD', borderWidth: 2, backgroundColor: '#F8FAFF' },
  flightCardDisabled: { opacity: 0.45 },
  selectedFlightSummary: { color: '#175CD3', fontWeight: '700', marginTop: 10 },
  buttonDisabled: { opacity: 0.5 },
  label: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#172B4D',
    backgroundColor: '#FFFFFF',
  },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateTextInput: { flex: 1 },
  calendarButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  calendarButtonText: { color: '#175CD3', fontSize: 22 },
  calendar: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calendarNavButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  calendarNavText: { color: '#175CD3', fontSize: 28, lineHeight: 32 },
  calendarNavDisabled: { color: '#D0D5DD' },
  calendarMonth: { color: '#172B4D', fontSize: 15, fontWeight: '800', textTransform: 'capitalize' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarWeekday: { width: '14.2857%', height: 34, color: '#667085', fontSize: 12, fontWeight: '700', textAlign: 'center', textAlignVertical: 'center' },
  calendarDayCell: { width: '14.2857%', height: 40, alignItems: 'center', justifyContent: 'center' },
  calendarDayButton: { borderRadius: 20 },
  calendarDaySelected: { backgroundColor: '#246BFD' },
  calendarDayDisabled: { opacity: 0.4 },
  calendarDayText: { color: '#344054', fontSize: 14 },
  calendarDaySelectedText: { color: '#FFFFFF', fontWeight: '800' },
  calendarDayDisabledText: { color: '#98A2B3' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  passengerCountRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  travellerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  travellerLabel: { color: '#344054', fontSize: 13, flex: 1, paddingRight: 8 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countButton: { width: 40, height: 40, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countButtonText: { color: '#175CD3', fontSize: 22, fontWeight: '700' },
  passengerCount: { minWidth: 20, color: '#172B4D', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  passengerHint: { color: '#667085', fontSize: 12, lineHeight: 18, marginTop: 2 },
  segmentCard: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EAECF0' },
  segmentHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segmentTitle: { color: '#172B4D', fontSize: 15, fontWeight: '800' },
  removeSegment: { color: '#B42318', fontWeight: '700' },
  addSegmentButton: { alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#246BFD', borderStyle: 'dashed', borderRadius: 10, marginBottom: 8 },
  addSegmentText: { color: '#175CD3', fontWeight: '800' },
  sortButton: {
    flex: 1,
    minHeight: 43,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cabinButton: { flexBasis: '46%' },
  sortButtonActive: {
    backgroundColor: '#E8F0FF',
    borderColor: '#246BFD',
  },
  sortText: { color: '#475467', fontSize: 12 },
  sortTextActive: { color: '#175CD3', fontWeight: '800' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 10,
  },
  checkbox: {
    width: 21,
    height: 21,
    borderWidth: 1.5,
    borderColor: '#98A2B3',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#246BFD', borderColor: '#246BFD' },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  checkboxLabel: { color: '#344054', fontSize: 14 },
  validationError: { color: '#B42318', marginTop: 12, lineHeight: 20 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderColor: '#EAECF0', backgroundColor: '#F8FAFC' },
  suggestionCode: { color: '#175CD3', fontWeight: '800', width: 45 },
  suggestionCity: { color: '#172B4D', fontWeight: '700' },
  suggestionAirport: { color: '#667085', fontSize: 12, marginTop: 2 },
  mutedRoundTrip: { color: '#667085', fontSize: 12, marginTop: 8, lineHeight: 18 },
  searchButton: {
    backgroundColor: '#246BFD',
    borderRadius: 12,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  searchButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 25,
    marginTop: 18,
    alignItems: 'center',
  },
  loadingText: { color: '#667085', marginTop: 10 },
  errorCard: {
    backgroundColor: '#FEF3F2',
    padding: 18,
    borderRadius: 15,
    marginTop: 18,
  },
  errorTitle: { color: '#B42318', fontWeight: '800', fontSize: 16 },
  errorText: { color: '#B42318', marginTop: 7, lineHeight: 20 },
  retryButton: { alignSelf: 'flex-start', marginTop: 12 },
  retryText: { color: '#175CD3', fontWeight: '800' },
  resultsSection: { marginTop: 25 },
  resultsTitle: { color: '#172B4D', fontSize: 22, fontWeight: '800' },
  resultsSubtitle: { color: '#667085', marginTop: 5 },
  resultsCount: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },
  segmentTabs: { gap: 8, marginBottom: 12 },
  segmentTab: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 10, padding: 11, backgroundColor: '#FFFFFF' },
  segmentTabActive: { borderColor: '#246BFD', backgroundColor: '#E8F0FF' },
  segmentTabText: { color: '#344054', fontWeight: '700' },
  segmentTabTextActive: { color: '#175CD3' },
  segmentTabDate: { color: '#667085', fontSize: 12, marginTop: 3 },
  flightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: 15,
    marginBottom: 12,
  },
  pressed: { opacity: 0.8 },
  flightTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  airlineBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E8F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  airlineCode: { color: '#175CD3', fontSize: 12, fontWeight: '800' },
  airlineInfo: { flex: 1 },
  airlineName: { color: '#172B4D', fontSize: 13, fontWeight: '800' },
  flightNumber: { color: '#667085', fontSize: 12, marginTop: 4 },
  price: { color: '#175CD3', fontWeight: '800', fontSize: 14 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  routePoint: { flex: 1, minWidth: 0 },
  routeEnd: { alignItems: 'flex-end' },
  time: { color: '#172B4D', fontSize: 20, fontWeight: '800' },
  airportCode: { color: '#344054', fontSize: 14, fontWeight: '700', marginTop: 4 },
  city: { color: '#667085', fontSize: 11, marginTop: 4 },
  routeMiddle: { flex: 1.2, alignItems: 'center', paddingHorizontal: 7 },
  durationLabel: { color: '#667085', fontSize: 10, textAlign: 'center' },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 7,
  },
  routeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#246BFD' },
  routeDash: { flex: 1, height: 1, backgroundColor: '#98A2B3' },
  plane: { color: '#246BFD', fontSize: 15, marginHorizontal: 2 },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
    marginTop: 16,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  baggage: { color: '#667085', fontSize: 12 },
  detailLink: { color: '#175CD3', fontWeight: '800', fontSize: 12 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 15,
  },
  emptyTitle: { color: '#172B4D', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#667085', marginTop: 8, lineHeight: 21 },
  sourceText: { color: '#98A2B3', fontSize: 11, marginTop: 6 },
});
