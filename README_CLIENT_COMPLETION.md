# Bản hoàn thiện client — Flight Booking App

Bản này bổ sung các luồng client còn thiếu trong khả năng API hiện tại:

- Sửa thứ tự React Query Provider để tránh gọi `usePublicSettings` bên ngoài `QueryClientProvider`.
- Payment Success chỉ hiển thị vé xác nhận sau khi đọc lại trạng thái booking từ backend.
- Payment Failed và điều hướng kết quả thanh toán.
- E-ticket với QR tạo ngay trên thiết bị, hiển thị PNR, hành trình, giờ bay và ghế.
- Cache tối đa 5 vé tối thiểu trong SecureStore để xem lại offline.
- Chi tiết booking và nút đi tới vé điện tử / thanh toán.
- Flight Tracker (ước tính dựa vào lịch bay trong dữ liệu booking) và Notifications (tổng hợp trạng thái booking).
- Redux Toolkit + Redux Persist cho tùy chọn UI không nhạy cảm.
- Cấu hình NativeWind cơ bản.
- Đã loại các file `.env` chứa cấu hình riêng khỏi gói bàn giao; chỉ giữ `.env.example`.

## Cài đặt trên máy cá nhân

1. Cài Node.js tương thích với Expo SDK trong package.json.
2. Sao chép `server/.env.example` thành `server/.env`, cấu hình MongoDB, Redis và JWT secret.
3. Sao chép `client/.env.example` thành `client/.env`; thay `YOUR_COMPUTER_LAN_IP` bằng IPv4 của máy tính (`ipconfig`). Không dùng `localhost` khi mở app trên điện thoại thật.
4. Chạy backend theo hướng dẫn trong `server/README.md` (nếu có) hoặc package scripts.
5. Trong `client`, chạy `npm install` rồi `npx expo start --clear`.
6. Cài đặt Expo Go tương thích với Expo SDK của dự án và quét mã QR. Điện thoại và máy tính phải cùng Wi-Fi.

## Giới hạn cần biết

- Payment API hiện là **Demo**, không phải cổng thẻ Visa/Mastercard thật. Không nhập thông tin thẻ thật.
- QR là mã tham chiếu booking của ứng dụng, không thay thế boarding pass/check-in QR được hãng bay cấp.
- Tracker chưa kết nối nhà cung cấp trạng thái chuyến bay real-time; hiển thị ước tính từ giờ khởi hành đã lưu.
- Notifications hiện tổng hợp trạng thái booking, chưa phải push notification.
- Backend hiện chưa cung cấp API người dùng để hủy/đổi/hoàn vé; client không tự giả lập những hành động này.
- PDF/email e-ticket cần backend mailer và nguồn xác nhận thanh toán thực tế; không thể an toàn hoàn tất chỉ ở client.

## Kiểm tra đã thực hiện trong môi trường đóng gói

- Đã kiểm tra cú pháp TypeScript/TSX bằng transpile: tất cả file client được kiểm tra không phát hiện lỗi cú pháp.
- Chưa thể xác nhận build Android/iOS hoặc kiểm thử API end-to-end tại môi trường này vì không có đầy đủ dependency và cấu hình dịch vụ của máy bạn. Sau `npm install`, hãy chạy `npx tsc --noEmit` và `npx expo start --clear` để xác nhận trong môi trường thực tế.
