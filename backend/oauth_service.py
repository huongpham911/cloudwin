#!/usr/bin/env python3
"""
Real OAuth Service for WinCloud Builder
Handles Google, Facebook, and GitHub OAuth authentication with user data fetching
"""
import os
import secrets
import urllib.parse
import httpx
import json
from typing import Dict, Optional
from dotenv import load_dotenv

# Load OAuth environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env.oauth'))

class OAuthService:
    """Service for handling OAuth authentication with real providers"""
    
    def __init__(self):
        # Load OAuth credentials from environment
        self.environment = os.getenv('ENVIRONMENT', 'development')
        
        # Determine base URLs based on environment
        if self.environment == 'production':
            self.base_url = 'https://api.wincloud.app'
        else:
            self.base_url = 'http://localhost:5000'
        
        # Google OAuth
        self.google_client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.google_client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        self.google_redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', f'{self.base_url}/api/v1/auth/google/callback')
        
        # Facebook OAuth
        self.facebook_app_id = os.getenv('FACEBOOK_APP_ID')
        self.facebook_app_secret = os.getenv('FACEBOOK_APP_SECRET')
        self.facebook_redirect_uri = os.getenv('FACEBOOK_REDIRECT_URI', f'{self.base_url}/api/v1/auth/facebook/callback')
        
        # GitHub OAuth
        self.github_client_id = os.getenv('GITHUB_CLIENT_ID')
        self.github_client_secret = os.getenv('GITHUB_CLIENT_SECRET')
        self.github_redirect_uri = os.getenv('GITHUB_REDIRECT_URI', f'{self.base_url}/api/v1/auth/github/callback')
        
        self.oauth_state_secret = os.getenv('OAUTH_STATE_SECRET', 'default_secret_change_this')
        
        # Store for managing OAuth states (in production, use Redis or database)
        self.oauth_states = {}
    
    def generate_state(self) -> str:
        """Generate a secure random state for OAuth CSRF protection"""
        state = secrets.token_urlsafe(32)
        self.oauth_states[state] = True
        return state
    
    def validate_state(self, state: str) -> bool:
        """Validate OAuth state parameter"""
        return state in self.oauth_states
    
    def get_google_auth_url(self) -> Dict[str, str]:
        """Get Google OAuth authorization URL"""
        if not self.google_client_id or not self.google_client_secret or self.google_client_id.strip() == "":
            return {
                "error": "Google OAuth not configured",
                "setup_required": True,
                "instructions": "Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.oauth",
                "setup_url": "https://console.developers.google.com/"
            }
        
        state = self.generate_state()
        
        params = {
            'client_id': self.google_client_id,
            'redirect_uri': self.google_redirect_uri,
            'scope': 'openid email profile',
            'response_type': 'code',
            'state': state,
            'access_type': 'offline',
            'prompt': 'consent'
        }
        
        auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(params)
        
        return {
            "auth_url": auth_url,
            "state": state,
            "provider": "google"
        }
    
    def get_facebook_auth_url(self) -> Dict[str, str]:
        """Get Facebook OAuth authorization URL"""
        if not self.facebook_app_id or not self.facebook_app_secret or self.facebook_app_id.strip() == "":
            return {
                "error": "Facebook OAuth not configured", 
                "setup_required": True,
                "instructions": "Please add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to .env.oauth",
                "setup_url": "https://developers.facebook.com/"
            }
        
        state = self.generate_state()
        
        params = {
            'client_id': self.facebook_app_id,
            'redirect_uri': self.facebook_redirect_uri,
            'scope': 'email,public_profile',
            'response_type': 'code',
            'state': state
        }
        
        auth_url = 'https://www.facebook.com/v18.0/dialog/oauth?' + urllib.parse.urlencode(params)
        
        return {
            "auth_url": auth_url,
            "state": state,
            "provider": "facebook"
        }
    
    def get_github_auth_url(self) -> Dict[str, str]:
        """Get GitHub OAuth authorization URL"""
        if not self.github_client_id or not self.github_client_secret or self.github_client_id.strip() == "":
            return {
                "error": "GitHub OAuth not configured",
                "setup_required": True, 
                "instructions": "Please add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env.oauth",
                "setup_url": "https://github.com/settings/applications/new"
            }
        
        state = self.generate_state()
        
        params = {
            'client_id': self.github_client_id,
            'redirect_uri': self.github_redirect_uri,
            'scope': 'user:email',
            'response_type': 'code',
            'state': state
        }
        
        auth_url = 'https://github.com/login/oauth/authorize?' + urllib.parse.urlencode(params)
        
        return {
            "auth_url": auth_url,
            "state": state,
            "provider": "github"
        }
    
    def get_setup_instructions(self) -> Dict[str, str]:
        """Get setup instructions for OAuth providers"""
        return {
            "google": {
                "title": "Google OAuth Setup",
                "steps": [
                    "1. Go to https://console.developers.google.com/",
                    "2. Create a new project or select existing",
                    "3. Enable Google+ API",
                    "4. Create OAuth 2.0 credentials",
                    "5. Add redirect URI: http://localhost:5000/api/v1/auth/google/callback",
                    "6. Copy Client ID and Client Secret to .env.oauth"
                ]
            },
            "facebook": {
                "title": "Facebook OAuth Setup", 
                "steps": [
                    "1. Go to https://developers.facebook.com/",
                    "2. Create a new app",
                    "3. Add Facebook Login product",
                    "4. Add redirect URI: http://localhost:5000/api/v1/auth/facebook/callback",
                    "5. Copy App ID and App Secret to .env.oauth"
                ]
            },
            "github": {
                "title": "GitHub OAuth Setup",
                "steps": [
                    "1. Go to GitHub Settings > Developer settings > OAuth Apps",
                    "2. Click 'New OAuth App'", 
                    "3. Set Authorization callback URL: http://localhost:5000/api/v1/auth/github/callback",
                    "4. Copy Client ID and Client Secret to .env.oauth"
                ]
            }
        }

    async def exchange_google_code(self, code: str) -> Dict:
        """Exchange Google authorization code for access token and get user info"""
        try:
            # Exchange code for access token
            token_data = {
                'client_id': self.google_client_id,
                'client_secret': self.google_client_secret,
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': self.google_redirect_uri,
            }
            
            async with httpx.AsyncClient() as client:
                # Get access token
                token_response = await client.post(
                    'https://oauth2.googleapis.com/token',
                    data=token_data
                )
                token_response.raise_for_status()
                token_json = token_response.json()
                
                access_token = token_json.get('access_token')
                if not access_token:
                    return {"error": "Failed to get access token"}
                
                # Get user info
                user_response = await client.get(
                    'https://www.googleapis.com/oauth2/v2/userinfo',
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                user_response.raise_for_status()
                user_data = user_response.json()
                
                # Return standardized user data
                return {
                    "success": True,
                    "provider": "google",
                    "user_data": {
                        "provider_id": user_data.get('id'),
                        "email": user_data.get('email'),
                        "username": user_data.get('email'),  # Use email as username
                        "full_name": user_data.get('name'),
                        "display_name": user_data.get('name'),
                        "avatar_url": user_data.get('picture'),
                        "provider": "google",
                        "is_verified": user_data.get('verified_email', False),
                        "provider_data": user_data  # Store full response
                    },
                    "access_token": access_token,
                    "refresh_token": token_json.get('refresh_token')
                }
                
        except Exception as e:
            return {"error": f"Google OAuth exchange failed: {str(e)}"}

    async def exchange_github_code(self, code: str) -> Dict:
        """Exchange GitHub authorization code for access token and get user info"""
        try:
            # Exchange code for access token
            token_data = {
                'client_id': self.github_client_id,
                'client_secret': self.github_client_secret,
                'code': code,
            }
            
            async with httpx.AsyncClient() as client:
                # Get access token
                token_response = await client.post(
                    'https://github.com/login/oauth/access_token',
                    data=token_data,
                    headers={'Accept': 'application/json'}
                )
                token_response.raise_for_status()
                token_json = token_response.json()
                
                access_token = token_json.get('access_token')
                if not access_token:
                    return {"error": "Failed to get access token"}
                
                # Get user info
                user_response = await client.get(
                    'https://api.github.com/user',
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                user_response.raise_for_status()
                user_data = user_response.json()
                
                # Get user email (GitHub API separate endpoint)
                email_response = await client.get(
                    'https://api.github.com/user/emails',
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                emails = []
                if email_response.status_code == 200:
                    emails = email_response.json()
                
                # Find primary email
                primary_email = None
                for email in emails:
                    if email.get('primary', False):
                        primary_email = email.get('email')
                        break
                
                if not primary_email and emails:
                    primary_email = emails[0].get('email')
                
                # Return standardized user data
                return {
                    "success": True,
                    "provider": "github",
                    "user_data": {
                        "provider_id": str(user_data.get('id')),
                        "email": primary_email,
                        "username": user_data.get('login'),
                        "full_name": user_data.get('name') or user_data.get('login'),
                        "display_name": user_data.get('name') or user_data.get('login'),
                        "avatar_url": user_data.get('avatar_url'),
                        "provider": "github",
                        "is_verified": True,  # GitHub accounts are considered verified
                        "provider_data": user_data  # Store full response
                    },
                    "access_token": access_token
                }
                
        except Exception as e:
            return {"error": f"GitHub OAuth exchange failed: {str(e)}"}

    async def exchange_facebook_code(self, code: str) -> Dict:
        """Exchange Facebook authorization code for access token and get user info"""
        try:
            # Exchange code for access token
            token_data = {
                'client_id': self.facebook_app_id,
                'client_secret': self.facebook_app_secret,
                'redirect_uri': self.facebook_redirect_uri,
                'code': code,
            }
            
            async with httpx.AsyncClient() as client:
                # Get access token
                token_response = await client.get(
                    'https://graph.facebook.com/v18.0/oauth/access_token',
                    params=token_data
                )
                token_response.raise_for_status()
                token_json = token_response.json()
                
                access_token = token_json.get('access_token')
                if not access_token:
                    return {"error": "Failed to get access token"}
                
                # Get user info
                user_response = await client.get(
                    'https://graph.facebook.com/v18.0/me',
                    params={
                        'access_token': access_token,
                        'fields': 'id,name,email,picture.type(large)'
                    }
                )
                user_response.raise_for_status()
                user_data = user_response.json()
                
                # Extract picture URL
                avatar_url = None
                if user_data.get('picture') and user_data['picture'].get('data'):
                    avatar_url = user_data['picture']['data'].get('url')
                
                # Return standardized user data
                return {
                    "success": True,
                    "provider": "facebook",
                    "user_data": {
                        "provider_id": user_data.get('id'),
                        "email": user_data.get('email'),
                        "username": user_data.get('email'),  # Use email as username
                        "full_name": user_data.get('name'),
                        "display_name": user_data.get('name'),
                        "avatar_url": avatar_url,
                        "provider": "facebook",
                        "is_verified": user_data.get('email') is not None,
                        "provider_data": user_data  # Store full response
                    },
                    "access_token": access_token
                }
                
        except Exception as e:
            return {"error": f"Facebook OAuth exchange failed: {str(e)}"}

# Global OAuth service instance
oauth_service = OAuthService()
