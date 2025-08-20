# 🔐 SSH Keys Setup Guide - WinCloud Builder

## 📋 TỔNG QUAN

Vì WinCloud Builder là **private repository** trên GitHub, bạn cần setup SSH keys để:
1. **GitHub**: Clone private repo trên VPS 
2. **VPS**: SSH access an toàn
3. **DigitalOcean**: Tự động tạo VPS với SSH keys

---

## 1. 🔑 SETUP SSH KEYS CHO GITHUB PRIVATE REPO

### **Bước 1: Tạo SSH Key mới (trên VPS)**
```bash
# SSH vào VPS trước
ssh your-vps-ip

# Tạo SSH key mới cho GitHub
ssh-keygen -t ed25519 -C "wincloud@yourdomain.com" -f ~/.ssh/github_wincloud
# Hoặc RSA nếu server cũ:
# ssh-keygen -t rsa -b 4096 -C "wincloud@yourdomain.com" -f ~/.ssh/github_wincloud

# Nhấn Enter cho tất cả prompts (không đặt passphrase cho automation)
```

### **Bước 2: Copy Public Key**
```bash
# Hiển thị public key
cat ~/.ssh/github_wincloud.pub

# Copy toàn bộ output (bắt đầu với ssh-ed25519 hoặc ssh-rsa)
```

### **Bước 3: Add vào GitHub**
1. Đi đến **GitHub.com** → **Settings** → **SSH and GPG keys**
2. Click **"New SSH key"**
3. Title: `WinCloud VPS - Production`
4. Key type: `Authentication Key`
5. Paste public key vào field **Key**
6. Click **"Add SSH key"**

### **Bước 4: Configure SSH Client trên VPS**
```bash
# Tạo SSH config
nano ~/.ssh/config

# Thêm vào file:
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_wincloud
    IdentitiesOnly yes
```

### **Bước 5: Test GitHub SSH Connection**
```bash
# Test connection
ssh -T git@github.com

# Kết quả mong muốn:
# Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

### **Bước 6: Clone Private Repo**
```bash
# Clone với SSH URL (không phải HTTPS) 
git clone git@github.com:huongpham911/winclod.app.git
cd winclod.app

# Verify
git remote -v
# origin  git@github.com:huongpham911/winclod.app.git (fetch)
# origin  git@github.com:huongpham911/winclod.app.git (push)
```

---

## 2. 🌐 SETUP SSH KEYS CHO VPS ACCESS

### **Option A: Từ Windows (Bạn đang dùng)**

#### **Tạo SSH Key trên Windows:**
```powershell
# Mở PowerShell as Administrator
# Tạo SSH key
ssh-keygen -t ed25519 -C "admin@wincloud-vps" -f "$env:USERPROFILE\.ssh\wincloud_vps"

# Hoặc RSA:
# ssh-keygen -t rsa -b 4096 -C "admin@wincloud-vps" -f "$env:USERPROFILE\.ssh\wincloud_vps"
```

#### **Copy Public Key lên VPS:**
```powershell
# Hiển thị public key
Get-Content "$env:USERPROFILE\.ssh\wincloud_vps.pub"

# Copy và paste vào VPS:
# ssh root@your-vps-ip
# echo "paste-public-key-here" >> ~/.ssh/authorized_keys
# chmod 600 ~/.ssh/authorized_keys
```

#### **Test SSH Connection:**
```powershell
# Test với key
ssh -i "$env:USERPROFILE\.ssh\wincloud_vps" root@your-vps-ip

# Hoặc tạo SSH config
# File: C:\Users\YourName\.ssh\config
Host wincloud-vps
    HostName your-vps-ip
    User root
    IdentityFile C:\Users\YourName\.ssh\wincloud_vps
    Port 22

# Sau đó SSH bằng:
ssh wincloud-vps
```

### **Option B: Setup từ VPS (Recommended cho production)**

```bash
# 1. Tạo user wincloud
sudo useradd -m -s /bin/bash wincloud
sudo usermod -aG sudo wincloud

# 2. Setup SSH cho user wincloud
sudo -u wincloud ssh-keygen -t ed25519 -C "wincloud@production" -f /home/wincloud/.ssh/id_ed25519

# 3. Copy public key để add vào GitHub và DigitalOcean
sudo -u wincloud cat /home/wincloud/.ssh/id_ed25519.pub
```

---

## 3. 🐋 SETUP SSH KEYS CHO DIGITALOCEAN

### **Bước 1: Add SSH Key vào DigitalOcean Dashboard**
1. Đi đến **DigitalOcean Dashboard** → **Settings** → **Security**
2. Click **"Add SSH Key"**
3. Paste public key (từ VPS hoặc local)
4. Name: `WinCloud Production Key`
5. Click **"Add SSH Key"**
6. **Copy SSH Key ID** (dop_xxxxx)

### **Bước 2: Update WinCloud Config**
```bash
# Trên VPS, edit environment
cd /var/www/wincloud
cp env.example .env
nano .env

# Update dòng:
DO_SSH_KEY_ID=your-ssh-key-id-from-digitalocean
SSH_KEY_PATH=/home/wincloud/.ssh/id_ed25519.pub
```

### **Bước 3: Copy SSH Key cho Backend**
```bash
# Copy public key cho WinCloud backend
cp /home/wincloud/.ssh/id_ed25519.pub /var/www/wincloud/backend/keys.txt

# Set permissions
chmod 644 /var/www/wincloud/backend/keys.txt
```

---

## 4. 🚀 QUICK SETUP SCRIPT

### **Script tự động (chạy trên VPS):**

```bash
#!/bin/bash
# File: setup_ssh_complete.sh

echo "🔐 WinCloud SSH Complete Setup"
echo "=============================="

# 1. Create wincloud user
sudo useradd -m -s /bin/bash wincloud 2>/dev/null || echo "User wincloud exists"
sudo usermod -aG sudo wincloud

# 2. Generate SSH keys
sudo -u wincloud mkdir -p /home/wincloud/.ssh
sudo -u wincloud ssh-keygen -t ed25519 -C "wincloud@production" -f /home/wincloud/.ssh/id_ed25519 -N ""

# 3. Generate GitHub SSH key
sudo -u wincloud ssh-keygen -t ed25519 -C "wincloud@github" -f /home/wincloud/.ssh/github_wincloud -N ""

# 4. Setup SSH config
sudo -u wincloud tee /home/wincloud/.ssh/config > /dev/null <<EOF
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_wincloud
    IdentitiesOnly yes

Host *
    AddKeysToAgent yes
    UseKeychain yes
EOF

# 5. Set permissions
sudo -u wincloud chmod 700 /home/wincloud/.ssh
sudo -u wincloud chmod 600 /home/wincloud/.ssh/*
sudo -u wincloud chmod 644 /home/wincloud/.ssh/*.pub

echo ""
echo "🎉 SSH Setup Complete!"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Add GitHub SSH Key:"
echo "   Copy this key to GitHub → Settings → SSH Keys:"
sudo -u wincloud cat /home/wincloud/.ssh/github_wincloud.pub
echo ""
echo "2. Add DigitalOcean SSH Key:"
echo "   Copy this key to DO Dashboard → Settings → Security:"
sudo -u wincloud cat /home/wincloud/.ssh/id_ed25519.pub
echo ""
echo "3. Test GitHub connection:"
echo "   sudo -u wincloud ssh -T git@github.com"
echo ""
echo "4. Clone WinCloud:"
echo "   sudo -u wincloud git clone git@github.com:huongpham911/winclod.app.git"
```

---

## 5. 📝 STEP-BY-STEP COMMANDS

### **Commands để chạy tuần tự:**

```bash
# === BƯỚC 1: Chuẩn bị VPS ===
# SSH vào VPS với password
ssh root@your-vps-ip

# Download setup script
curl -o setup_ssh_complete.sh https://raw.githubusercontent.com/huongpham911/winclod.app/main/setup_ssh_complete.sh
chmod +x setup_ssh_complete.sh

# Chạy setup
./setup_ssh_complete.sh

# === BƯỚC 2: Copy Keys (Manual) ===
# GitHub Key (add vào GitHub Dashboard):
sudo -u wincloud cat /home/wincloud/.ssh/github_wincloud.pub

# DigitalOcean Key (add vào DO Dashboard):
sudo -u wincloud cat /home/wincloud/.ssh/id_ed25519.pub

# === BƯỚC 3: Test Connections ===
# Test GitHub
sudo -u wincloud ssh -T git@github.com

# Clone project nếu test thành công
sudo -u wincloud git clone git@github.com:huongpham911/winclod.app.git

# === BƯỚC 4: Setup WinCloud ===
cd /var/www/wincloud
cp env.example .env

# Copy SSH key cho backend
sudo -u wincloud cp /home/wincloud/.ssh/id_ed25519.pub /var/www/wincloud/backend/keys.txt

# Set ownership
sudo chown -R wincloud:wincloud /var/www/wincloud
```

---

## 6. 🔍 TROUBLESHOOTING

### **Lỗi Permission Denied:**
```bash
# Fix SSH permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_*
chmod 644 ~/.ssh/*.pub
```

### **Lỗi GitHub Clone:**
```bash
# Verify SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/github_wincloud

# Test lại
ssh -T git@github.com
```

### **Lỗi DigitalOcean API:**
```bash
# Verify SSH key được add vào DO
curl -X GET \
  -H "Authorization: Bearer YOUR_DO_TOKEN" \
  "https://api.digitalocean.com/v2/account/keys"
```

---

## 🎯 CHECKLIST

- [ ] SSH key generated cho GitHub
- [ ] SSH key added vào GitHub dashboard
- [ ] SSH config setup cho GitHub
- [ ] Test GitHub SSH connection thành công
- [ ] Clone private repo thành công
- [ ] SSH key generated cho DigitalOcean
- [ ] SSH key added vào DO dashboard
- [ ] Copy SSH key vào backend/keys.txt
- [ ] Environment variables configured
- [ ] VPS SSH access working

---

**🎉 Sau khi hoàn thành setup này, bạn có thể clone private repo và deploy WinCloud Builder thành công!**
