# Các chức năng được bổ sung

## Tìm chuyến bay
- Chọn hành trình một chiều, khứ hồi hoặc nhiều chặng (2–4 chặng); chuyến khứ hồi và nhiều chặng được kiểm tra điểm nối tiếp và thời gian khởi hành.
- Lọc theo hạng ghế (Phổ thông, Phổ thông cao cấp, Thương gia, Hạng nhất), hãng bay, giá tối đa, số điểm dừng và sắp xếp.
- Gợi ý sân bay theo mã IATA, thành phố hoặc tên sân bay qua `GET /api/flights/airports/search?q=...`. Dữ liệu lấy từ collection Airport; nếu collection chưa có dữ liệu, API tìm trong sân bay của các chuyến bay hiện có.
- Sơ đồ ghế và bước đặt chỗ giữ lựa chọn từng chặng; infant không cần ghế riêng.

## Hành khách và hành lý
- Chọn số lượng người lớn, trẻ em và trẻ sơ sinh; thông tin từng hành khách được chuyển xuyên suốt từ tìm kiếm đến đặt chỗ.
- Giá vé cơ bản trẻ em được tính 75% giá người lớn; phụ phí ghế, hành lý và bảo hiểm được tính riêng ở backend.
- Quy tắc demo cho infant: dưới 2 tuổi, giá bằng 10% giá cơ bản người lớn, không chiếm ghế và tối đa một infant trên mỗi người lớn.
- Có thể bật/tắt hành lý ký gửi; khi bật chọn số kiện, giá demo 300.000đ/kiện. Không bật nghĩa là không mua hành lý ký gửi (vẫn có hành lý xách tay theo chuyến bay).

## Thanh toán mô phỏng
- Chọn chuyển khoản ngân hàng, thẻ ngân hàng Demo hoặc ví điện tử Demo.
- Với chuyển khoản, chọn Vietcombank, Techcombank, BIDV hoặc ACB. Phương thức/ngân hàng được gửi đến backend và lưu trên booking.
- Đây là mô phỏng nội bộ: không tích hợp cổng thanh toán thật, không thu tiền thật và không yêu cầu nhập thông tin tài khoản/thẻ.

## Lưu ý phạm vi
- Các chặng của một hành trình được giữ ghế và tạo thành một booking/mã đặt chỗ chung; dữ liệu legacy một chiều/khứ hồi vẫn được duy trì để tương thích.
- Giá trẻ em 75% và infant 10% là quy tắc demo, có thể chỉnh trong `server/src/services/pricingService.js`.
- Thanh toán vẫn là mô phỏng nội bộ; chưa kết nối cổng thanh toán thật.
