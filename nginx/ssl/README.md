# SSL Certificates for WinCloud Builder

This directory contains SSL certificates for HTTPS.

## CloudFlare Origin Certificates

Place your CloudFlare Origin certificates here:
- `wincloud.app.pem` - Certificate file
- `wincloud.app.key` - Private key file

## Generate Self-Signed Certificate (for testing)

```bash
# Generate self-signed certificate for testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout wincloud.app.key \
  -out wincloud.app.pem \
  -subj "/C=US/ST=State/L=City/O=WinCloud/CN=wincloud.app"
```

## Security
- Keep private keys secure
- Set proper file permissions: `chmod 600 *.key`
- Use CloudFlare Origin certificates for production

## File Structure
```
ssl/
├── wincloud.app.pem     # Certificate for wincloud.app
├── wincloud.app.key     # Private key for wincloud.app  
└── README.md           # This file
```
