# Ethan’s Note

Sổ ghi chú cá nhân dùng Next.js 16, PostgreSQL, shadcn/ui Base Nova và Tailwind CSS 4. Một mật khẩu mở toàn bộ sổ; API kiểm tra phiên cho cả nội dung và ảnh.

## Chạy dự án

Yêu cầu Node.js 22 và PostgreSQL. Chạy trong terminal tương tác:

```sh
pnpm install
pnpm configure
pnpm db:migrate
pnpm dev
```

`pnpm configure` hỏi chuỗi kết nối và mật khẩu, lưu hash có salt trong `.env.local`. File đã tồn tại sẽ không bị ghi đè. [DEPLOY.md](./DEPLOY.md) hướng dẫn cấu hình production, HTTPS, Docker và sao lưu.

Kiểm tra: `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## Dev trên máy này

Môi trường local dùng database `ethans_note_dev` ở `127.0.0.1:55440`, tách khỏi PostgreSQL đang có ở cổng 5432. Cấu hình nằm trong `.env.local`; dữ liệu PostgreSQL nằm ở `.local/postgres`, được giữ lại khi tắt server và không đưa vào Git/Docker.

Chạy `pnpm dev` để tự bật PostgreSQL local rồi mở Next.js. Khi cần điều khiển riêng: `pnpm db:dev:start` và `pnpm db:dev:stop`. Dừng database không xóa dữ liệu. Giữ thư mục `.local/postgres` khi tiếp tục sử dụng dữ liệu dev.

## Sử dụng

- Tạo/sửa/xóa có hoàn tác. Phân loại bằng tag; tìm tiêu đề, nội dung và tag có hoặc không dấu. Ctrl/Cmd+K để tìm nhanh.
- Mỗi note tối đa 12 ảnh. Chọn nhiều file hoặc dán Ctrl/Cmd+V để thêm ảnh. PNG/JPG/WebP tối đa 5 MB mỗi ảnh; ứng dụng chuẩn hóa PNG, thu nhỏ tối đa 1600 px và giảm dung lượng khi cần.
- Bấm thumbnail để mở ảnh riêng. Góc trên phải có sao chép riêng ảnh đó, tải xuống và đóng. Dùng nút hoặc mũi tên để chuyển ảnh. Gỡ từng ảnh trong form chỉnh sửa.
- Link nhập trong nội dung tự bấm mở được. “Xem thêm” mở drawer đọc đầy đủ, sao chép hoặc chuyển sang sửa.
- “Sao chép” lấy toàn bộ nội dung kèm các ảnh. Clipboard cung cấp HTML, văn bản và PNG ghép; ứng dụng nhận quyết định định dạng dán. Có thể chép riêng nội dung từ menu hoặc từng ảnh từ trình xem. Sao chép ảnh cần HTTPS/localhost và ClipboardItem.
- Nội dung, tag và ảnh lưu trong PostgreSQL. Sau khi mở khóa, các thiết bị dùng chung dữ liệu. Danh sách tải lại khi quay về cửa sổ và mỗi 30 giây khi không sửa. Xung đột phiên bản giữ bản nháp và không âm thầm ghi đè server.
- Nút khóa hủy phiên hiện tại. Phiên tối đa 7 ngày; đổi hash mật khẩu sẽ vô hiệu hóa các phiên cũ.
- Sao lưu JSON kèm ảnh bằng biểu tượng tải xuống. Dữ liệu localStorage cũ có nút “Chuyển vào sổ”; nguồn cũ được giữ lại. Danh mục cũ chuyển thành tag và ảnh đơn chuyển thành danh sách ảnh.

## Cấu trúc

- `app/api`: phiên, CRUD note và ảnh có xác thực.
- `lib/server`: PostgreSQL pool, auth và transaction với kiểm tra phiên bản.
- `db`: migration SQL; `scripts`: cấu hình, migrate và dọn ảnh không tham chiếu quá 7 ngày.
- `components/note-workspace.tsx`: tìm/lọc, đồng bộ và chuyển dữ liệu cũ.
- `components/note-editor.tsx`, `note-reader.tsx`, `image-gallery.tsx`: form, drawer đọc và trình xem ảnh.
- Theme Emerald/Inter, token sáng/tối trong `app/globals.css`; component UI theo `components.json`.
