"""
Simple auth router for main backend
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

# Create router
router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 1800

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    """Simple login - accepts admin@wincloud.app / admin123"""
    
    print(f"🔐 Login attempt: {request.email}")
    
    # Simple hardcoded check for testing
    if request.email == "admin@wincloud.app" and request.password == "admin123":
        print("✅ Login successful!")
        return {
            "access_token": "fake_token_for_testing_12345",
            "token_type": "bearer",
            "expires_in": 1800
        }
    else:
        print("❌ Invalid credentials")
        raise HTTPException(status_code=401, detail="Invalid email or password")

@router.get("/profile", response_model=UserResponse)
def profile():
    """Return fake profile for testing"""
    return {
        "id": "admin-123",
        "email": "admin@wincloud.app",
        "full_name": "WinCloud Administrator",
        "is_active": True,
        "is_superuser": True
    }
