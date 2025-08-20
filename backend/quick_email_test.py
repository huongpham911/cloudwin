#!/usr/bin/env python3
"""
Quick Email Test for WinCloud
Test nhanh email system
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

def quick_test():
    """Test email nhanh"""
    print("🚀 Quick Email Test for WinCloud")
    print("=" * 40)
    
    # Email config từ .env
    SMTP_HOST = "smtp.gmail.com"
    SMTP_PORT = 587
    SMTP_USER = "support@wincloud.app"
    SMTP_PASSWORD = "jngd ccpa mngm jexm"
    
    print(f"📧 Testing email: {SMTP_USER}")
    print(f"🔌 SMTP: {SMTP_HOST}:{SMTP_PORT}")
    
    try:
        # Tạo email test
        msg = MIMEMultipart()
        msg['Subject'] = f"🧪 WinCloud Quick Test - {datetime.now().strftime('%H:%M:%S')}"
        msg['From'] = SMTP_USER
        msg['To'] = SMTP_USER
        
        body = f"""
🧪 WinCloud Email Quick Test

Thời gian: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

✅ Nếu nhận được email này = Email system hoạt động OK!

Contact form sẽ gửi email đến: {SMTP_USER}

---
WinCloud Builder
        """
        
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        # Gửi email
        print("🔄 Connecting and sending...")
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        print("✅ SUCCESS! Email sent!")
        print(f"📬 Check inbox: {SMTP_USER}")
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        print("\n💡 Possible issues:")
        print("- Check App Password is correct")
        print("- Ensure 2FA is enabled on Gmail")
        print("- Verify email address is correct")

if __name__ == "__main__":
    quick_test()
