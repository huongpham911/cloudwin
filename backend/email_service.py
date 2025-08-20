Remote-SSH: Connect to Host#!/usr/bin/env python3
"""
Email Service for WinCloud Builder
Supports both HTML and Text email templates
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Email service với support cho multiple providers"""
    
    def __init__(self, provider: str = "mock"):
        """
        Initialize email service
        
        Args:
            provider: "mock", "gmail", "sendgrid", "ses"
        """
        self.provider = provider
        self.templates_dir = os.path.join(os.path.dirname(__file__), "email_templates")
        
        # Configuration cho các email providers
        self.configs = {
            "gmail": {
                "smtp_server": "smtp.gmail.com",
                "smtp_port": 587,
                "use_tls": True
            },
            "outlook": {
                "smtp_server": "smtp-mail.outlook.com", 
                "smtp_port": 587,
                "use_tls": True
            }
        }
    
    def load_template(self, template_name: str, template_type: str = "html") -> str:
        """Load email template từ file"""
        try:
            file_ext = "html" if template_type == "html" else "txt"
            template_path = os.path.join(self.templates_dir, f"{template_name}.{file_ext}")
            
            if os.path.exists(template_path):
                with open(template_path, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                logger.warning(f"Template not found: {template_path}")
                return self._get_default_template(template_type)
                
        except Exception as e:
            logger.error(f"Error loading template: {e}")
            return self._get_default_template(template_type)
    
    def _get_default_template(self, template_type: str = "html") -> str:
        """Default template nếu không tìm thấy file"""
        if template_type == "html":
            return """
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">☁️ WinCloud</h1>
                </div>
                <div style="padding: 30px;">
                    <h2>Xin chào {{user_name}}!</h2>
                    <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản WinCloud.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{reset_link}}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                            🔑 Đặt lại mật khẩu
                        </a>
                    </div>
                    <p><small>Liên kết này sẽ hết hạn sau 15 phút.</small></p>
                </div>
            </body>
            </html>
            """
        else:
            return """
            ☁️ WINCLOUD BUILDER
            
            Xin chào {{user_name}},
            
            Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản WinCloud.
            
            Đường dẫn đặt lại mật khẩu:
            {{reset_link}}
            
            Liên kết này sẽ hết hạn sau 15 phút.
            
            Trân trọng,
            Đội ngũ WinCloud Builder
            """
    
    def render_template(self, template_content: str, variables: Dict[str, str]) -> str:
        """Render template với variables"""
        try:
            # Default variables
            default_vars = {
                "website_url": "https://wincloud.app",
                "support_url": "mailto:support@wincloud.app", 
                "privacy_url": "https://wincloud.app/privacy",
                "company_name": "WinCloud Builder",
                "year": "2025"
            }
            
            # Merge với user variables
            all_vars = {**default_vars, **variables}
            
            # Replace tất cả {{variable}} trong template
            rendered = template_content
            for key, value in all_vars.items():
                rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
            
            return rendered
            
        except Exception as e:
            logger.error(f"Error rendering template: {e}")
            return template_content
    
    def send_forgot_password_email(self, 
                                 to_email: str, 
                                 user_name: str, 
                                 reset_link: str,
                                 smtp_config: Optional[Dict] = None) -> Dict:
        """
        Gửi email forgot password
        
        Args:
            to_email: Email người nhận
            user_name: Tên người dùng
            reset_link: Link reset password
            smtp_config: SMTP configuration (optional)
        
        Returns:
            Dict với status và message
        """
        try:
            # Prepare template variables
            variables = {
                "user_name": user_name,
                "reset_link": reset_link,
                "to_email": to_email
            }
            
            if self.provider == "mock":
                return self._send_mock_email(to_email, user_name, reset_link, variables)
            elif self.provider in ["gmail", "outlook"]:
                return self._send_smtp_email(to_email, user_name, reset_link, variables, smtp_config)
            else:
                return {"success": False, "error": f"Unsupported provider: {self.provider}"}
                
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return {"success": False, "error": str(e)}
    
    def _send_mock_email(self, to_email: str, user_name: str, reset_link: str, variables: Dict) -> Dict:
        """Mock email - log to console"""
        
        # Load và render templates
        html_template = self.load_template("forgot_password_template", "html")
        text_template = self.load_template("forgot_password_template", "txt")
        
        html_content = self.render_template(html_template, variables)
        text_content = self.render_template(text_template, variables)
        
        logger.info("=" * 60)
        logger.info("📧 MOCK EMAIL SENT")
        logger.info("=" * 60)
        logger.info(f"To: {to_email}")
        logger.info(f"Subject: WinCloud - Đặt lại mật khẩu")
        logger.info(f"Reset Link: {reset_link}")
        logger.info("=" * 60)
        logger.info("TEXT VERSION:")
        logger.info(text_content)
        logger.info("=" * 60)
        logger.info("HTML VERSION:")
        logger.info(html_content[:500] + "..." if len(html_content) > 500 else html_content)
        logger.info("=" * 60)
        
        return {
            "success": True,
            "message": "Mock email sent (check console)",
            "email_content": {
                "html": html_content,
                "text": text_content
            },
            "dev_info": {
                "to": to_email,
                "reset_link": reset_link
            }
        }
    
    def _send_smtp_email(self, to_email: str, user_name: str, reset_link: str, 
                        variables: Dict, smtp_config: Optional[Dict] = None) -> Dict:
        """Gửi email qua SMTP (Gmail/Outlook)"""
        
        if not smtp_config:
            return {"success": False, "error": "SMTP configuration required"}
        
        try:
            # Load và render templates
            html_template = self.load_template("forgot_password_template", "html")
            text_template = self.load_template("forgot_password_template", "txt")
            
            html_content = self.render_template(html_template, variables)
            text_content = self.render_template(text_template, variables)
            
            # Tạo message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = "WinCloud - Đặt lại mật khẩu"
            msg['From'] = smtp_config['from_email']
            msg['To'] = to_email
            
            # Attach cả text và HTML version
            part1 = MIMEText(text_content, 'plain', 'utf-8')
            part2 = MIMEText(html_content, 'html', 'utf-8')
            
            msg.attach(part1)
            msg.attach(part2)
            
            # Gửi email
            config = self.configs.get(self.provider, self.configs["gmail"])
            
            with smtplib.SMTP(config["smtp_server"], config["smtp_port"]) as server:
                if config.get("use_tls"):
                    server.starttls()
                
                server.login(smtp_config['from_email'], smtp_config['password'])
                server.send_message(msg)
            
            logger.info(f"✅ Email sent successfully to {to_email}")
            return {
                "success": True,
                "message": f"Email sent to {to_email}",
                "provider": self.provider
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to send email: {e}")
            return {"success": False, "error": str(e)}

# Singleton instance
email_service = EmailService(provider="mock")

def send_forgot_password_email(to_email: str, user_name: str, reset_link: str) -> Dict:
    """Convenience function để gửi forgot password email"""
    return email_service.send_forgot_password_email(to_email, user_name, reset_link)

if __name__ == "__main__":
    # Test email service
    result = send_forgot_password_email(
        to_email="test@example.com",
        user_name="Test User", 
        reset_link="https://wincloud.app/reset?token=abc123"
    )
    print(f"Email result: {result}")
