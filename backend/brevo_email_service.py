#!/usr/bin/env python3
"""
Brevo (SendinBlue) Email Service for WinCloud Builder
Real email sending with professional templates
"""
import os
import logging
from typing import Dict, Optional
from datetime import datetime

try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
    BREVO_AVAILABLE = True
except ImportError:
    BREVO_AVAILABLE = False

logger = logging.getLogger(__name__)

class BrevoEmailService:
    """Brevo Email Service cho WinCloud Builder"""
    
    def __init__(self, api_key: str):
        """
        Initialize Brevo email service
        
        Args:
            api_key: Brevo API key
        """
        self.api_key = api_key
        self.templates_dir = os.path.join(os.path.dirname(__file__), "email_templates")
        
        if not BREVO_AVAILABLE:
            logger.error("Brevo SDK not installed. Run: pip install sib-api-v3-sdk")
            raise ImportError("Please install: pip install sib-api-v3-sdk")
        
        # Configure Brevo API key
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = self.api_key
        
        # Create API instances
        api_client = sib_api_v3_sdk.ApiClient(configuration)
        self.api_instance = sib_api_v3_sdk.TransactionalEmailsApi(api_client)
        self.account_api = sib_api_v3_sdk.AccountApi(api_client)
        
        logger.info("✅ Brevo Email Service initialized")
    
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
                    <p style="color: #e0e7ff; margin: 5px 0 0 0;">Windows Cloud Solutions</p>
                </div>
                <div style="padding: 30px;">
                    <h2>Xin chào {{user_name}}!</h2>
                    <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản WinCloud.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{reset_link}}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                            🔑 Đặt lại mật khẩu
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;"><strong>Liên kết này sẽ hết hạn sau 15 phút.</strong></p>
                    <p style="color: #6b7280; font-size: 14px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                </div>
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        <strong>WinCloud Builder</strong> - Giải pháp Windows trên Cloud
                    </p>
                    <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                        © 2025 WinCloud Builder. All rights reserved.
                    </p>
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

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ WinCloud Builder

© 2025 WinCloud Builder - Windows Cloud Solutions
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
                                 reset_link: str) -> Dict:
        """
        Gửi email forgot password qua Brevo
        
        Args:
            to_email: Email người nhận
            user_name: Tên người dùng
            reset_link: Link reset password
        
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
            
            # Load và render templates
            html_template = self.load_template("forgot_password_template", "html")
            text_template = self.load_template("forgot_password_template", "txt")
            
            html_content = self.render_template(html_template, variables)
            text_content = self.render_template(text_template, variables)
            
            # Tạo Brevo email object
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": to_email, "name": user_name}],
                sender={"email": "noreply@wincloud.app", "name": "WinCloud Builder"},
                subject="WinCloud - Đặt lại mật khẩu",
                html_content=html_content,
                text_content=text_content,
                headers={
                    "X-Mailer": "WinCloud Builder",
                    "X-Priority": "1"
                },
                tags=["password-reset", "wincloud"]
            )
            
            # Gửi email qua Brevo
            logger.info(f"📧 Sending password reset email to {to_email} via Brevo...")
            
            api_response = self.api_instance.send_transac_email(send_smtp_email)
            
            logger.info(f"✅ Email sent successfully via Brevo!")
            logger.info(f"📧 Message ID: {api_response.message_id}")
            
            return {
                "success": True,
                "message": f"Password reset email sent to {to_email}",
                "provider": "brevo",
                "message_id": api_response.message_id,
                "email_content": {
                    "html": html_content[:200] + "..." if len(html_content) > 200 else html_content,
                    "text": text_content[:200] + "..." if len(text_content) > 200 else text_content
                }
            }
            
        except ApiException as e:
            error_msg = f"Brevo API Error: {e}"
            logger.error(f"❌ {error_msg}")
            
            # Parse Brevo error
            if hasattr(e, 'body'):
                try:
                    import json
                    error_body = json.loads(e.body)
                    error_msg = f"Brevo Error: {error_body.get('message', str(e))}"
                except:
                    pass
            
            return {
                "success": False,
                "error": error_msg,
                "provider": "brevo"
            }
            
        except Exception as e:
            error_msg = f"Email sending failed: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "provider": "brevo"
            }
    
    def test_connection(self) -> Dict:
        """Test Brevo connection và API key"""
        try:
            # Test bằng cách lấy account info
            account_info = self.account_api.get_account()
            
            logger.info(f"✅ Brevo connection successful!")
            logger.info(f"📧 Account: {account_info.email}")
            logger.info(f"🏢 Company: {account_info.company_name}")
            
            return {
                "success": True,
                "account_email": account_info.email,
                "company_name": account_info.company_name,
                "plan": getattr(account_info, 'plan', [])
            }
            
        except ApiException as e:
            error_msg = f"Brevo connection failed: {e}"
            logger.error(f"❌ {error_msg}")
            return {"success": False, "error": error_msg}
        except Exception as e:
            error_msg = f"Connection test failed: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {"success": False, "error": error_msg}

# Initialize Brevo service with WinCloud API key
BREVO_API_KEY = "YOUR_BREVO_API_KEY_HERE"

try:
    brevo_email_service = BrevoEmailService(BREVO_API_KEY)
except ImportError as e:
    logger.warning(f"Brevo not available: {e}")
    brevo_email_service = None

def send_forgot_password_email_brevo(to_email: str, user_name: str, reset_link: str) -> Dict:
    """Convenience function để gửi forgot password email qua Brevo"""
    if brevo_email_service is None:
        return {
            "success": False,
            "error": "Brevo service not available. Install: pip install sib-api-v3-sdk"
        }
    
    return brevo_email_service.send_forgot_password_email(to_email, user_name, reset_link)

if __name__ == "__main__":
    # Test Brevo email service
    if brevo_email_service:
        # Test connection
        print("🧪 Testing Brevo connection...")
        connection_result = brevo_email_service.test_connection()
        print(f"Connection test: {connection_result}")
        
        if connection_result.get("success"):
            # Test email sending
            print("\n📧 Testing email sending...")
            email_result = send_forgot_password_email_brevo(
                to_email="test@wincloud.app",
                user_name="Test User", 
                reset_link="https://wincloud.app/auth/reset-password?token=test123"
            )
            print(f"Email test: {email_result}")
    else:
        print("❌ Brevo service not available")
