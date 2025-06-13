# AI Server Monitoring Web Interface

Hệ thống web quản lý và giám sát server sử dụng trí tuệ nhân tạo.

## Tính năng

- Giao diện quản trị thống nhất cho giám sát server
- Xác thực người dùng bằng JWT (JSON Web Tokens) và SQLite
- Tích hợp với nhiều công cụ giám sát:
  - Node-RED
  - Grafana
  - InfluxDB
- Giao diện đẹp mắt, dễ sử dụng với công nghệ web hiện đại

## Cài đặt

### Yêu cầu

- Node.js (>= 14.x)
- NPM (>= 6.x)

### Cài đặt trên Windows

1. Clone hoặc tải repository này về máy của bạn
2. Chạy tệp `setup.bat` để cài đặt dependencies và thiết lập cơ sở dữ liệu
3. Khởi động server với lệnh `npm start`
4. Truy cập vào http://localhost:3300 trong trình duyệt

### Cài đặt thủ công

1. Cài đặt các dependencies:
   ```
   npm install
   ```

2. Thiết lập cơ sở dữ liệu:
   ```
   node db_setup.js
   ```

3. Khởi động server:
   ```
   node auth_server.js
   ```

## Tài khoản mặc định

- Username: `admin`
- Password: `admin123`

## Cấu trúc dự án

- `index.html` - Trang chủ
- `login.html` - Trang đăng nhập
- `styles.css` - Kiểu CSS chính
- `login.css` - Kiểu CSS cho trang đăng nhập
- `script.js` - JavaScript cho trang chủ
- `login.js` - JavaScript cho trang đăng nhập và giao diện quản trị
- `auth_server.js` - Server xác thực sử dụng Express.js
- `db_setup.js` - Script thiết lập cơ sở dữ liệu SQLite

## Bảo mật

Hệ thống sử dụng nhiều lớp bảo mật:

- Xác thực người dùng với JWT
- Lưu trữ mật khẩu được mã hóa bằng bcrypt
- Giới hạn số lần đăng nhập thất bại
- Cơ chế làm mới token (token refresh)

## Lưu ý phát triển

- Đảm bảo thay đổi mật khẩu mặc định trước khi triển khai
- Thay đổi khóa bí mật JWT trong môi trường sản xuất
- Tạo bản sao lưu CSDL thường xuyên

## System Architecture

- **Front-end**: HTML, CSS, JavaScript
- **Back-end**: Node.js, Express.js
- **Database**: SQLite for authentication
- **Monitoring Tools**: Tích hợp các dịch vụ giám sát thông qua giao diện web quản trị

## User Authentication

The system uses SQLite for storing user credentials. Passwords are hashed using bcrypt for security.

Default login:
- Username: admin
- Password: admin123

To add more users, you can:
1. Access the SQLite database directly
2. Implement a user management interface (future enhancement)

## Development

To run the server in development mode with auto-restart:
```
npm run dev
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 