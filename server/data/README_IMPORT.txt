DU LIEU MONGODB - FLIGHT BOOKING

Các file JSON được tạo riêng theo schema trong project flight-booking-app.

FILE VÀ SỐ LƯỢNG
- airports.json: 12 sân bay
- airlines.json: 5 hãng hàng không
- flights.json: 210 chuyến bay (21 ngày x 10 tuyến x các hãng)
- settings.json: 1 cấu hình hệ thống
- users.json: 2 tài khoản demo (password đã bcrypt hash, tương thích bcryptjs)

CÁCH IMPORT BẰNG MONGODB COMPASS
1. Mở MongoDB Compass, kết nối mongodb://127.0.0.1:27017
2. Tạo database flight_booking.
3. Chọn Add Data > Import JSON.
4. Chọn từng file JSON và import vào collection trùng tên số nhiều: airports, airlines, flights, settings, users.
5. Chọn JSON (không chọn CSV). Với flights.json, Compass hỗ trợ Extended JSON $date.
6. Import theo thứ tự airports, airlines, flights, settings, users.

TÀI KHOẢN DEMO
Admin: admin@flightbooking.local / Admin@123456
User:  user@flightbooking.local / User@123456

LƯU Ý
- Đây là dữ liệu giả lập để phát triển/kiểm thử, không phải lịch bay hoặc giá vé thực tế.
- Chuyến bay có ngày khởi hành từ 05/11/2026 đến 25/11/2026 (UTC).
- Không import bookings hoặc paymenttransactions mẫu: hai collection này cần ObjectId user/flight/booking khớp dữ liệu thực tế và trạng thái giao dịch không nên giả lập tùy tiện.
- Nếu collection đã có dữ liệu, import có thể tạo bản ghi trùng; nên dùng database mới hoặc xóa dữ liệu demo cũ trước.
- Mật khẩu user đã được hash bcrypt cost 12. Khi import trực tiếp qua Compass, hook pre-save của Mongoose không chạy; vì vậy file đã chứa hash, không phải mật khẩu thuần.
