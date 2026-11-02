# Flight Booking App — hướng dẫn cài đặt đồng bộ

Dự án gồm 3 phần dùng chung API:
- `server/`: Express API + MongoDB (Redis là tùy chọn; chức năng giữ chỗ cần Redis).
- `client/`: ứng dụng Expo React Native / Expo Go.
- `admin/`: trang quản trị React + Vite.

## Yêu cầu
- Node.js 20 trở lên và npm.
- MongoDB đang chạy tại `mongodb://127.0.0.1:27017` (hoặc URI MongoDB của bạn).
- Redis chỉ cần nếu muốn dùng chức năng giữ chỗ cần Redis.
- Điện thoại và máy tính cùng Wi-Fi nếu chạy client trên Expo Go.

## 1. Cài dependencies
Mở 3 terminal tại thư mục dự án:

```powershell
cd server
npm install
```

```powershell
cd admin
npm install
```

```powershell
cd client
npm install
```

Dùng `npm install` (không dùng `npm ci`) để đồng bộ lockfile của client với dependency QR `qrcode` đã bổ sung.

## 2. Tạo file môi trường

**Server** — sao chép `server/.env.example` thành `server/.env`, sau đó đặt `JWT_SECRET` thành chuỗi bí mật ngẫu nhiên ít nhất 32 ký tự. Điều chỉnh `MONGODB_URI` nếu MongoDB không chạy mặc định.

**Admin** — sao chép `admin/.env.example` thành `admin/.env`. Mặc định API là `http://localhost:5000/api`.

**Client** — sao chép `client/.env.example` thành `client/.env`. Thay `YOUR_COMPUTER_LAN_IP` bằng IPv4 của máy tính (xem bằng `ipconfig`), ví dụ `http://192.168.1.10:5000`. Không dùng `localhost` khi mở app trên điện thoại.

### VNPay Sandbox
- Lấy `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` từ tài khoản merchant VNPay Sandbox; không dùng thông tin production trong môi trường phát triển.
- Đặt `VNPAY_RETURN_URL` và `VNPAY_IPN_URL` thành HTTPS URL public có thể truy cập đến API. Cấu hình cùng IPN URL trong merchant portal VNPay; `localhost`/IP LAN không nhận được callback từ VNPay.
- Với development/Expo Go, để trống `EXPO_PUBLIC_VNPAY_CLIENT_RETURN_URL`; client gửi URL quay lại do Expo tạo và server chỉ chấp nhận URL thuộc scheme Expo/app hoặc host dev cục bộ. Với bản build native/production, đặt `VNPAY_CLIENT_RETURN_URL` trong `server/.env` trùng với `EXPO_PUBLIC_VNPAY_CLIENT_RETURN_URL` trong `client/.env` (mặc định `client://booking/payment`). Scheme `client` đã khai báo trong `client/app.json`.
- Khởi động lại server và Expo sau khi đổi env. App tạo URL thanh toán từ số tiền đã lưu trong booking; chỉ IPN có chữ ký hợp lệ, đúng merchant và đúng số tiền mới được xác nhận Booking. Client không tự quyết định kết quả thanh toán.
- VNPay Sandbox là môi trường thử nghiệm, không dùng để thu tiền thật. `/api/payments/vnpay/return` chỉ đưa người dùng về app; `/api/payments/vnpay/ipn` mới là nguồn xác nhận trạng thái.

## 3. Chạy 3 phần

Terminal 1:
```powershell
cd server
npm run dev
```

Terminal 2:
```powershell
cd admin
npm run dev
```

Terminal 3:
```powershell
cd client
npx expo start --clear
```

Admin mặc định: `http://localhost:5173`.
Expo hiển thị QR để mở bằng Expo Go.
API health check: `http://localhost:5000/api/health`.

## Cấu hình NativeWind / QR
- NativeWind dùng `darkMode: 'class'`, `metro.config.js` đã bọc `withNativeWind` và root layout thiết lập `StyleSheet.setFlag('darkMode', 'class')`.
- `qrcode` là dependency trực tiếp cần thiết bởi `react-native-qrcode-svg` trong bundle hiện tại.

## Đồng bộ và giới hạn tích hợp
Client và admin cùng gọi API server qua biến môi trường tương ứng. Không có `.env` chứa thông tin riêng tư được đóng gói; cần tự tạo từ `.env.example`.

Một số phần hiện là mô phỏng hoặc phụ thuộc dịch vụ ngoài: thanh toán tích hợp VNPay Sandbox (không thu tiền thật), QR là mã tham chiếu vé trong ứng dụng (không phải QR boarding/check-in của hãng bay), tracker chưa có feed trạng thái chuyến bay trực tiếp, thông báo chưa tích hợp push. Muốn chạy thật cần chuyển cấu hình sang merchant production đã được VNPay cấp phép, dữ liệu hãng bay và push provider.

## Quy tắc đặt chỗ demo
- Hành trình hỗ trợ một chiều, khứ hồi hoặc nhiều chặng từ 2 đến 4 chặng; các chặng nối tiếp cùng sân bay và đúng thứ tự thời gian.
- Hạng ghế có Phổ thông, Phổ thông cao cấp, Thương gia và Hạng nhất. Mã hãng bay có thể lọc bằng danh sách phân tách dấu phẩy.
- Người lớn từ 12 tuổi, trẻ em 2–11 tuổi và infant dưới 2 tuổi. Infant không chiếm ghế, tính giá demo 10% giá người lớn và giới hạn một infant trên mỗi người lớn.
- Mỗi người lớn/trẻ em cần một ghế trên từng chặng. Ghế, hành lý ký gửi và booking nhiều chặng được xử lý trong cùng một booking.
- Giá trẻ em là 75% và infant là 10% giá cơ bản; mức hành lý ký gửi demo là 300.000đ/kiện. Thanh toán không thu tiền thật.

ZIP đã được rà soát cấu trúc và cú pháp ở các lượt trước, nhưng chưa thể cam kết build/device end-to-end trên máy của bạn vì còn phụ thuộc phiên bản Node, MongoDB, cấu hình mạng và việc cài dependencies tại máy.
