#!/usr/bin/env python3
"""
Test Email System for WinCloud
Kiểm tra cấu hình email và gửi test email
"""

import os
import sys
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from datetime import datetime

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def load_env():
    """Load environment variables from .env file"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    env_vars = {}
    
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    
    return env_vars

def test_smtp_connection():
    """Test SMTP connection"""
    print("🔍 Testing SMTP Connection...")
    print("=" * 50)
    
    env_vars = load_env()
    
    smtp_host = env_vars.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(env_vars.get('SMTP_PORT', 587))
    smtp_user = env_vars.get('SMTP_USER', '')
    smtp_password = env_vars.get('SMTP_PASSWORD', '')
    
    print(f"📧 SMTP Host: {smtp_host}")
    print(f"🔌 SMTP Port: {smtp_port}")
    print(f"👤 SMTP User: {smtp_user}")
    print(f"🔑 Password: {'*' * len(smtp_password) if smtp_password else 'NOT SET'}")
    print()
    
    if not smtp_user or not smtp_password:
        print("❌ SMTP credentials not configured!")
        return False
    
    try:
        print("🔄 Connecting to SMTP server...")
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            print("✅ Connected to SMTP server")
            
            print("🔄 Starting TLS...")
            server.starttls()
            print("✅ TLS started")
            
            print("🔄 Authenticating...")
            server.login(smtp_user, smtp_password)
            print("✅ Authentication successful")
            
        print("🎉 SMTP connection test PASSED!")
        return True
        
    except Exception as e:
        print(f"❌ SMTP connection test FAILED: {e}")
        return False

def send_test_email():
    """Send test email"""
    print("\n📨 Sending Test Email...")
    print("=" * 50)
    
    env_vars = load_env()
    
    smtp_host = env_vars.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(env_vars.get('SMTP_PORT', 587))
    smtp_user = env_vars.get('SMTP_USER', '')
    smtp_password = env_vars.get('SMTP_PASSWORD', '')
    
    if not smtp_user or not smtp_password:
        print("❌ SMTP credentials not configured!")
        return False
    
    try:
        # Create test email
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "🧪 WinCloud Email Test - " + datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        msg['From'] = formataddr(("WinCloud Test", smtp_user))
        msg['To'] = smtp_user  # Send to self for testing
        
        # Email content
        text_content = f"""
WinCloud Email System Test

Thời gian: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
From: {smtp_user}
To: {smtp_user}

Nếu bạn nhận được email này, hệ thống email đã hoạt động thành công!

---
WinCloud Builder Email System
        """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>WinCloud Email Test</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 10px; text-align: center;">
        <h1>🧪 WinCloud Email Test</h1>
        <p>Email System Test Successful!</p>
    </div>
    
    <div style="padding: 20px; background: #f8fafc; border-radius: 10px; margin: 20px 0;">
        <h2>📋 Test Details</h2>
        <p><strong>Thời gian:</strong> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
        <p><strong>From:</strong> {smtp_user}</p>
        <p><strong>To:</strong> {smtp_user}</p>
        <p><strong>SMTP Host:</strong> {smtp_host}</p>
        <p><strong>SMTP Port:</strong> {smtp_port}</p>
    </div>
    
    <div style="padding: 20px; background: #dcfce7; border-radius: 10px; border-left: 4px solid #10b981;">
        <h3>✅ Kết quả</h3>
        <p>Nếu bạn nhận được email này, hệ thống email WinCloud đã hoạt động thành công!</p>
        <p>Contact form trên website sẽ gửi email đến địa chỉ này.</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
        <p>WinCloud Builder Email System</p>
        <p>Generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
</body>
</html>
        """
        
        # Attach both versions
        part1 = MIMEText(text_content, 'plain', 'utf-8')
        part2 = MIMEText(html_content, 'html', 'utf-8')
        
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email
        print(f"📤 Sending test email to: {smtp_user}")
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        print("✅ Test email sent successfully!")
        print(f"📬 Check your inbox: {smtp_user}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send test email: {e}")
        return False

def test_contact_api():
    """Test contact API endpoint"""
    print("\n🌐 Testing Contact API...")
    print("=" * 50)
    
    try:
        import requests
        
        # Test data
        test_data = {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "0123456789",
            "subject": "Email System Test",
            "message": "This is a test message from email system test script.",
            "source": "email_test_script",
            "recipient": "support@wincloud.app"
        }
        
        print("📤 Sending test request to contact API...")
        response = requests.post(
            'http://localhost:5000/api/v1/contact',
            json=test_data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Contact API test PASSED!")
            print(f"📋 Response: {result}")
            return True
        else:
            print(f"❌ Contact API test FAILED! Status: {response.status_code}")
            print(f"📋 Response: {response.text}")
            return False
            
    except ImportError:
        print("⚠️ requests library not installed. Skipping API test.")
        print("💡 Install with: pip install requests")
        return None
    except Exception as e:
        print(f"❌ Contact API test FAILED: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 WinCloud Email System Test")
    print("=" * 60)
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    results = []
    
    # Test 1: SMTP Connection
    smtp_result = test_smtp_connection()
    results.append(("SMTP Connection", smtp_result))
    
    # Test 2: Send Test Email
    if smtp_result:
        email_result = send_test_email()
        results.append(("Test Email", email_result))
    else:
        print("\n⏭️ Skipping email test due to SMTP connection failure")
        results.append(("Test Email", False))
    
    # Test 3: Contact API
    api_result = test_contact_api()
    if api_result is not None:
        results.append(("Contact API", api_result))
    
    # Summary
    print("\n📊 TEST SUMMARY")
    print("=" * 60)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:<20} {status}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests PASSED! Email system is working correctly.")
    else:
        print("⚠️ Some tests FAILED. Please check configuration.")
    
    print(f"\n⏰ Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
