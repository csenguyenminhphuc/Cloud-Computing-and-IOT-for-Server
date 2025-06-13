import subprocess
import time

# Danh sách các lệnh và thư mục tương ứng
commands = [
    {
        "dir": r"C:\Users\Administrator\.node-red",
        "cmd": "node-red"
    },
    {
        "dir": r"C:\Program Files\mosquitto",
        "cmd": r"mosquitto -c mosquitto.conf -v"
    },
    {
        "dir": r"C:\influxdb2",
        "cmd": "influxd.exe"
    },
    {
        "dir": r"C:\Program Files\GrafanaLabs\grafana\bin",
        "cmd": "grafana-server.exe"
    },
    {
        "dir": r"C:\nginx",
        "cmd": "start nginx"
    }
]

def run_in_new_cmd(command, working_dir):
    """Mở một CMD mới và chạy lệnh trong thư mục chỉ định"""
    # Lệnh để mở CMD, chuyển thư mục và chạy lệnh
    cmd_command = f'cmd.exe /K "cd /d {working_dir} && {command}"'
    # Mở CMD mới mà không chờ (non-blocking)
    subprocess.Popen(cmd_command, creationflags=subprocess.CREATE_NEW_CONSOLE)

def main():
    print("Đang khởi chạy các dịch vụ...")
    for cmd_info in commands:
        print(f"Khởi chạy: {cmd_info['cmd']} trong {cmd_info['dir']}")
        run_in_new_cmd(cmd_info["cmd"], cmd_info["dir"])
        # Đợi một chút để tránh xung đột khi mở nhiều CMD
        time.sleep(2)
    print("Hoàn tất! Tất cả dịch vụ đã được khởi chạy.")

if __name__ == "__main__":
    main()