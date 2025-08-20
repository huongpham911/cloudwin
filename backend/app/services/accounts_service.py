#!/usr/bin/env python3
"""
DigitalOcean Accounts Service - Get tokens from user settings
"""
import requests
from typing import List, Dict, Any, Optional
import logging
from sqlalchemy.orm import Session

from app.models.user import User
from app.core.database import get_db

logger = logging.getLogger(__name__)

class DigitalOceanAccountsService:
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
        self.tokens = self._load_user_tokens()
        
    def _load_user_tokens(self) -> List[str]:
        """Load tokens from user settings in database"""
        try:
            user = self.db.query(User).filter(User.id == self.user_id).first()
            if not user:
                logger.error(f"User {self.user_id} not found")
                return []
            
            tokens = user.digitalocean_tokens or []
            if not tokens:
                logger.warning(f"No DigitalOcean tokens found for user {self.user_id}")
                return []
            
            logger.info(f"✅ Loaded {len(tokens)} tokens for user {self.user_id}")
            for i, token in enumerate(tokens):
                logger.info(f"   Token {i+1}: {token[:20]}...")
                
            return tokens
            
        except Exception as e:
            logger.error(f"Error loading tokens for user {self.user_id}: {e}")
            return []

    async def get_accounts(self) -> List[Dict[str, Any]]:
        """Get accounts using user's tokens from settings"""
        if not self.tokens:
            raise Exception("No DigitalOcean tokens found in user settings. Please add tokens in Settings > DigitalOcean Tokens")
        
        accounts = []
        
        for account_id, token in enumerate(self.tokens):
            try:
                logger.info(f"🔄 Processing account {account_id + 1}/{len(self.tokens)}...")
                
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
                
                # Get account info
                response = requests.get("https://api.digitalocean.com/v2/account", headers=headers, timeout=10)
                response.raise_for_status()
                account_data = response.json()['account']
                
                logger.info(f"✅ Account data: {account_data.get('email', 'Unknown')} | {account_data.get('name', 'Unknown')}")
                
                # Get balance info
                try:
                    balance_response = requests.get("https://api.digitalocean.com/v2/customers/my/balance", headers=headers, timeout=10)
                    balance_response.raise_for_status()
                    balance_data = balance_response.json()
                except Exception as e:
                    logger.warning(f"⚠️ Error getting balance for account {account_id}: {e}")
                    balance_data = {
                        'account_balance': '0.00',
                        'month_to_date_usage': '0.00',
                        'month_to_date_balance': '0.00',
                        'generated_at': ''
                    }
                
                logger.info(f"✅ Balance: ${balance_data.get('account_balance', '0.00')} | MTD: ${balance_data.get('month_to_date_usage', '0.00')}")
                
                # Credits calculation logic (same as test_server_simple.py)
                email = account_data.get('email', '').lower()
                account_status = account_data.get('status', 'unknown')
                mtd_usage = float(balance_data.get('month_to_date_usage', '0.00'))
                account_balance = float(balance_data.get('account_balance', '0.00'))
                status_details = ""
                credits_info = {
                    'total_credits': '0.00',
                    'used_credits': '0.00',
                    'remaining_credits': '0.00',
                    'credits_expire_date': None,
                    'estimated': False
                }
                
                # Dynamic credits detection based on account patterns
                if any(domain in email for domain in ['.edu', 'student', 'school', 'university']):
                    # Education account
                    credits_info = {
                        'total_credits': '200.00',
                        'used_credits': f'{mtd_usage:.2f}',
                        'remaining_credits': f'{200.00 - mtd_usage:.2f}',
                        'credits_expire_date': None,
                        'estimated': True
                    }
                    status_details = " (Education Credits - Estimated)"
                    logger.info(f"🎓 Education account detected for {email}: Estimated $200.00 credits")
                    
                elif account_status == 'active' and mtd_usage == 0.00 and account_balance == 0.00:
                    if 'gmail.com' in email or 'outlook.com' in email or 'yahoo.com' in email:
                        # Promotional credits for personal accounts
                        credits_info = {
                            'total_credits': '100.00',
                            'used_credits': f'{mtd_usage:.2f}',
                            'remaining_credits': f'{100.00 - mtd_usage:.2f}',
                            'credits_expire_date': None,
                            'estimated': True
                        }
                        status_details = " (Promotional Credits - Estimated)"
                        logger.info(f"💳 Promotional credits estimated for {email}: $100.00")
                    else:
                        status_details = " (Credits Available)"
                        logger.info(f"💰 Account {email} appears to have credits (zero usage/balance)")
                else:
                    # Regular account or account with usage
                    logger.info(f"📊 Regular account {email}: Balance ${account_balance}, Usage ${mtd_usage}")
                
                # Add credits info to status
                if float(credits_info.get('total_credits', '0.00')) > 0:
                    remaining = float(credits_info['remaining_credits'])
                    if remaining > 0:
                        if not status_details:
                            if credits_info.get('estimated'):
                                status_details = f" (Est. ${remaining:.2f} credits remaining)"
                            else:
                                status_details = f" (${remaining:.2f} credits remaining)"
                    else:
                        status_details = " (credits exhausted)"
                
                final_status = account_status + status_details
                
                # Mask token - chỉ hiển thị 10 ký tự cuối
                def mask_token_last_10(token: str) -> str:
                    """Mask token để chỉ hiển thị 10 ký tự cuối"""
                    if not token or len(token) < 20:
                        return token
                    return f"***...{token[-10:]}"
                
                # Build account info
                account_info = {
                    'account_id': account_id,
                    'index': account_id,
                    'id': account_id,  # Add id field for frontend compatibility
                    'email': account_data.get('email', 'Unknown'),
                    'uuid': account_data.get('uuid', ''),
                    'email_verified': account_data.get('email_verified', False),
                    'status': final_status,
                    'status_message': account_data.get('status_message', ''),
                    'droplet_limit': account_data.get('droplet_limit', 0),
                    'floating_ip_limit': account_data.get('floating_ip_limit', 0),
                    'volume_limit': account_data.get('volume_limit', 0),
                    'team': account_data.get('team'),
                    'name': account_data.get('name', ''),
                    'account_name': f"Account {account_id + 1}",
                    'masked_token': mask_token_last_10(token),  # Add masked token
                    'account_balance': balance_data.get('account_balance', '0.00'),
                    'month_to_date_balance': balance_data.get('month_to_date_balance', '0.00'),
                    'month_to_date_usage': balance_data.get('month_to_date_usage', '0.00'),
                    'generated_at': balance_data.get('generated_at', ''),
                    'credits_info': credits_info
                }
                
                # Fix name if empty
                if not account_info['name'] and account_info['email'] != 'Unknown':
                    account_info['name'] = account_info['email'].split('@')[0].title()
                elif not account_info['name']:
                    account_info['name'] = f"Account {account_id + 1}"
                
                logger.info(f"✅ Final account: {account_info['name']} | {account_info['status']} | Credits: ${credits_info['remaining_credits']}")
                accounts.append(account_info)
                
            except Exception as e:
                logger.error(f"❌ Failed to get account info for token {account_id + 1}: {e}")
                accounts.append({
                    "account_id": account_id,
                    "index": account_id,
                    "email": "Error loading account",
                    "name": f"Account {account_id + 1} (Error)",
                    "account_name": f"Account {account_id + 1}",
                    "status": "error",
                    "error": str(e),
                    "account_balance": "0.00",
                    "month_to_date_usage": "0.00",
                    "month_to_date_balance": "0.00"
                })
        
        logger.info(f"📊 Returning {len(accounts)} accounts for user {self.user_id}")
        return accounts