# Windows 11 Configuration Guide

## Overview
This guide provides configurations necessary for supporting Windows 11 builds on DigitalOcean using QEMU/KVM. Ensure you have the proper Windows 11 ISOs available for download and configured in your environment.

## Environment Variables
Add the following variables to your `.env` file, substituting your actual storage URLs where necessary:

```
# Windows 11 ISO URLs (you need to provide your own)
WIN11_PRO_ISO_URL=https://your-storage.com/win11-pro.iso
WIN11_LTSC_ISO_URL=https://your-storage.com/win11-ltsc.iso
TINY11_ISO_URL=https://your-storage.com/tiny11.iso

# Windows 10 ISO URLs
WIN10_LTSC_ISO_URL=https://your-storage.com/win10-ltsc.iso
TINY10_ISO_URL=https://your-storage.com/tiny10.iso

# Windows Server ISO URLs
WIN_SERVER_2022_ISO_URL=https://your-storage.com/winserver2022.iso

# Alternative: Use TinyInstaller (recommended for some versions)
USE_TINYINSTALLER=false
TINYINSTALLER_URL=https://raw.githubusercontent.com/TinyInstaller/TinyInstaller/main/tinyinstaller.sh

# DigitalOcean SSH Key ID (get from DO dashboard)
DO_SSH_KEY_ID=12345678

# Optional: Custom VirtIO driver URL (defaults to latest stable)
# VIRTIO_WIN_ISO_URL=https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/stable-virtio/virtio-win.iso
```

## Windows 11 Build Configuration
For Windows 11, additional configurations may apply within the `WindowsBuilderService`:
- **CPU Arguments**: Ensures compatibility with TPM and Windows 11 requirements
- **TPM Bypass**: Enabled for Windows 11 to simplify virtualization configuration

## Test Your Configuration
To ensure Windows 11 is correctly supported:
1. Validate ISO URLs point to valid ISO files.
2. Deploy a Windows 11 droplet using the API endpoint:
    ```bash
    curl -X POST https://your-api-url/api/v1/windows/build \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "my-windows-11",
        "template_id": "win11-pro",
        "region": "sgp1", 
        "username": "Administrator",
        "password": "YourSecurePassword!"
    }'
    ```
3. Monitor the droplet to ensure successful build.

## Additional Notes
- Make sure your DigitalOcean account is set up with appropriate billing and permissions.
- Ensure the `.env` is sourced when running the application.
- Verify network and firewall settings to ensure RDP connections are possible.

By following this guide, you should have a comprehensive setup for deploying Windows 11 on DigitalOcean seamlessly!
