# Deploy Ethan’s Note

Một mật khẩu mở toàn bộ sổ. PostgreSQL lưu nội dung, tag, ảnh PNG và phiên đăng nhập; không có đăng ký công khai. Các thiết bị dùng chung dữ liệu sau khi mở khóa. Đây là kiểm soát truy cập phía máy chủ, không phải mã hóa đầu cuối.

## Cấu hình lần đầu

Yêu cầu Node.js 22, pnpm và một database PostgreSQL riêng. Tạo database trống và tài khoản có quyền tạo bảng trong database đó.

```sh
pnpm install --frozen-lockfile
pnpm configure
pnpm db:migrate
pnpm dev
```

`pnpm configure` hỏi chuỗi kết nối và mật khẩu trong terminal, không hiện ký tự nhập. Mật khẩu cần ít nhất 12 ký tự. Script tạo `.env.local` với `DATABASE_URL` và `NOTES_PASSWORD_HASH` dạng scrypt có salt; không lưu mật khẩu gốc và không ghi đè file đã tồn tại. Không gửi mật khẩu hoặc chuỗi kết nối vào chat/Git. Nếu đã có `.env.local`, giữ nguyên các biến khác và cập nhật theo `.env.example`.

Sau khi cấu hình, khởi động lại Next.js. Chạy `pnpm db:migrate` trước mỗi lần deploy; migration chạy trong transaction, có khóa và theo dõi phiên bản để không chạy lặp.

## Hosting có Node.js

Đặt các biến sau trong secrets/environment của hosting, không dùng tiền tố `NEXT_PUBLIC_`:

| Biến | Giá trị |
| --- | --- |
| `DATABASE_URL` | URL của PostgreSQL production; dùng TLS và xác thực chứng chỉ theo nhà cung cấp |
| `NOTES_PASSWORD_HASH` | Giá trị hash do `pnpm configure` tạo, không phải mật khẩu gốc |
| `APP_ORIGIN` | Origin HTTPS chính xác, ví dụ `https://notes.example.com`, không có dấu `/` cuối |

Build: `pnpm build`. Start: `pnpm start`. Chạy `pnpm db:migrate` với môi trường production trước khi đưa bản mới vào phục vụ. Cần hosting chạy Next.js server/Route Handlers; static hosting không chạy được backend này.

Đặt HTTPS trước ứng dụng. Reverse proxy cần giữ host/origin chính xác và cấu hình `APP_ORIGIN`. Cookie production có Secure, HttpOnly, SameSite=Strict; HTTP production không mở khóa được. Mỗi ảnh tải lên bằng một request nhị phân riêng. Proxy cần cho phép body ít nhất 3.5 MiB ở `/api/images` và 128 KiB cho note.

Pool tối đa 5 kết nối mỗi instance. Với nhiều instance/serverless, dùng pooled connection URL và giới hạn instance phù hợp với database.

## Docker

```sh
docker build --target migrate -t ethans-note-migrate .
# DATABASE_URL được truyền từ môi trường terminal/CI.
docker run --rm --env DATABASE_URL ethans-note-migrate
docker build -t ethans-note .
docker run -d --name ethans-note -p 3000:3000 --env DATABASE_URL --env NOTES_PASSWORD_HASH --env APP_ORIGIN ethans-note
```

Đặt reverse proxy HTTPS trước cổng 3000. Container chạy bằng user `node`; dữ liệu nằm trong PostgreSQL bên ngoài. Không truyền `.env.local` vào Docker build.

## Dữ liệu cũ và sao lưu

Sau khi mở khóa trên trình duyệt đang giữ dữ liệu cũ, bấm **Chuyển vào sổ**. Nội dung, tag và ảnh cũ được chuyển sang PostgreSQL. Nguồn localStorage giữ nguyên. ID nhập tạo từ dấu vân tay dữ liệu nguồn để thử lại không ghi đè dữ liệu đã có. Danh mục cũ chuyển thành tag; ảnh đơn chuyển thành mảng ảnh.

Sao lưu JSON kèm ảnh dạng data URL bằng nút tải xuống. Dùng backup/snapshot PostgreSQL cho bản sao lưu đầy đủ, bao gồm toàn bộ dữ liệu và bảng phiên. Dung lượng database/backup tăng theo ảnh.

Ảnh không còn gắn với note được giữ lại để hoàn tác. Có thể chạy `pnpm db:cleanup` định kỳ để xóa ảnh không tham chiếu đã quá 7 ngày và phiên hết hạn; không xóa ảnh còn gắn với note.

## Mật khẩu và đồng bộ

Phiên mở khóa có hiệu lực tối đa 7 ngày. Nút khóa hủy phiên hiện tại trên server. Các thiết bị khác giữ phiên riêng. Đổi `NOTES_PASSWORD_HASH` và khởi động lại/deploy lại vô hiệu hóa phiên dùng hash cũ. Giữ mật khẩu trong trình quản lý mật khẩu.

Danh sách tải lại khi quay về cửa sổ và mỗi 30 giây khi không sửa. Nếu hai thiết bị sửa cùng phiên bản note, lần lưu sau nhận lỗi xung đột và giữ bản nháp để sao chép; dữ liệu trên server không bị ghi đè âm thầm.

Đăng nhập bị giới hạn 30 lượt/15 phút cho sổ, lưu trong PostgreSQL để áp dụng trên nhiều instance. Chưa có khôi phục mật khẩu qua email; chủ sở hữu đổi hash qua secrets của hosting.
