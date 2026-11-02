// Đây là giá minh họa cho đồ án.
// Trong production, cấu hình giá từ database hoặc hệ thống giá vé.

const CHECKED_BAG_PRICE = 300_000;
const PROTECTION_RATE = 0.02;

function calculateBookingPrice({
  basePrice,
  passengerCount,
  passengerTypes,
  seatPrices,
  checkedBagCount,
  protectionEnabled,
}) {
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error('Giá vé cơ bản không hợp lệ');
  }

  if (!Number.isInteger(passengerCount) || passengerCount < 1) {
    throw new Error('Số hành khách không hợp lệ');
  }

  if (!Number.isInteger(checkedBagCount) || checkedBagCount < 0) {
    throw new Error('Số lượng hành lý không hợp lệ');
  }

  if (
    !Array.isArray(seatPrices) ||
    seatPrices.length > passengerCount ||
    seatPrices.some((price) => !Number.isFinite(price) || price < 0)
  ) {
    throw new Error('Giá ghế không hợp lệ');
  }

  const baseFare = Array.isArray(passengerTypes) && passengerTypes.length === passengerCount
    ? passengerTypes.reduce((sum, type) => {
      if (type === 'child') return sum + Math.round(basePrice * 0.75);
      if (type === 'infant') return sum + Math.round(basePrice * 0.1);
      return sum + basePrice;
    }, 0)
    : basePrice * passengerCount;
  const seatFee = seatPrices.reduce((sum, price) => sum + price, 0);
  const baggageFee = checkedBagCount * CHECKED_BAG_PRICE;
  const protectionFee = protectionEnabled
    ? Math.round(baseFare * PROTECTION_RATE)
    : 0;

  return {
    baseFare,
    seatFee,
    baggageFee,
    protectionFee,
    total: baseFare + seatFee + baggageFee + protectionFee,
    currency: 'VND',
  };
}

module.exports = { calculateBookingPrice };