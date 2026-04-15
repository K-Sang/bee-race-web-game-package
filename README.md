# Bee Race Web Game

## 1) Deploy lên GitHub Pages

1. Tạo repo mới trên GitHub, ví dụ: `bee-race-game`
2. Upload toàn bộ file trong thư mục này lên repo
3. Vào **Settings → Pages**
4. Ở mục **Build and deployment**:
   - **Source** = `Deploy from a branch`
   - **Branch** = `main`
   - **Folder** = `/ (root)`
5. Chờ GitHub Pages publish
6. Link thường có dạng:
   - `https://TEN-USER.github.io/bee-race-game/`

GitHub Pages là dịch vụ host static site cho HTML/CSS/JS trực tiếp từ repository GitHub.

## 2) Add vào PowerPoint

### Cách ổn định nhất
- Tạo 1 nút trong slide rồi gắn hyperlink tới link GitHub Pages.

### Cách nhúng trực tiếp trong slide
- Dùng add-in **LiveWeb** hoặc **Web Viewer** trong PowerPoint nếu máy bạn có cài và không bị policy chặn.
- Sau khi mở add-in, dán URL GitHub Pages vào khung web.
- Đặt khung đó phủ gần full slide.

## 3) Hành vi game
- 4 ong
- nhập tên từng ong
- bấm **Bắt đầu**
- random 1 ong thắng
- tất cả ong đều về đích
- ong thắng về trước rất sát
- có **Reset**
- có **Toàn màn hình**

## 4) Tùy chỉnh nhanh
- Đổi tên mặc định: sửa `value=` trong `index.html`
- Đổi màu giao diện: sửa biến CSS trong `style.css`
- Đổi logic tốc độ: sửa `script.js`
