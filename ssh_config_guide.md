# SSH Config cho Cursor Remote Development

## 1. Tạo SSH Config File

Tạo file `~/.ssh/config` (Windows: `C:\Users\YourName\.ssh\config`):

```
# WinCloud VPS Configuration
Host wincloud-vps
    HostName YOUR_VPS_IP
    User root
    Port 22
    # Nếu dùng SSH key:
    IdentityFile ~/.ssh/id_rsa
    # Nếu dùng password, bỏ dòng trên
    
    # Optional: Tăng tốc kết nối
    ServerAliveInterval 60
    ServerAliveCountMax 3
    TCPKeepAlive yes
    Compression yes
```

## 2. Tạo SSH Key (Khuyến nghị)

```bash
# Tạo SSH key pair
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy public key lên VPS
ssh-copy-id root@YOUR_VPS_IP

# Hoặc copy thủ công:
cat ~/.ssh/id_rsa.pub | ssh root@YOUR_VPS_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

## 3. Test SSH Connection

```bash
ssh wincloud-vps
```

## 4. Cursor Remote Development

1. **Ctrl+Shift+P** → "Remote-SSH: Connect to Host"
2. **Chọn**: `wincloud-vps`
3. **Enter password** (nếu chưa dùng SSH key)
4. **Chọn platform**: Linux
5. **Wait** cho Cursor server install trên VPS

## 5. Mở Project trên VPS

1. **File** → **Open Folder**
2. **Navigate** tới `/var/www/wincloud` (hoặc thư mục project)
3. **Select Folder**

## 6. Development Workflow

- **Terminal**: `Ctrl+` ` - Terminal sẽ chạy trên VPS
- **File Explorer**: Browse files trực tiếp trên VPS
- **Git**: Git commands chạy trên VPS
- **Extensions**: Install extensions cho remote environment

## 7. Port Forwarding

Để access services từ local:

1. **Ctrl+Shift+P** → "Remote-SSH: Forward Port"
2. **Add ports**:
   - 5000 (Backend API)
   - 5173 (Frontend Dev)
   - 5432 (PostgreSQL)
   - 6379 (Redis)

## 8. Troubleshooting

### Connection Issues:
```bash
# Check SSH connection
ssh -vvv wincloud-vps

# Reset Cursor remote server
# Ctrl+Shift+P → "Remote-SSH: Kill VS Code Server on Host"
```

### Performance:
```bash
# Add to SSH config
Host wincloud-vps
    ...
    Compression yes
    ServerAliveInterval 30
    TCPKeepAlive yes
```






