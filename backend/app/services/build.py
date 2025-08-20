import base64
import secrets
import string
from typing import Optional, Dict
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class WindowsBuildService:
    """Service for managing Windows builds on droplets"""
    
    @staticmethod
    def generate_password(length: int = 16) -> str:
        """Generate a secure random password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        return password
    
    @staticmethod
    def generate_cloud_init_script(
        rdp_username: str,
        rdp_password: str,
        droplet_id: str,
        webhook_url: Optional[str] = None
    ) -> str:
        """Generate cloud-init script for Windows installation"""
        
        script = f"""#!/bin/bash
# WinCloud Builder - Windows Installation Script
# This script will install Windows Server on the droplet

set -e
export DEBIAN_FRONTEND=noninteractive

# Log function
log() {{
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/wincloud-build.log
}}

# Update progress via webhook
update_progress() {{
    local progress=$1
    local status=$2
    local message=$3
    
    if [ -n "{webhook_url}" ]; then
        curl -X POST "{webhook_url}" \\
            -H "Content-Type: application/json" \\
            -d '{{"droplet_id": "{droplet_id}", "progress": '$progress', "status": "'$status'", "message": "'$message'"}}' || true
    fi
}}

log "Starting Windows installation process..."
update_progress 5 "preparing" "Preparing system for Windows installation"

# Install required packages
log "Installing required packages..."
apt-get update
apt-get install -y qemu-kvm qemu-utils virtio-win wget curl unzip

update_progress 10 "downloading" "Downloading Windows ISO"

# Create working directory
mkdir -p /opt/wincloud
cd /opt/wincloud

# Download Windows Server 2022 evaluation ISO (180 days)
# Note: In production, user should provide their own ISO
WINDOWS_ISO_URL="https://software-download.microsoft.com/download/sg/20348.169.210806-2348.fe_release_svc_refresh_SERVER_EVAL_x64FRE_en-us.iso"
if [ ! -f "windows.iso" ]; then
    log "Downloading Windows ISO..."
    wget -O windows.iso "$WINDOWS_ISO_URL" || {{
        log "Failed to download Windows ISO"
        update_progress 0 "error" "Failed to download Windows ISO"
        exit 1
    }}
fi

update_progress 30 "downloading" "Downloading VirtIO drivers"

# Download VirtIO drivers
VIRTIO_URL="https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/archive-virtio/virtio-win-0.1.240-1/virtio-win-0.1.240.iso"
if [ ! -f "virtio-win.iso" ]; then
    log "Downloading VirtIO drivers..."
    wget -O virtio-win.iso "$VIRTIO_URL"
fi

update_progress 40 "preparing" "Creating autounattend.xml"

# Create autounattend.xml for unattended installation
cat > autounattend.xml <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
    <settings pass="windowsPE">
        <component name="Microsoft-Windows-International-Core-WinPE" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <SetupUILanguage>
                <UILanguage>en-US</UILanguage>
            </SetupUILanguage>
            <InputLocale>en-US</InputLocale>
            <SystemLocale>en-US</SystemLocale>
            <UILanguage>en-US</UILanguage>
            <UserLocale>en-US</UserLocale>
        </component>
        <component name="Microsoft-Windows-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <DiskConfiguration>
                <Disk wcm:action="add">
                    <CreatePartitions>
                        <CreatePartition wcm:action="add">
                            <Order>1</Order>
                            <Type>Primary</Type>
                            <Extend>true</Extend>
                        </CreatePartition>
                    </CreatePartitions>
                    <ModifyPartitions>
                        <ModifyPartition wcm:action="add">
                            <Order>1</Order>
                            <PartitionID>1</PartitionID>
                            <Label>Windows</Label>
                            <Letter>C</Letter>
                            <Format>NTFS</Format>
                            <Active>true</Active>
                        </ModifyPartition>
                    </ModifyPartitions>
                    <DiskID>0</DiskID>
                    <WillWipeDisk>true</WillWipeDisk>
                </Disk>
            </DiskConfiguration>
            <ImageInstall>
                <OSImage>
                    <InstallFrom>
                        <MetaData wcm:action="add">
                            <Key>/IMAGE/NAME</Key>
                            <Value>Windows Server 2022 SERVERSTANDARD</Value>
                        </MetaData>
                    </InstallFrom>
                    <InstallTo>
                        <DiskID>0</DiskID>
                        <PartitionID>1</PartitionID>
                    </InstallTo>
                </OSImage>
            </ImageInstall>
            <UserData>
                <AcceptEula>true</AcceptEula>
                <FullName>Administrator</FullName>
                <Organization>WinCloud</Organization>
            </UserData>
        </component>
    </settings>
    <settings pass="specialize">
        <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <ComputerName>WINCLOUD</ComputerName>
            <TimeZone>UTC</TimeZone>
        </component>
        <component name="Microsoft-Windows-TerminalServices-LocalSessionManager" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <fDenyTSConnections>false</fDenyTSConnections>
        </component>
        <component name="Microsoft-Windows-TerminalServices-RDP-WinStationExtensions" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <UserAuthentication>0</UserAuthentication>
        </component>
        <component name="Networking-MPSSVC-Svc" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <FirewallGroups>
                <FirewallGroup wcm:action="add" wcm:keyValue="RemoteDesktop">
                    <Active>true</Active>
                    <Group>Remote Desktop</Group>
                    <Profile>all</Profile>
                </FirewallGroup>
            </FirewallGroups>
        </component>
    </settings>
    <settings pass="oobeSystem">
        <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <OOBE>
                <HideEULAPage>true</HideEULAPage>
                <HideLocalAccountScreen>true</HideLocalAccountScreen>
                <HideOEMRegistrationScreen>true</HideOEMRegistrationScreen>
                <HideOnlineAccountScreens>true</HideOnlineAccountScreens>
                <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>
                <ProtectYourPC>1</ProtectYourPC>
            </OOBE>
            <UserAccounts>
                <LocalAccounts>
                    <LocalAccount wcm:action="add">
                        <Password>
                            <Value>{rdp_password}</Value>
                            <PlainText>true</PlainText>
                        </Password>
                        <Description>WinCloud User</Description>
                        <DisplayName>{rdp_username}</DisplayName>
                        <Group>Administrators</Group>
                        <Name>{rdp_username}</Name>
                    </LocalAccount>
                </LocalAccounts>
            </UserAccounts>
            <AutoLogon>
                <Password>
                    <Value>{rdp_password}</Value>
                    <PlainText>true</PlainText>
                </Password>
                <Enabled>true</Enabled>
                <LogonCount>1</LogonCount>
                <Username>{rdp_username}</Username>
            </AutoLogon>
            <FirstLogonCommands>
                <SynchronousCommand wcm:action="add">
                    <Order>1</Order>
                    <CommandLine>powershell -Command "Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name 'fDenyTSConnections' -Value 0"</CommandLine>
                    <Description>Enable RDP</Description>
                </SynchronousCommand>
                <SynchronousCommand wcm:action="add">
                    <Order>2</Order>
                    <CommandLine>netsh advfirewall firewall add rule name="allow RDP" dir=in protocol=TCP localport=3389 action=allow</CommandLine>
                    <Description>Open RDP Port</Description>
                </SynchronousCommand>
            </FirstLogonCommands>
        </component>
    </settings>
</unattend>
EOF

# Create ISO with autounattend.xml
log "Creating autounattend ISO..."
mkdir -p iso_mount
echo -n > iso_mount/autounattend.xml
cp autounattend.xml iso_mount/
mkisofs -o autounattend.iso -J -r iso_mount/

update_progress 50 "building" "Creating virtual disk"

# Create virtual disk
log "Creating virtual disk..."
qemu-img create -f qcow2 windows.qcow2 50G

update_progress 60 "installing" "Installing Windows (this will take 15-20 minutes)"

# Install Windows
log "Starting Windows installation..."
qemu-system-x86_64 \\
    -machine type=pc,accel=kvm \\
    -cpu host \\
    -m 4096 \\
    -drive file=windows.qcow2,if=virtio,cache=writeback,discard=ignore,format=qcow2 \\
    -drive file=windows.iso,media=cdrom \\
    -drive file=virtio-win.iso,media=cdrom \\
    -drive file=autounattend.iso,media=cdrom \\
    -boot d \\
    -device virtio-net-pci,netdev=net0 \\
    -netdev user,id=net0 \\
    -vnc :1 \\
    -daemonize \\
    -pidfile /var/run/qemu-windows.pid

# Wait for installation to complete (monitor via VNC or check for shutdown)
log "Waiting for Windows installation to complete..."
sleep 900  # 15 minutes initial wait

# Check if QEMU is still running
while kill -0 $(cat /var/run/qemu-windows.pid) 2>/dev/null; do
    log "Windows installation still in progress..."
    update_progress 70 "installing" "Windows installation in progress"
    sleep 60
done

update_progress 80 "configuring" "Configuring Windows for cloud environment"

# Convert to raw format for DigitalOcean
log "Converting disk to raw format..."
qemu-img convert -f qcow2 -O raw windows.qcow2 windows.raw

update_progress 90 "finalizing" "Finalizing installation"

# Start Windows with RDP enabled
log "Starting Windows with RDP..."
qemu-system-x86_64 \\
    -machine type=pc,accel=kvm \\
    -cpu host \\
    -m 4096 \\
    -drive file=windows.raw,if=virtio,cache=writeback,format=raw \\
    -device virtio-net-pci,netdev=net0 \\
    -netdev user,id=net0,hostfwd=tcp::3389-:3389 \\
    -vnc :1 \\
    -daemonize

update_progress 100 "ready" "Windows installation complete"

log "Windows installation complete!"
log "RDP Username: {rdp_username}"
log "RDP Port: 3389"

# Create status file
cat > /opt/wincloud/status.json <<EOF
{{
    "status": "ready",
    "rdp_username": "{rdp_username}",
    "rdp_port": 3389,
    "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}}
EOF
"""
        
        return script
    
    @staticmethod
    def generate_autounattend_xml(
        username: str,
        password: str,
        computer_name: str = "WINCLOUD",
        organization: str = "WinCloud Builder"
    ) -> str:
        """Generate autounattend.xml for Windows unattended installation"""
        
        # This is a simplified version - the full version is in the cloud-init script above
        return f"""<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
    <!-- Windows unattended installation configuration -->
    <!-- Generated by WinCloud Builder -->
</unattend>"""
    
    @staticmethod
    def encode_user_data(script: str) -> str:
        """Encode user data script for cloud-init"""
        return base64.b64encode(script.encode()).decode()
    
    @staticmethod
    def get_recommended_size(windows_version: str = "server2022") -> Dict[str, str]:
        """Get recommended droplet size for Windows version"""
        sizes = {
            "server2022": {
                "size": "s-4vcpu-8gb",
                "reason": "Minimum 4 vCPU and 8GB RAM recommended for Windows Server 2022"
            },
            "server2019": {
                "size": "s-4vcpu-8gb",
                "reason": "Minimum 4 vCPU and 8GB RAM recommended for Windows Server 2019"
            },
            "windows10": {
                "size": "s-2vcpu-4gb",
                "reason": "Minimum 2 vCPU and 4GB RAM for Windows 10"
            }
        }
        return sizes.get(windows_version, sizes["server2022"])
