import React, { useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { BookingSettingsNotice } from '../components/booking-settings-notice';
import { usePublicSettings } from '../hooks/use-public-settings';

type IconName =
  | 'plane'
  | 'hotel'
  | 'restaurant'
  | 'tour'
  | 'takeoff'
  | 'landing'
  | 'calendar'
  | 'passengers'
  | 'search'
  | 'chevron';

const iconPaths: Record<IconName, string[]> = {
  plane: ['M2 16.5 10.4 14l3.9 5.1 2-.5-2.1-5.8 5-1.3a2 2 0 0 0-.9-3.9l-5.2.7-5-5.1-2 .4 2.4 5.5-7.9 3.1a2.1 2.1 0 0 0 1.4 4.3Z'],
  hotel: ['M3 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16', 'M17 9h3a1 1 0 0 1 1 1v11', 'M7 7h2', 'M12 7h1', 'M7 11h2', 'M12 11h1', 'M7 15h2', 'M12 15h1', 'M2 21h20'],
  restaurant: ['M3 2v7a4 4 0 0 0 8 0V2', 'M7 2v20', 'M19 2v20', 'M19 2a5 5 0 0 0-5 5v4h5'],
  tour: ['M3 6.5 9 3l6 3.5L21 3v14.5L15 21l-6-3.5L3 21z', 'M9 3v14.5', 'M15 6.5V21'],
  takeoff: ['M3 20h18', 'm4 16 16-4.5a1.8 1.8 0 0 0-1-3.5l-5 1-4-5-2 .5 2 5.5-4 1-2-2-1.5.5 1.5 3.5Z'],
  landing: ['M3 20h18', 'm4 7 15 7a1.8 1.8 0 0 1-1.5 3.3l-5-1.4-4.8 3.1-1.8-.8 2.6-4.4-4-1.2-2.1 1.2-1.4-.8 2.3-3.2Z'],
  calendar: ['M7 2v4', 'M17 2v4', 'M3 9h18', 'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z', 'M7 13h.01', 'M12 13h.01', 'M17 13h.01', 'M7 17h.01', 'M12 17h.01'],
  passengers: ['M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M20 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  search: ['m21 21-4.3-4.3', 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'],
  chevron: ['m7 10 5 5 5-5'],
};

function AppIcon({
  name,
  size = 18,
  color = '#2878B9',
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {iconPaths[name].map((path, index) => (
        <Path
          key={`${name}-${index}`}
          d={path}
          stroke={color}
          strokeWidth={name === 'plane' ? 1.4 : 1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={name === 'plane' ? color : 'none'}
        />
      ))}
    </Svg>
  );
}

const destinations = [
  { city: 'Hồ Chí Minh', code: 'SGN', country: 'Việt Nam', emoji: '🏙️', image: require('../../assets/images/destinations/TP.HCM.jpg') },
  { city: 'Hà Nội', code: 'HAN', country: 'Việt Nam', emoji: '🏯', image: require('../../assets/images/destinations/hanoi.jpg') },
  { city: 'Hong Kong', code: 'HKG', country: 'Trung Quốc', emoji: '🌃', image: require('../../assets/images/destinations/hongkong.jpg') },
  { city: 'Singapore', code: 'SIN', country: 'Singapore', emoji: '🌴', image: require('../../assets/images/destinations/singapore.jpg') },
  { city: 'Đà Nẵng', code: 'DAD', country: 'Việt Nam', emoji: '🌊', image: require('../../assets/images/destinations/danang.jpg') },
  { city: 'Phú Quốc', code: 'PQC', country: 'Việt Nam', emoji: '🏝️', image: require('../../assets/images/destinations/phuquoc.jpg') },
  { city: 'Tokyo', code: 'NRT', country: 'Nhật Bản', emoji: '🌸', image: require('../../assets/images/destinations/tokyo.jpg') },
  { city: 'Đà Lạt', code: 'DLI', country: 'Việt Nam', emoji: '🌲', image: require('../../assets/images/destinations/dalat.jpg') },
  { city: 'Bangkok', code: 'BKK', country: 'Thái Lan', emoji: '🌆', image: require('../../assets/images/destinations/bangkok.jpg') },
];

const travelStats = [
  { value: '450+', label: 'Airlines' },
  { value: '12,230+', label: 'Destinations' },
  { value: '8.5M+', label: 'Flights Booked' },
];

function getDefaultDate() {
  const departure = new Date();
  departure.setDate(departure.getDate() + 3);
  const year = departure.getFullYear();
  const month = String(departure.getMonth() + 1).padStart(2, '0');
  const day = String(departure.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDepartureLabel() {
  const [year, month, day] = getDefaultDate().split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 900;
  const isDesktop = width >= 1200;
  const settingsQuery = usePublicSettings();
  const settings = settingsQuery.data;
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [sectionOffsets, setSectionOffsets] = useState({ destinations: 0, deals: 0, guides: 0 });
  const [tripType, setTripType] = useState<'oneway' | 'roundtrip'>('oneway');
  const [cabinClass, setCabinClass] = useState<'economy' | 'business'>('business');
  const [selectionMenu, setSelectionMenu] = useState<'trip' | 'cabin' | null>(null);

  const openSearch = (destination = 'HKG') => router.push({
    pathname: '/explore',
    params: {
      from: 'SGN',
      to: destination,
      date: getDefaultDate(),
      adultCount: '1',
      cabinClass,
      tripType,
    },
  });
  const tripTypeLabel = tripType === 'roundtrip' ? 'Round trip' : 'One way';
  const cabinClassLabel = cabinClass === 'business' ? 'Business' : 'Economy';
  const scrollTo = (offset: number) => scrollRef.current?.scrollTo({ y: offset, animated: true });
  const recordSection = (section: keyof typeof sectionOffsets) => (event: { nativeEvent: { layout: { y: number } } }) => {
    setSectionOffsets((current) => ({ ...current, [section]: event.nativeEvent.layout.y }));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ImageBackground
          source={require('../../assets/images/banners/hero-banner.jpg')}
          resizeMode="cover"
          style={[
            styles.hero,
            isWide && styles.heroWide,
            { minHeight: Math.max(height * 0.82, isWide ? 650 : 710) },
          ]}
          imageStyle={styles.heroArtwork}
        >
          <View style={styles.heroTint} />
          <View style={[styles.heroGlow, styles.heroGlowTop]} />
          <View style={[styles.heroGlow, styles.heroGlowBottom]} />

          <View style={[styles.heroInner, isWide && styles.heroInnerWide]}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.brand} onPress={() => scrollTo(0)} accessibilityRole="button" accessibilityLabel="Về đầu trang">
                <View style={styles.brandMark}><AppIcon name="plane" size={20} color="#FFFFFF" /></View>
                <View>
                  <Text style={styles.brandName}>SKYHAVEN</Text>
                  <Text style={styles.brandCaption}>TRAVEL WITH EASE</Text>
                </View>
              </TouchableOpacity>

              {isWide && (
                <View style={styles.navLinks}>
                  <TouchableOpacity onPress={() => scrollTo(sectionOffsets.deals)} accessibilityRole="link">
                    <Text style={styles.navLink}>Deals</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => scrollTo(sectionOffsets.destinations)} accessibilityRole="link">
                    <Text style={styles.navLink}>Destinations</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => scrollTo(sectionOffsets.guides)} accessibilityRole="link">
                    <Text style={styles.navLink}>Travel Guides</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.bookButton} onPress={() => openSearch()} accessibilityRole="button">
                  <Text style={styles.bookButtonText}>Book a Flight</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.profileButton}
                  onPress={() => router.push('/profile')}
                  accessibilityRole="button"
                  accessibilityLabel="Mở hồ sơ"
                >
                  <View style={styles.profileAvatarHead} />
                  <View style={styles.profileAvatarBody} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroCopy}>
              <View style={styles.eyebrow}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrowText}>BẮT ĐẦU HÀNH TRÌNH CỦA BẠN</Text>
              </View>
              <Text style={[styles.heroTitle, isWide && styles.heroTitleWide]}>
                Find the Best Flights{'\n'}at the Best Prices
              </Text>
              <Text style={styles.heroSubtitle}>
                Khám phá thế giới theo cách của bạn với những hành trình tuyệt vời và mức giá xứng đáng.
              </Text>
              <TouchableOpacity style={styles.heroCta} onPress={() => openSearch()} accessibilityRole="button">
                <Text style={styles.heroCtaText}>Khám phá chuyến bay</Text>
                <Text style={styles.heroCtaArrow}>→</Text>
              </TouchableOpacity>
            </View>

            {isDesktop ? (
              <>
                <View style={styles.statsRail}>
                  {travelStats.map((stat) => (
                    <View key={stat.label} style={styles.statItem}>
                      <Text style={styles.statValue}>{stat.value}</Text>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                      <View style={styles.statRule} />
                    </View>
                  ))}
                </View>
                <View style={styles.socialProof}>
                  <View style={styles.avatarStack}>
                    {[
                      { initials: 'AN', color: '#E8A17A' },
                      { initials: 'ML', color: '#7AB6B1' },
                      { initials: 'KH', color: '#D5B274' },
                      { initials: '+', color: '#536E8A' },
                    ].map((avatar, index) => (
                      <View key={avatar.initials} style={[styles.travellerAvatar, { backgroundColor: avatar.color, marginLeft: index === 0 ? 0 : -12, zIndex: 4 - index }]}>
                        <Text style={styles.travellerInitials}>{avatar.initials}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.ratingCopy}>
                    <Text style={styles.ratingStars}>★★★★★ <Text style={styles.ratingNumber}>4.9</Text></Text>
                    <Text style={styles.ratingLabel}>Được yêu thích bởi du khách</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.mobileProof}>
                <View style={styles.mobileStats}>
                  {travelStats.map((stat) => (
                    <View key={stat.label} style={styles.mobileStat}>
                      <Text style={styles.mobileStatValue}>{stat.value}</Text>
                      <Text style={styles.mobileStatLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.mobileRating}>
                  <View style={styles.avatarStack}>
                    {[
                      { initials: 'AN', color: '#E8A17A' },
                      { initials: 'ML', color: '#7AB6B1' },
                      { initials: 'KH', color: '#D5B274' },
                    ].map((avatar, index) => (
                      <View key={avatar.initials} style={[styles.travellerAvatar, styles.smallAvatar, { backgroundColor: avatar.color, marginLeft: index === 0 ? 0 : -10, zIndex: 3 - index }]}>
                        <Text style={styles.travellerInitials}>{avatar.initials}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.mobileRatingText}><Text style={styles.ratingStars}>★★★★★</Text> 4.9 · 20k+ đánh giá</Text>
                </View>
              </View>
            )}
          </View>
        </ImageBackground>

        <View style={[styles.mainContent, isWide && styles.mainContentWide]}>
          <View style={[styles.searchCard, isDesktop && styles.searchCardWide]}>
            <View style={[styles.searchCardHeader, !isWide && styles.searchCardHeaderStacked]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productTabs}>
                <View style={styles.inactiveTab}><AppIcon name="hotel" size={15} color="#8496A5" /><Text style={styles.inactiveTabText}>Hotel</Text></View>
                <View style={styles.activeTab}><AppIcon name="plane" size={16} color="#123B5D" /><Text style={styles.activeTabText}>Flight</Text></View>
                <View style={styles.inactiveTab}><AppIcon name="restaurant" size={15} color="#8496A5" /><Text style={styles.inactiveTabText}>Restaurant</Text></View>
                <View style={styles.inactiveTab}><AppIcon name="tour" size={15} color="#8496A5" /><Text style={styles.inactiveTabText}>Tour & Guides</Text></View>
              </ScrollView>
              <View style={styles.flightOptions}>
                <TouchableOpacity style={styles.optionPill} onPress={() => setSelectionMenu('trip')} accessibilityRole="button">
                  <Text style={styles.optionText}>{tripTypeLabel}</Text><AppIcon name="chevron" size={15} color="#526C80" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionPill} onPress={() => setSelectionMenu('cabin')} accessibilityRole="button">
                  <Text style={styles.optionText}>{cabinClassLabel}</Text><AppIcon name="chevron" size={15} color="#526C80" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.searchFields, isDesktop && styles.searchFieldsWide]}>
              <TouchableOpacity style={[styles.searchField, isDesktop && styles.searchFieldWide]} onPress={() => openSearch()} accessibilityRole="button">
                <View style={styles.fieldIcon}><AppIcon name="takeoff" size={17} /></View>
                <View style={styles.fieldCopy}>
                  <Text style={styles.fieldLabel}>FROM</Text>
                  <Text style={styles.fieldValue}>Hồ Chí Minh</Text>
                  <Text style={styles.fieldMeta}>SGN · Tân Sơn Nhất</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.searchField, isDesktop && styles.searchFieldWide]} onPress={() => openSearch()} accessibilityRole="button">
                <View style={styles.fieldIcon}><AppIcon name="landing" size={17} /></View>
                <View style={styles.fieldCopy}>
                  <Text style={styles.fieldLabel}>TO</Text>
                  <Text style={styles.fieldValue}>Hong Kong</Text>
                  <Text style={styles.fieldMeta}>HKG · Hong Kong Intl.</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.searchField, isDesktop && styles.searchFieldWide]} onPress={() => openSearch()} accessibilityRole="button">
                <View style={styles.fieldIcon}><AppIcon name="calendar" size={17} /></View>
                <View style={styles.fieldCopy}>
                  <Text style={styles.fieldLabel}>DEPARTURE</Text>
                  <Text style={styles.fieldValue}>{getDepartureLabel()}</Text>
                  <Text style={styles.fieldMeta}>Chọn ngày bay</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.searchField, isDesktop && styles.searchFieldWide]} onPress={() => openSearch()} accessibilityRole="button">
                <View style={styles.fieldIcon}><AppIcon name="passengers" size={17} /></View>
                <View style={styles.fieldCopy}>
                  <Text style={styles.fieldLabel}>PASSENGERS</Text>
                  <Text style={styles.fieldValue}>1 người lớn</Text>
                  <Text style={styles.fieldMeta}>{cabinClassLabel} · 1 hành khách</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.searchSubmit, !isDesktop && styles.searchSubmitMobile]} onPress={() => openSearch()} activeOpacity={0.88} accessibilityRole="button">
                <AppIcon name="search" size={19} color="#FFFFFF" />
                <Text style={styles.searchSubmitText}>Search</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.searchFootnote}>Giá tốt, hành trình an tâm — chuyến đi tiếp theo chỉ cách bạn một lần chạm.</Text>
          </View>

          <BookingSettingsNotice
            settings={settings}
            error={settingsQuery.isError ? 'Không tải được cài đặt.' : undefined}
          />

          <View onLayout={recordSection('destinations')} style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>ĐIỂM ĐẾN ĐƯỢC YÊU THÍCH</Text>
              <Text style={styles.sectionTitle}>Đi đâu tiếp theo?</Text>
              <Text style={styles.sectionSubtitle}>Những thành phố tuyệt vời đang chờ bạn khám phá.</Text>
            </View>
            <TouchableOpacity onPress={() => openSearch()} accessibilityRole="button">
              <Text style={styles.seeAll}>Xem tất cả →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.destinationGrid}>
            {destinations.map((item) => (
              <TouchableOpacity key={item.code} style={styles.destinationCard} onPress={() => openSearch(item.code)} activeOpacity={0.86}>
                <ImageBackground source={item.image} resizeMode="cover" style={styles.destinationImage} imageStyle={styles.destinationImageArtwork}>
                  <View style={styles.destinationImageShade} />
                  <Text style={styles.destinationEmoji}>{item.emoji}</Text>
                  <View style={styles.destinationCodeBadge}><Text style={styles.destinationCode}>{item.code}</Text></View>
                </ImageBackground>
                <View style={styles.destinationInfo}>
                  <View><Text style={styles.destinationCity}>{item.city}</Text><Text style={styles.destinationCountry}>{item.country}</Text></View>
                  <Text style={styles.destinationArrow}>↗</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onLayout={recordSection('deals')}
            activeOpacity={0.88}
            onPress={() => openSearch()}
            accessibilityRole="button"
            accessibilityLabel="Khám phá ưu đãi du lịch"
          >
            <ImageBackground source={require('../../assets/images/banners/summer-sale.jpg')} resizeMode="cover" style={styles.promotionCard} imageStyle={styles.promotionArtwork}>
              <View style={styles.promotionShade} />
              <View style={styles.promotionContent}>
                <Text style={styles.promotionLabel}>ƯU ĐÃI MÙA NÀY</Text>
                <Text style={styles.promotionTitle}>Hành trình mới,{'\n'}giá vé tốt hơn</Text>
                <Text style={styles.promotionAction}>Khám phá chuyến bay  →</Text>
              </View>
              <View style={styles.promoFloating}><Text style={styles.promoFloatingIcon}>✦</Text><Text style={styles.promoFloatingText}>ƯU ĐÃI{'\n'}ĐỘC QUYỀN</Text></View>
            </ImageBackground>
          </TouchableOpacity>

          <View onLayout={recordSection('guides')} style={styles.airlineCard}>
            <View style={styles.airlineHeader}>
              <View><Text style={styles.sectionEyebrow}>CÙNG NHỮNG ĐỐI TÁC UY TÍN</Text><Text style={styles.airlineTitle}>Hãng hàng không</Text></View>
              <Text style={styles.airlineCaption}>An tâm trên mọi hành trình</Text>
            </View>
            <View style={styles.airlineLogos}>
              <Image source={require('../../assets/images/airlines/vietnam-airlines.png')} style={styles.airlineLogo} resizeMode="contain" accessibilityLabel="Vietnam Airlines" />
              <Image source={require('../../assets/images/airlines/vietjet.png')} style={styles.airlineLogo} resizeMode="contain" accessibilityLabel="VietJet Air" />
              <Image source={require('../../assets/images/airlines/bamboo-airways.png')} style={styles.airlineLogo} resizeMode="contain" accessibilityLabel="Bamboo Airways" />
            </View>
          </View>

          <TouchableOpacity style={styles.historyCard} onPress={() => router.push('/booking-history')} activeOpacity={0.85}>
            <View style={styles.historyIcon}><Text style={styles.historyEmoji}>🎫</Text></View>
            <View style={styles.historyTextContainer}>
              <Text style={styles.historyTitle}>Lịch sử đặt vé</Text>
              <Text style={styles.historyDescription}>Theo dõi các chuyến bay đã đặt của bạn</Text>
            </View>
            <Text style={styles.historyArrow}>›</Text>
          </TouchableOpacity>

          {settings && Boolean(settings.supportEmail || settings.supportPhone) && (
            <View style={styles.supportCard}>
              <Text style={styles.supportTitle}>Hỗ trợ khách hàng</Text>
              {settings.supportPhone ? <Text style={styles.supportText}>Điện thoại: {settings.supportPhone}</Text> : null}
              {settings.supportEmail ? <Text style={styles.supportText}>Email: {settings.supportEmail}</Text> : null}
            </View>
          )}

          <Text style={styles.footer}>{settings?.siteName || 'Flight Booking'} · Đồng hành cùng mọi hành trình</Text>
        </View>
      </ScrollView>
      <Modal
        visible={selectionMenu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectionMenu(null)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setSelectionMenu(null)}>
          <Pressable style={styles.optionSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.optionSheetTitle}>
              {selectionMenu === 'trip' ? 'Trip type' : 'Cabin class'}
            </Text>
            {(selectionMenu === 'trip'
              ? [
                { label: 'One way', value: 'oneway' },
                { label: 'Round trip', value: 'roundtrip' },
              ]
              : [
                { label: 'Economy', value: 'economy' },
                { label: 'Business', value: 'business' },
              ]
            ).map((option) => {
              const isSelected = selectionMenu === 'trip'
                ? tripType === option.value
                : cabinClass === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionChoice, isSelected && styles.optionChoiceSelected]}
                  onPress={() => {
                    if (selectionMenu === 'trip') {
                      setTripType(option.value as 'oneway' | 'roundtrip');
                    } else {
                      setCabinClass(option.value as 'economy' | 'business');
                    }
                    setSelectionMenu(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.optionChoiceText, isSelected && styles.optionChoiceTextSelected]}>
                    {option.label}
                  </Text>
                  {isSelected ? <Text style={styles.optionChoiceCheck}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FC' },
  scrollContent: { paddingBottom: 30 },
  hero: { minHeight: 710, paddingTop: 42, overflow: 'hidden', backgroundColor: '#3E7FA8' },
  heroWide: { minHeight: 650, paddingTop: 36 },
  heroArtwork: { opacity: 1 },
  heroTint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(7, 37, 64, 0.22)' },
  heroGlow: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(179, 226, 247, 0.12)' },
  heroGlowTop: { width: 240, height: 240, top: 90, right: -100 },
  heroGlowBottom: { width: 180, height: 180, bottom: 40, left: -85 },
  heroInner: { flex: 1, paddingHorizontal: 20, alignItems: 'center' },
  heroInnerWide: { width: '100%', maxWidth: 1320, alignSelf: 'center', paddingHorizontal: 40 },
  header: { width: '100%', minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandMark: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  brandName: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1.6 },
  brandCaption: { color: 'rgba(255,255,255,0.72)', fontSize: 8, letterSpacing: 1.5, marginTop: 2 },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  navLink: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookButton: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 11 },
  bookButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  profileButton: { position: 'relative', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.17)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  profileAvatarHead: { position: 'absolute', top: 9, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  profileAvatarBody: { position: 'absolute', bottom: 7, width: 20, height: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: '#FFFFFF' },
  heroCopy: { alignItems: 'center', width: '100%', maxWidth: 760, marginTop: 70 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F0C878', marginRight: 8 },
  eyebrowText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: '#FFFFFF', textAlign: 'center', fontSize: 31, lineHeight: 40, fontWeight: '900', marginTop: 18, textShadowColor: 'rgba(5, 28, 48, 0.35)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 10 },
  heroTitleWide: { fontSize: 54, lineHeight: 64, marginTop: 20 },
  heroSubtitle: { color: 'rgba(255,255,255,0.86)', textAlign: 'center', fontSize: 14, lineHeight: 22, maxWidth: 460, marginTop: 14 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.42)' },
  heroCtaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  heroCtaArrow: { color: '#FFFFFF', fontSize: 18 },
  statsRail: { position: 'absolute', left: 42, top: 265, width: 160, padding: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  statItem: { marginVertical: 8 },
  statValue: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.84)', fontSize: 11, marginTop: 3 },
  statRule: { height: 1, width: 42, backgroundColor: 'rgba(255,255,255,0.5)', marginTop: 10 },
  socialProof: { position: 'absolute', right: 42, top: 300, alignItems: 'flex-end', padding: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  avatarStack: { flexDirection: 'row', alignItems: 'center', paddingLeft: 2 },
  travellerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.88)' },
  smallAvatar: { width: 31, height: 31, borderRadius: 16 },
  travellerInitials: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  ratingCopy: { alignItems: 'flex-end', marginTop: 10 },
  ratingStars: { color: '#F4C968', fontSize: 13, letterSpacing: 1 },
  ratingNumber: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 0 },
  ratingLabel: { color: 'rgba(255,255,255,0.84)', fontSize: 10, marginTop: 5 },
  mobileProof: { width: '100%', marginTop: 26, padding: 13, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  mobileStats: { flexDirection: 'row', justifyContent: 'space-between' },
  mobileStat: { flex: 1, alignItems: 'center', paddingHorizontal: 3 },
  mobileStatValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  mobileStatLabel: { color: 'rgba(255,255,255,0.84)', fontSize: 10, textAlign: 'center', marginTop: 4 },
  mobileRating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 11, marginTop: 11 },
  mobileRatingText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  mainContent: { width: '100%', paddingHorizontal: 18, marginTop: -72 },
  mainContentWide: { maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 30, marginTop: -92 },
  searchCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 17, borderWidth: 1, borderColor: '#E4EBF2', shadowColor: '#102F4A', shadowOpacity: 0.17, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  searchCardWide: { padding: 24, borderRadius: 26 },
  searchCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EAF0F5', paddingBottom: 15 },
  searchCardHeaderStacked: { alignItems: 'flex-start', flexDirection: 'column', gap: 12 },
  productTabs: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10 },
  inactiveTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12 },
  activeTab: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, backgroundColor: '#EAF4FC' },
  inactiveTabText: { color: '#748797', fontSize: 11, fontWeight: '600' },
  activeTabText: { color: '#123B5D', fontSize: 11, fontWeight: '800' },
  flightOptions: { flexDirection: 'row', gap: 8 },
  modalScrim: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(7, 26, 42, 0.48)' },
  optionSheet: { width: '100%', maxWidth: 360, borderRadius: 22, padding: 18, backgroundColor: '#FFFFFF', shadowColor: '#102F4A', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  optionSheetTitle: { color: '#123B5D', fontSize: 17, fontWeight: '900', marginBottom: 10 },
  optionChoice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 13, marginTop: 6, backgroundColor: '#F7FAFC' },
  optionChoiceSelected: { backgroundColor: '#EAF4FC' },
  optionChoiceText: { color: '#526C80', fontSize: 13, fontWeight: '700' },
  optionChoiceTextSelected: { color: '#123B5D' },
  optionChoiceCheck: { color: '#2878B9', fontSize: 16, fontWeight: '900' },
  optionPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, borderWidth: 1, borderColor: '#E4EBF2', paddingHorizontal: 11, paddingVertical: 8 },
  optionText: { color: '#526C80', fontSize: 10, fontWeight: '700' },
  searchFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 },
  searchFieldsWide: { flexWrap: 'nowrap', alignItems: 'stretch', gap: 0 },
  searchField: { width: '48%', minHeight: 76, flexDirection: 'row', alignItems: 'center', borderRadius: 15, paddingHorizontal: 11, backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#EAF0F5' },
  searchFieldWide: { flex: 1, width: undefined, borderWidth: 0, borderRightWidth: 1, borderRightColor: '#E5ECF2', borderRadius: 0, paddingHorizontal: 12 },
  fieldIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF4FC', marginRight: 10 },
  fieldCopy: { flex: 1 },
  fieldLabel: { color: '#708394', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  fieldValue: { color: '#123B5D', fontSize: 13, fontWeight: '800', marginTop: 5 },
  fieldMeta: { color: '#71879A', fontSize: 9, marginTop: 3 },
  searchSubmit: { minWidth: 146, minHeight: 54, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 15, backgroundColor: '#123B5D' },
  searchSubmitMobile: { width: '100%', minHeight: 50, marginTop: 2 },
  searchSubmitText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  searchFootnote: { color: '#71879A', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 13 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 35, marginBottom: 17 },
  sectionEyebrow: { color: '#2878B9', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
  sectionTitle: { color: '#123B5D', fontSize: 22, fontWeight: '900' },
  sectionSubtitle: { color: '#71879A', fontSize: 13, lineHeight: 19, marginTop: 6 },
  seeAll: { color: '#2878B9', fontSize: 12, fontWeight: '800', paddingBottom: 3 },
  destinationGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  destinationCard: { width: '48.5%', backgroundColor: '#FFFFFF', borderRadius: 17, padding: 9, marginBottom: 13, borderWidth: 1, borderColor: '#E6EDF3', shadowColor: '#123B5D', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  destinationImage: { height: 112, borderRadius: 12, backgroundColor: '#EAF4FC', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  destinationImageArtwork: { borderRadius: 12 },
  destinationImageShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(18, 59, 93, 0.16)' },
  destinationEmoji: { fontSize: 38, textShadowColor: 'rgba(18,59,93,0.45)', textShadowRadius: 10 },
  destinationCodeBadge: { position: 'absolute', right: 8, top: 8, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: 'rgba(10,36,57,0.64)' },
  destinationCode: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  destinationInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3, paddingTop: 10, paddingBottom: 3 },
  destinationCity: { color: '#123B5D', fontSize: 14, fontWeight: '800' },
  destinationCountry: { color: '#71879A', fontSize: 11, marginTop: 3 },
  destinationArrow: { color: '#2878B9', fontSize: 18, paddingHorizontal: 4 },
  promotionCard: { minHeight: 190, borderRadius: 20, overflow: 'hidden', padding: 20, justifyContent: 'center', marginBottom: 19, backgroundColor: '#1C5074' },
  promotionArtwork: { borderRadius: 20 },
  promotionShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(18, 59, 93, 0.56)' },
  promotionContent: { zIndex: 1 },
  promotionLabel: { color: '#F1CF86', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  promotionTitle: { color: '#FFFFFF', fontSize: 23, lineHeight: 29, fontWeight: '900', marginTop: 8 },
  promotionAction: { color: '#EAF4FC', fontSize: 12, fontWeight: '800', marginTop: 12 },
  promoFloating: { position: 'absolute', right: 18, top: 18, width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  promoFloatingIcon: { color: '#F1CF86', fontSize: 20, lineHeight: 22 },
  promoFloatingText: { color: '#FFFFFF', fontSize: 7, textAlign: 'center', fontWeight: '900', letterSpacing: 0.6 },
  airlineCard: { backgroundColor: '#FFFFFF', borderRadius: 19, borderWidth: 1, borderColor: '#E4EBF2', padding: 16, marginBottom: 18 },
  airlineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  airlineTitle: { color: '#123B5D', fontSize: 17, fontWeight: '900' },
  airlineCaption: { color: '#71879A', fontSize: 9, textAlign: 'right', maxWidth: 110 },
  airlineLogos: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  airlineLogo: { width: '31%', height: 52 },
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 17, padding: 14, borderWidth: 1, borderColor: '#E4EBF2' },
  historyIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#EAF4FC', alignItems: 'center', justifyContent: 'center' },
  historyEmoji: { fontSize: 22 },
  historyTextContainer: { flex: 1, marginLeft: 12 },
  historyTitle: { color: '#123B5D', fontSize: 14, fontWeight: '900' },
  historyDescription: { color: '#71879A', fontSize: 10, marginTop: 4, lineHeight: 15 },
  historyArrow: { color: '#D6AD60', fontSize: 29, marginLeft: 8 },
  supportCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderColor: '#E4EBF2', borderWidth: 1, marginTop: 16, padding: 15 },
  supportTitle: { color: '#123B5D', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  supportText: { color: '#62798B', fontSize: 12, marginTop: 3 },
  footer: { textAlign: 'center', color: '#8AA0B1', fontSize: 10, marginTop: 24 },
});
