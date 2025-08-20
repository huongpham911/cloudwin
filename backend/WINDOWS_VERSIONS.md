# Supported Windows Versions

## Overview
WinCloud Builder supports various Windows versions optimized for cloud deployment. Each version has specific requirements and features tailored for different use cases.

## Windows 11 Editions

### 1. Windows 11 Pro
- **Template ID**: `win11-pro`
- **Minimum RAM**: 8GB
- **Minimum Disk**: 64GB
- **Features**: 
  - Full Windows 11 Professional features
  - TPM bypass enabled for virtualization
  - Hyper-V compatible CPU flags
  - Optimized for development and professional use
- **Build Time**: ~20 minutes

### 2. Windows 11 LTSC
- **Template ID**: `win11-ltsc`
- **Minimum RAM**: 4GB
- **Minimum Disk**: 32GB
- **Features**:
  - Long-Term Servicing Channel
  - No bloatware or Microsoft Store
  - TPM bypass enabled
  - Ideal for server workloads
- **Build Time**: ~18 minutes

### 3. Tiny11
- **Template ID**: `tiny11`
- **Minimum RAM**: 2GB
- **Minimum Disk**: 20GB
- **Features**:
  - Ultra-lightweight Windows 11
  - Stripped down version
  - TPM bypass enabled
  - Perfect for minimal resource VPS
- **Build Time**: ~12 minutes

## Windows 10 Editions

### 4. Windows 10 LTSC
- **Template ID**: `win10-ltsc`
- **Minimum RAM**: 4GB
- **Minimum Disk**: 30GB
- **Features**:
  - Long-Term Servicing Channel
  - Stable and lightweight
  - No feature updates
  - Best for production servers
- **Build Time**: ~15 minutes

### 5. Tiny10
- **Template ID**: `tiny10`
- **Minimum RAM**: 2GB
- **Minimum Disk**: 20GB
- **Features**:
  - Minimal Windows 10
  - Reduced footprint
  - Fast boot times
  - Ideal for low-spec VPS
- **Build Time**: ~10 minutes

## Windows Server Editions

### 6. Windows Server 2022
- **Template ID**: `win-server-2022`
- **Minimum RAM**: 8GB
- **Minimum Disk**: 40GB
- **Features**:
  - Full server capabilities
  - Active Directory support
  - IIS, SQL Server compatible
  - Enterprise features
- **Build Time**: ~20 minutes

## Technical Specifications

### QEMU/KVM Settings

#### Windows 11 Specific
```bash
-cpu host,hv-relaxed,hv-vapic,hv-spinlocks=0x1fff,hv-vpindex,hv-runtime,hv-synic,hv-stimer,hv-reset,hv-vendor-id=KVM,kvm=off
-machine type=pc-q35-6.2,smm=off
-global driver=cfi.pflash01,property=secure,value=off
```

#### Windows 10/Server
```bash
-cpu host
-machine pc
```

### Network Configuration
All versions use VirtIO network drivers for optimal performance:
```bash
-netdev user,id=net0,hostfwd=tcp::3389-:3389
-device virtio-net,netdev=net0
```

### Storage Configuration
VirtIO storage drivers for all versions:
```bash
-drive file=windows.qcow2,format=qcow2,if=virtio
```

## Recommended Droplet Sizes

| Windows Version | Droplet Size | vCPUs | RAM | Storage | Monthly Cost |
|----------------|--------------|-------|-----|---------|--------------|
| Win11 Pro | s-4vcpu-8gb | 4 | 8GB | 160GB | ~$48 |
| Win11 LTSC | s-2vcpu-4gb | 2 | 4GB | 80GB | ~$24 |
| Tiny11 | s-1vcpu-2gb | 1 | 2GB | 50GB | ~$12 |
| Win10 LTSC | s-2vcpu-4gb | 2 | 4GB | 80GB | ~$24 |
| Tiny10 | s-1vcpu-2gb | 1 | 2GB | 50GB | ~$12 |
| Server 2022 | s-4vcpu-8gb | 4 | 8GB | 160GB | ~$48 |

## ISO Requirements

### Official ISOs
- Download from Microsoft Volume Licensing Service Center (VLSC)
- Microsoft Evaluation Center for trial versions
- MSDN subscriptions

### Community ISOs
- Tiny10/Tiny11 from trusted sources
- Ghost Spectre editions
- Always verify checksums

### Storage Options
1. **DigitalOcean Spaces**: Upload ISOs to Spaces and use private URLs
2. **External Storage**: Any HTTP(S) accessible storage
3. **Local Cache**: Store frequently used ISOs on build servers

## Security Considerations

1. **Passwords**: Always use strong passwords (min 8 chars, special characters)
2. **RDP Security**: Consider changing default RDP port (3389)
3. **Firewall**: Windows Firewall is enabled by default
4. **Updates**: LTSC versions receive security updates only
5. **Licensing**: Ensure proper Windows licensing compliance

## Performance Tips

1. **SSD Storage**: Always use SSD-backed droplets
2. **Region Selection**: Choose region closest to users
3. **Resource Monitoring**: Monitor CPU/RAM usage
4. **Optimization**: Disable unnecessary Windows services
5. **Caching**: Use local ISO cache for faster builds

## Troubleshooting

### Common Issues
1. **Build Timeout**: Increase wait time for slower regions
2. **RDP Connection**: Ensure firewall allows port 3389
3. **Network Issues**: Verify VirtIO drivers installed
4. **Performance**: Check if TPM bypass is properly configured
5. **Storage Full**: Monitor disk usage during builds

### Debug Commands
```bash
# Check QEMU process
ps aux | grep qemu

# View VM logs
tail -f /var/log/windows-vm.log

# Check network
netstat -tlnp | grep 3389

# Monitor build progress
tail -f /root/winbuild/build.log
```
