from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging
from datetime import datetime
from app.services.email_service import send_contact_email

router = APIRouter()
logger = logging.getLogger(__name__)

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    subject: str
    message: str
    source: str = "website_contact_form"
    recipient: str = "support@wincloud.app"

class ContactResponse(BaseModel):
    success: bool
    message: str
    contact_id: Optional[str] = None

@router.post("/contact", response_model=ContactResponse)
async def send_contact_form(
    data: ContactRequest,
    background_tasks: BackgroundTasks
):
    """
    Submit contact form and send email to support team
    """
    try:
        logger.info(f"Contact form submission from {data.email}")
        
        # Prepare email content for support team
        email_subject = f"[WinCloud Contact] {data.subject}"
        
        email_body = f"""
Có liên hệ mới từ website WinCloud:

Thông tin khách hàng:
- Họ tên: {data.name}
- Email: {data.email}
- Điện thoại: {data.phone or 'Không cung cấp'}
- Chủ đề: {data.subject}

Nội dung tin nhắn:
{data.message}

---
Nguồn: {data.source}
Thời gian: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
        """
        
        # Send email to support team in background
        background_tasks.add_task(
            send_contact_email,
            to_email=data.recipient,
            subject=email_subject,
            body=email_body,
            from_name=data.name,
            from_email=data.email
        )
        
        # Auto-reply to customer
        auto_reply_subject = "Xác nhận đã nhận tin nhắn - WinCloud"
        auto_reply_body = f"""
Chào {data.name},

Cảm ơn bạn đã liên hệ với WinCloud! Chúng tôi đã nhận được tin nhắn của bạn với nội dung:

Chủ đề: {data.subject}

Đội ngũ hỗ trợ của chúng tôi sẽ phản hồi bạn trong vòng 24 giờ qua email: {data.email}

Nếu có vấn đề khẩn cấp, bạn có thể liên hệ trực tiếp:
- Email: support@wincloud.app
- Hotline: 1900 1234 (24/7)

Trân trọng,
Đội ngũ WinCloud Support
        """
        
        background_tasks.add_task(
            send_contact_email,
            to_email=data.email,
            subject=auto_reply_subject,
            body=auto_reply_body,
            from_name="WinCloud Support",
            from_email="support@wincloud.app"
        )
        
        return ContactResponse(
            success=True,
            message="Tin nhắn đã được gửi thành công! Chúng tôi sẽ phản hồi trong vòng 24h.",
            contact_id=f"contact_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{data.email.split('@')[0]}"
        )
        
    except Exception as e:
        logger.error(f"Error processing contact form: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Có lỗi xảy ra khi xử lý tin nhắn. Vui lòng thử lại sau."
        )
