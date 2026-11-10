# Premium Travel UI upgrade (Client)

Chỉ thay đổi giao diện Client. Backend (`server`), Admin, database, API service,
Redux store và luồng VNPay Sandbox **không bị chỉnh sửa**.

## Thay đổi
- `client/src/components/premium-ui.tsx` (mới): Card, StatusPill, nút Primary/Secondary,
  StateHero, RouteLine, TicketDivider dùng chung, theo bảng màu `PremiumPalette`.
- Viết lại phần hiển thị (giữ nguyên logic): `booking/failed`, `booking/success`,
  `booking/detail`, `notifications`.
- Home: hero dùng ảnh trời mây độ phân giải cao, tiêu đề mobile gọn hơn, logo hãng bay lớn hơn.
- Login/Register: giảm lớp phủ tối để ảnh nền hiển thị rõ.
- Ảnh local mới trong `client/assets/images/` (hero/login/register 1600–1800px,
  banner khuyến mãi, 2 illustration khác nhau, logo hãng bay 720×360).

## Lưu ý về ảnh
- Ảnh trong `destinations/` là ảnh cũ ~350px, nên thay bằng ảnh >= 1200px của bạn
  (giữ nguyên tên file, không cần sửa code).
- Logo hãng bay là wordmark minh họa, không phải logo chính thức.

## Chạy
cd client && npm install && npx expo start --clear
