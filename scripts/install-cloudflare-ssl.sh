#!/bin/bash

# 🔐 Install CloudFlare Origin SSL Certificate for WinCloud
# Domains: *.wincloud.app, wincloud.app

set -e

echo "🔐 Installing CloudFlare Origin SSL Certificate..."
echo "Domains: *.wincloud.app, wincloud.app"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_error "This script needs to be run with sudo"
    echo "Usage: sudo ./install-cloudflare-ssl.sh"
    exit 1
fi

# 1. Create SSL directories
echo "📁 Creating SSL directories..."
mkdir -p /etc/ssl/certs /etc/ssl/private
chmod 755 /etc/ssl/certs
chmod 700 /etc/ssl/private
print_status "SSL directories created"

# 2. Install Origin Certificate
echo "📜 Installing Origin Certificate..."
cat > /etc/ssl/certs/wincloud.app.pem << 'EOF'
-----BEGIN CERTIFICATE-----
MIIEpDCCA4ygAwIBAgIUayWfEzQ9PqCU/xVV5l+iu2f1SGcwDQYJKoZIhvcNAQEL
BQAwgYsxCzAJBgNVBAYTAlVTMRkwFwYDVQQKExBDbG91ZEZsYXJlLCBJbmMuMTQw
MgYDVQQLEytDbG91ZEZsYXJlIE9yaWdpbiBTU0wgQ2VydGlmaWNhdGUgQXV0aG9y
aXR5MRYwFAYDVQQHEw1TYW4gRnJhbmNpc2NvMRMwEQYDVQQIEwpDYWxpZm9ybmlh
MB4XDTI1MDgwOTA3NDkwMFoXDTQwMDgwNTA3NDkwMFowYjEZMBcGA1UEChMQQ2xv
dWRGbGFyZSwgSW5jLjEdMBsGA1UECxMUQ2xvdWRGbGFyZSBPcmlnaW4gQ0ExJjAk
BgNVBAMTHUNsb3VkRmxhcmUgT3JpZ2luIENlcnRpZmljYXRlMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuU80HvixmGsp7H/uq9h+nCrDV7MKyv4LFLnJ
4BxewHhUyA6ILaWxPrLl3gNAwgpBMGDbAWzcrabuLxKTeQZp2lA9PYb4/ZSjxVj4
TSQLrtEqaMfChhWoD91yLwra1sgu2Iqj/skmFtOceSIstVMi5kMRszHHWsCRgD/t
cQDE2R0hNZaspsozCr3WRf2iB3IJmHHwHujGnxg3yUOVCoGPl7bfSwUe32W/Xolf
dlH68w+JYVQjxzDIz0Uw5b52xMn7g+IjM/i89k6pmsphQCRmLAlr2+25De3yu7h8
Hd1eDN+dD0fZTcr/AxIbwZpaY6WVkEDFNQD+ap3fRt24U6RYKwIDAQABo4IBJjCC
ASIwDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcD
ATAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBS5IpW+Lya3Bm9CKuyEid/Oujod6zAf
BgNVHSMEGDAWgBQk6FNXXXw0QIep65TbuuEWePwppDBABggrBgEFBQcBAQQ0MDIw
MAYIKwYBBQUHMAGGJGh0dHA6Ly9vY3NwLmNsb3VkZmxhcmUuY29tL29yaWdpbl9j
YTAnBgNVHREEIDAegg4qLndpbmNsb3VkLmFwcIIMd2luY2xvdWQuYXBwMDgGA1Ud
HwQxMC8wLaAroCmGJ2h0dHA6Ly9jcmwuY2xvdWRmbGFyZS5jb20vb3JpZ2luX2Nh
LmNybDANBgkqhkiG9w0BAQsFAAOCAQEAJmuWCh9wGnVzfrS/2b0vyB6dDt3HdZ3p
pM5cTesEat7bhR7uMwgBW8s1dVIxFsBafQ17apSyhAvjfOyDe82/uBV9AY7Uo2jJ
bdEMwj3tjWj7hdeqsB1xOpWtx0436AVBGUd1IIzjeEvXYWhG/q7GWik6atUpS/0g
ya0Ns2UwP4o0YkPqVqNQenAOnOkM75UMlQgh4ZyUeUqHl3GO3J+tG1vO3oILVl6U
IhpZf6EjvU5cTXKKdqgkKJnzcX3/WfN44xCvtiCyTwKtvy2W4mGU67thtK2dkxG1
53OSk5yQWrT99NlGHlPrN5yCoaOOGe9ii23LNwkl9bsBhu+Mh2TKdg==
-----END CERTIFICATE-----
EOF

chmod 644 /etc/ssl/certs/wincloud.app.pem
print_status "Origin Certificate installed"

# 3. Install Private Key
echo "🔑 Installing Private Key..."
cat > /etc/ssl/private/wincloud.app.key << 'EOF'
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5TzQe+LGYayns
f+6r2H6cKsNXswrK/gsUucngHF7AeFTIDogtpbE+suXeA0DCCkEwYNsBbNytpu4v
EpN5BmnaUD09hvj9lKPFWPhNJAuu0Spox8KGFagP3XIvCtrWyC7YiqP+ySYW05x5
Iiy1UyLmQxGzMcdawJGAP+1xAMTZHSE1lqymyjMKvdZF/aIHcgmYcfAe6MafGDfJ
Q5UKgY+Xtt9LBR7fZb9eiV92UfrzD4lhVCPHMMjPRTDlvnbEyfuD4iMz+Lz2Tqma
ymFAJGYsCWvb7bkN7fK7uHwd3V4M350PR9lNyv8DEhvBmlpjpZWQQMU1AP5qnd9G
3bhTpFgrAgMBAAECggEAQuFQGWF+j1kV/3JIzKLNR0WzzOIkohDAJRHMx2LV27dS
OgXspjTn3I4qok8gPyf+URyTzlbg6peV3U1iBksHRzCweZVOJg9QcDhlHUpGISkC
mmCGV2hXiKpOvKW5R81mAuc+uwUUBycGkT2BT0wbC2nnaHotzhY0LUplQuSZJxZc
Hu74GkTcRhW+LNAeOKaRBoTd8pd33u4NF987FNdh83vByXYfQ3sIAmMJR29CRmDE
cP9XqclSQT0gLdTnm4ngpBFZBqtsa2i/9Esaa+zPy5DFk0MtV/GznTbb5pcgjDgD
Alaxm3BudhKdvERYA3DQOqoQ+fl+6SMNmXpwQlTKUQKBgQDZ7madp3kwmKF9jnLT
HRooeC8HHDnBdTVaattjp+dnScNVAT0DoTnCB9d3b0mlIanVd+IqoRmP34/YS9gL
5dfyZfLkS9nHK7QuxrgIU4DiAMqHXfKGqTEukoFbnqi2qTmSr/Kn1VVOMYHpy7rK
25iXu6UnHniXWCLJgrD339ftUwKBgQDZrf7xVt2FSZPtwa4qyOmxQRmX2oDuIK0x
RUs1ggyai1fpQk3JQD8m8DXEt54Fxhu3uWSLnfqbBUDPB092U+q01m/bMV3+QcZ7
mKxwjQ6U+SOgpDNRtB0mtOpbacwUPqjqwRGt073knN1P65Gb+vvRmhhAAH3lA6zU
wbew/9a2yQKBgA5CSvSFwKgtVGOirmChxtRfCLSuZBkEUjlYRIKAueNIMD+flR5n
rh/D45Us8uSbD0GoVmPzpniDaCX+0GP25eo2QW4uiFE/yspEtkXVMNmYs6envfaR
m2Ywr8YO23sYF2xBlt7kVnCHTLi/W7lqJNHItUWZ+MnuOlh09J9DRh2BAoGBAMgL
wzN/pOyNBcmGKM1g/oLLVP3c7Ifqt7+D8u4lqfeM/yl6qYm95UufjYpPRIYB3g8l
7WTxthEo7rpT+Y7A5/1w5DMIV10GjaWgVTjKKRB3NWq3/AGmCPQ9ZvLDc61XOF0l
OV4KLYUfM7PyxUoXibzCZG7NBOWmTvrnXCzpsSUhAoGBANCC0EACpzsk+QqJczSQ
WHO8FfUp1NPTX9Uw6AqR+bOPkGH9KQ5BdbishG0/6xA73UtXA14mi7HYq7ivDoY6
1UzhJVAeHC7zqtZz87qN84/Z7RSvDgPFl3qxA5y1IilC48msfm3/L8xrZ/xm0nOQ
686TrOMY28JVQI0Mn3XVII1b
-----END PRIVATE KEY-----
EOF

chmod 600 /etc/ssl/private/wincloud.app.key
print_status "Private Key installed with secure permissions"

# 4. Verify certificate installation
echo "🔍 Verifying certificate installation..."

# Check if files exist
if [ -f /etc/ssl/certs/wincloud.app.pem ] && [ -f /etc/ssl/private/wincloud.app.key ]; then
    print_status "Certificate files exist"
else
    print_error "Certificate files missing"
    exit 1
fi

# Check file permissions
cert_perms=$(stat -c "%a" /etc/ssl/certs/wincloud.app.pem)
key_perms=$(stat -c "%a" /etc/ssl/private/wincloud.app.key)

if [ "$cert_perms" = "644" ]; then
    print_status "Certificate permissions correct (644)"
else
    print_warning "Certificate permissions: $cert_perms (should be 644)"
fi

if [ "$key_perms" = "600" ]; then
    print_status "Private key permissions correct (600)"
else
    print_warning "Private key permissions: $key_perms (should be 600)"
fi

# 5. Verify certificate details
echo "📋 Certificate Details:"
echo "────────────────────────────────────────"

# Extract certificate info
cert_subject=$(openssl x509 -in /etc/ssl/certs/wincloud.app.pem -noout -subject 2>/dev/null | sed 's/subject=//')
cert_issuer=$(openssl x509 -in /etc/ssl/certs/wincloud.app.pem -noout -issuer 2>/dev/null | sed 's/issuer=//')
cert_dates=$(openssl x509 -in /etc/ssl/certs/wincloud.app.pem -noout -dates 2>/dev/null)
cert_san=$(openssl x509 -in /etc/ssl/certs/wincloud.app.pem -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/^[[:space:]]*//')

echo "Subject: $cert_subject"
echo "Issuer: $cert_issuer"
echo "Validity: $cert_dates"
echo "SANs: $cert_san"

# Check if certificate is valid
if openssl x509 -in /etc/ssl/certs/wincloud.app.pem -noout -checkend 86400 >/dev/null 2>&1; then
    print_status "Certificate is valid (not expiring within 24 hours)"
else
    print_warning "Certificate expires within 24 hours or is invalid"
fi

# Check if certificate matches domains
if openssl x509 -in /etc/ssl/certs/wincloud.app.pem -noout -text 2>/dev/null | grep -q "wincloud.app"; then
    print_status "Certificate is for wincloud.app domains"
else
    print_warning "Certificate might not be for wincloud.app"
fi

# 6. Test certificate and key pair
echo "🔐 Testing certificate and key pair..."
cert_modulus=$(openssl x509 -noout -modulus -in /etc/ssl/certs/wincloud.app.pem 2>/dev/null | openssl md5)
key_modulus=$(openssl rsa -noout -modulus -in /etc/ssl/private/wincloud.app.key 2>/dev/null | openssl md5)

if [ "$cert_modulus" = "$key_modulus" ]; then
    print_status "Certificate and private key match"
else
    print_error "Certificate and private key do not match!"
    exit 1
fi

# 7. Set proper ownership
echo "👤 Setting proper ownership..."
chown root:root /etc/ssl/certs/wincloud.app.pem
chown root:root /etc/ssl/private/wincloud.app.key
print_status "Ownership set to root:root"

# 8. Test Nginx configuration (if nginx is installed)
if command -v nginx >/dev/null 2>&1; then
    echo "🌐 Testing Nginx configuration..."
    if nginx -t 2>/dev/null; then
        print_status "Nginx configuration is valid"
        
        # Reload nginx if it's running
        if systemctl is-active --quiet nginx; then
            echo "🔄 Reloading Nginx..."
            systemctl reload nginx
            print_status "Nginx reloaded successfully"
        else
            print_warning "Nginx is not running"
        fi
    else
        print_warning "Nginx configuration has errors (certificate installed but nginx needs fixing)"
    fi
else
    print_warning "Nginx not installed yet"
fi

# 9. Security recommendations
echo ""
echo "🛡️ Security Recommendations:"
echo "────────────────────────────────────────"
echo "✅ Certificate installed securely"
echo "✅ Private key permissions set to 600"
echo "✅ Files owned by root"
echo "✅ Certificate and key pair verified"
echo ""
echo "📋 Next Steps:"
echo "1. Ensure CloudFlare DNS is configured"
echo "2. Test HTTPS connections to your domains"
echo "3. Configure nginx if not already done"
echo "4. Start your applications"

# 10. Quick test commands
echo ""
echo "🧪 Test Commands:"
echo "────────────────────────────────────────"
echo "# Test certificate locally:"
echo "openssl s_client -connect localhost:443 -servername wincloud.app"
echo ""
echo "# Test domains (after DNS setup):"
echo "curl -I https://wincloud.app"
echo "curl -I https://panel.wincloud.app"
echo "curl -I https://api.wincloud.app"
echo ""
echo "# Check certificate expiration:"
echo "openssl x509 -in /etc/ssl/certs/wincloud.app.pem -noout -dates"

echo ""
echo "🎉 CloudFlare Origin SSL Certificate Installation Complete!"
echo "=================================="
print_status "Certificate valid until: August 5, 2040"
print_status "Domains covered: *.wincloud.app, wincloud.app"
print_status "Ready for HTTPS traffic! 🚀"

# 11. Create a quick verification script
cat > /root/verify-ssl.sh << 'VERIFY_EOF'
#!/bin/bash
echo "🔍 SSL Certificate Verification"
echo "================================"
echo "Certificate file: $(ls -la /etc/ssl/certs/wincloud.app.pem)"
echo "Private key file: $(ls -la /etc/ssl/private/wincloud.app.key)"
echo ""
echo "Certificate validity:"
openssl x509 -in /etc/ssl/certs/wincloud.app.pem -noout -dates
echo ""
echo "Certificate domains:"
openssl x509 -in /etc/ssl/certs/wincloud.app.pem -noout -text | grep -A1 "Subject Alternative Name"
echo ""
echo "Nginx status:"
systemctl status nginx --no-pager -l | head -3
VERIFY_EOF

chmod +x /root/verify-ssl.sh
print_status "Created verification script: /root/verify-ssl.sh"

exit 0
