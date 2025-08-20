# 🔐 Credentials Setup Guide

## Required Files for Local Development

### 1. OAuth Configuration
Copy the example file and fill in your credentials:
```bash
cp backend/.env.oauth.example backend/.env.oauth
```

Then edit `backend/.env.oauth` with your real OAuth credentials:

#### Google OAuth
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins

#### Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Get App ID and App Secret

#### GitHub OAuth
1. Go to [GitHub Settings](https://github.com/settings/applications/new)
2. Create a new OAuth App
3. Get Client ID and Client Secret

### 2. Token Storage
Copy the template file:
```bash
cp backend/tokens_secure.json.template backend/tokens_secure.json
```

The app will automatically create and manage tokens in this file.

### 3. DigitalOcean Spaces Credentials
Copy the template file and fill in your credentials:
```bash
cp backend/spaces_credentials.json.example backend/spaces_credentials.json
```

### 4. Security Keys
The app will automatically generate required security keys on first run:
- `backend/master.key`
- `backend/encryption.key`
- `backend/wincloud_key`

**Note:** If you have backup files (*.backup), you can restore them:
- `backend/spaces_credentials.json.backup`
- `backend/encryption.key.backup`
- `backend/master.key.backup`
- `backend/master_token.key.backup`
- `backend/wincloud_key.backup`

## 🚨 Security Notes

- **NEVER** commit real credentials to git
- All sensitive files are already in `.gitignore`
- Use environment variables in production
- Rotate keys regularly
- Use different credentials for development/production

## 🚀 Quick Start

1. Clone the repository
2. Follow the credential setup above
3. Install dependencies:
   ```bash
   cd backend && pip install -r requirements.txt
   cd frontend && npm install
   ```
4. Run the application:
   ```bash
   # Backend
   cd backend && python app/main.py
   
   # Frontend  
   cd frontend && npm run dev
   ```

## 📝 Environment Variables

For production deployment, use environment variables instead of files:

```bash
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export FACEBOOK_APP_ID="your-facebook-app-id"
export FACEBOOK_APP_SECRET="your-facebook-app-secret"
export GITHUB_CLIENT_ID="your-github-client-id"
export GITHUB_CLIENT_SECRET="your-github-client-secret"
```
