import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        # Google Workspace SMTP settings
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.smtp_user = os.getenv("GMAIL_USER", "support@wincloud.app")
        self.smtp_password = os.getenv("GMAIL_PASS")
        
        if not self.smtp_password:
            logger.warning("GMAIL_PASS environment variable not set. Email functionality may not work.")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        from_name: str = "WinCloud Support",
        from_email: Optional[str] = None,
        is_html: bool = False
    ) -> bool:
        """
        Send email using Google Workspace SMTP
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body content
            from_name: Display name for sender
            from_email: Sender email (optional, defaults to support@wincloud.app)
            is_html: Whether body is HTML content
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            if not self.smtp_password:
                logger.error("Email password not configured")
                return False
                
            # Create message
            msg = MIMEMultipart()
            msg['Subject'] = subject
            msg['From'] = formataddr((from_name, from_email or self.smtp_user))
            msg['To'] = to_email
            
            # Add body
            msg_body = MIMEText(body, 'html' if is_html else 'plain', 'utf-8')
            msg.attach(msg_body)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
                
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

# Global email service instance
email_service = EmailService()

async def send_contact_email(
    to_email: str,
    subject: str,
    body: str,
    from_name: str = "WinCloud Support",
    from_email: Optional[str] = None
) -> bool:
    """
    Convenience function to send contact emails
    """
    return await email_service.send_email(
        to_email=to_email,
        subject=subject,
        body=body,
        from_name=from_name,
        from_email=from_email
    )

async def send_welcome_email(user_email: str, user_name: str) -> bool:
    """
    Send welcome email to new users
    """
    subject = "Chào mừng đến với WinCloud!"
    body = f"""
Xin chào {user_name},

Chào mừng bạn đến với WinCloud - nền tảng tạo Windows RDP tự động trên DigitalOcean!

Với WinCloud, bạn có thể:
✅ Tạo Windows VPS chỉ trong vài phút
✅ Quản lý nhiều máy chủ từ một dashboard
✅ Tối ưu chi phí với các gói linh hoạt
✅ Hỗ trợ 24/7 từ đội ngũ chuyên nghiệp

Bắt đầu ngay tại: https://wincloud.app

Nếu có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi:
📧 Email: support@wincloud.app
📞 Hotline: 1900 1234

Trân trọng,
Đội ngũ WinCloud
    """
    
    return await email_service.send_email(
        to_email=user_email,
        subject=subject,
        body=body,
        from_name="WinCloud Support",
        from_email="support@wincloud.app"
    )

async def send_password_reset_email(user_email: str, reset_token: str) -> bool:
    """
    Send password reset email
    """
    reset_link = f"https://wincloud.app/reset-password?token={reset_token}"
    
    subject = "Đặt lại mật khẩu WinCloud"
    body = f"""
Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản WinCloud.

Nhấp vào liên kết bên dưới để đặt lại mật khẩu:
{reset_link}

Liên kết này sẽ hết hạn sau 1 giờ.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ WinCloud
    """
    
    return await email_service.send_email(
        to_email=user_email,
        subject=subject,
        body=body,
        from_name="WinCloud Support",
        from_email="support@wincloud.app"
    )
