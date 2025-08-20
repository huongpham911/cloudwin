import asyncio
import paramiko
from typing import Optional, Callable
import logging
from datetime import datetime
import os
import json

logger = logging.getLogger(__name__)

class WindowsBuilderService:
    def __init__(self, digital_ocean_token: str):
        self.do_token = digital_ocean_token
        self.ssh_key_path = os.getenv("SSH_KEY_PATH", "~/.ssh/id_rsa")
        
    async def install_windows_on_droplet(
        self,
        ip_address: str,
        template_id: str,
        username: str,
        password: str,
        progress_callback: Optional[Callable] = None
    ):
        """Install Windows on Ubuntu droplet using QEMU"""
        
        # Wait for SSH to be ready
        await self._wait_for_ssh(ip_address)
        
        if progress_callback:
            await progress_callback(30, "SSH connection established")
        
        # Connect via SSH
        ssh = self._create_ssh_connection(ip_address)
        
        try:
            # Install dependencies
            await self._run_ssh_command(ssh, "apt-get update && apt-get install -y qemu-kvm wget genisoimage curl")
            if progress_callback:
                await progress_callback(40, "Dependencies installed")
            
            # Create build script based on template
            build_script = self._generate_build_script(template_id, username, password)
            
            # Upload and execute build script
            sftp = ssh.open_sftp()
            sftp.put_string(build_script, "/root/build-windows.sh")
            sftp.chmod("/root/build-windows.sh", 0o755)
            sftp.close()
            
            if progress_callback:
                await progress_callback(50, "Build script uploaded")
            
            # Execute build script with progress monitoring
            stdin, stdout, stderr = ssh.exec_command("bash /root/build-windows.sh", get_pty=True)
            
            # Monitor progress
            await self._monitor_build_progress(stdout, progress_callback)
            
            if progress_callback:
                await progress_callback(90, "Configuring RDP access")
            
            # Configure firewall for RDP
            await self._run_ssh_command(ssh, "ufw allow 3389/tcp")
            
            if progress_callback:
                await progress_callback(95, "Verifying Windows installation")
            
            # Verify Windows is running
            result = await self._run_ssh_command(ssh, "ps aux | grep qemu")
            if "qemu-system-x86_64" not in result:
                raise Exception("Windows VM failed to start")
                
        finally:
            ssh.close()
    
    def _generate_build_script(self, template_id: str, username: str, password: str) -> str:
        """Generate bash script for building Windows"""
        
        # Template configurations
        templates = {
            "win11-pro": {
                "iso_url": os.getenv("WIN11_PRO_ISO_URL", ""),
                "disk_size": "64G",
                "ram": "8192",
                "cpu_args": "-cpu host,hv-relaxed,hv-vapic,hv-spinlocks=0x1fff,hv-vpindex,hv-runtime,hv-synic,hv-stimer,hv-reset,hv-vendor-id=KVM,kvm=off",
                "tpm_bypass": True
            },
            "win11-ltsc": {
                "iso_url": os.getenv("WIN11_LTSC_ISO_URL", ""),
                "disk_size": "32G",
                "ram": "4096",
                "cpu_args": "-cpu host,hv-relaxed,hv-vapic,hv-spinlocks=0x1fff",
                "tpm_bypass": True
            },
            "tiny11": {
                "iso_url": os.getenv("TINY11_ISO_URL", ""),
                "disk_size": "20G",
                "ram": "2048",
                "cpu_args": "-cpu host",
                "tpm_bypass": True
            },
            "win10-ltsc": {
                "iso_url": os.getenv("WIN10_LTSC_ISO_URL", ""),
                "disk_size": "30G",
                "ram": "4096",
                "cpu_args": "-cpu host",
                "tpm_bypass": False
            },
            "tiny10": {
                "iso_url": os.getenv("TINY10_ISO_URL", ""),
                "disk_size": "20G",
                "ram": "2048",
                "cpu_args": "-cpu host",
                "tpm_bypass": False
            },
            "win-server-2022": {
                "iso_url": os.getenv("WIN_SERVER_2022_ISO_URL", ""),
                "disk_size": "40G",
                "ram": "8192",
                "cpu_args": "-cpu host",
                "tpm_bypass": False
            }
        }
        
        config = templates.get(template_id, templates["win10-ltsc"])
        
        # Generate autounattend.xml content
        autounattend = self._generate_autounattend(username, password)
        
        # Get CPU args and TPM bypass settings
        cpu_args = config.get('cpu_args', '-cpu host')
        tpm_bypass = config.get('tpm_bypass', False)
        
        # Additional QEMU args for Windows 11 TPM bypass
        extra_args = ""
        if tpm_bypass:
            extra_args = """
  -machine type=pc-q35-6.2,smm=off \\
  -global driver=cfi.pflash01,property=secure,value=off \\
  -no-hpet \\
  -rtc base=localtime,driftfix=slew"""
        
        script = f'''#!/bin/bash
set -e

echo "Starting Windows build process..."

# Create working directory
mkdir -p /root/winbuild
cd /root/winbuild

# Download Windows ISO
echo "Downloading Windows ISO..."
wget -O windows.iso "{config['iso_url']}"

# Download VirtIO drivers
echo "Downloading VirtIO drivers..."
wget -O virtio-win.iso https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/stable-virtio/virtio-win.iso

# Create autounattend.xml
cat > autounattend.xml << 'EOF'
{autounattend}
EOF

# Create ISO with autounattend
echo "Creating autounattend ISO..."
mkdir -p iso-files
cp autounattend.xml iso-files/
genisoimage -o autounattend.iso -V cidata -r -J iso-files/

# Create disk image
echo "Creating disk image..."
qemu-img create -f qcow2 windows.qcow2 {config['disk_size']}

# Install Windows
echo "Installing Windows (this will take 15-20 minutes)..."
qemu-system-x86_64 \\
  -enable-kvm \\
  -m {config['ram']} \\
  {cpu_args} \\
  -smp cores=2,threads=2 \\
  -drive file=windows.qcow2,format=qcow2,if=virtio \\
  -cdrom windows.iso \\
  -drive file=autounattend.iso,media=cdrom \\
  -drive file=virtio-win.iso,media=cdrom \\
  -netdev user,id=net0 \\
  -device virtio-net,netdev=net0 \\
  -vga std \\
  -nographic \\
  -vnc :1{extra_args} &

# Wait for installation
QEMU_PID=$!
echo "QEMU PID: $QEMU_PID"

# Monitor installation progress
echo "Waiting for Windows installation to complete..."
sleep 900  # Wait 15 minutes for install (longer for Win11)

# Kill temporary QEMU
kill $QEMU_PID || true
sleep 5

# Start Windows with RDP forwarding
echo "Starting Windows with RDP access..."
nohup qemu-system-x86_64 \\
  -enable-kvm \\
  -m {config['ram']} \\
  {cpu_args} \\
  -smp cores=2,threads=2 \\
  -drive file=windows.qcow2,format=qcow2,if=virtio \\
  -netdev user,id=net0,hostfwd=tcp::3389-:3389 \\
  -device virtio-net,netdev=net0 \\
  -vga std \\
  -nographic \\
  -vnc :1{extra_args} > /var/log/windows-vm.log 2>&1 &

echo "Windows VM started successfully!"
echo "RDP will be available on port 3389 after Windows completes setup"
'''
        return script
    
    def _generate_autounattend(self, username: str, password: str) -> str:
        """Generate autounattend.xml for unattended Windows installation"""
        return f'''<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
  <settings pass="windowsPE">
    <component name="Microsoft-Windows-Setup" processorArchitecture="amd64" 
               publicKeyToken="31bf3856ad364e35" language="neutral" 
               versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
      <DiskConfiguration>
        <Disk wcm:action="add">
          <DiskID>0</DiskID>
          <WillWipeDisk>true</WillWipeDisk>
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
              <Format>NTFS</Format>
              <Label>Windows</Label>
              <Letter>C</Letter>
              <Active>true</Active>
            </ModifyPartition>
          </ModifyPartitions>
        </Disk>
      </DiskConfiguration>
      <ImageInstall>
        <OSImage>
          <InstallFrom>
            <MetaData wcm:action="add">
              <Key>/IMAGE/INDEX</Key>
              <Value>1</Value>
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
        <ProductKey>
          <WillShowUI>Never</WillShowUI>
        </ProductKey>
      </UserData>
    </component>
  </settings>
  <settings pass="oobeSystem">
    <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64" 
               publicKeyToken="31bf3856ad364e35" language="neutral" 
               versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
      <UserAccounts>
        <LocalAccounts>
          <LocalAccount wcm:action="add">
            <Name>{username}</Name>
            <Group>Administrators</Group>
            <Password>
              <Value>{password}</Value>
              <PlainText>true</PlainText>
            </Password>
          </LocalAccount>
        </LocalAccounts>
      </UserAccounts>
      <AutoLogon>
        <Enabled>true</Enabled>
        <Username>{username}</Username>
        <Password>
          <Value>{password}</Value>
          <PlainText>true</PlainText>
        </Password>
      </AutoLogon>
      <FirstLogonCommands>
        <SynchronousCommand wcm:action="add">
          <Order>1</Order>
          <CommandLine>cmd /c netsh advfirewall firewall add rule name="RDP" dir=in action=allow protocol=TCP localport=3389</CommandLine>
        </SynchronousCommand>
        <SynchronousCommand wcm:action="add">
          <Order>2</Order>
          <CommandLine>cmd /c reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f</CommandLine>
        </SynchronousCommand>
        <SynchronousCommand wcm:action="add">
          <Order>3</Order>
          <CommandLine>cmd /c sc config TermService start= auto</CommandLine>
        </SynchronousCommand>
        <SynchronousCommand wcm:action="add">
          <Order>4</Order>
          <CommandLine>cmd /c net start TermService</CommandLine>
        </SynchronousCommand>
      </FirstLogonCommands>
      <TimeZone>UTC</TimeZone>
    </component>
  </settings>
</unattend>'''
    
    async def _wait_for_ssh(self, ip_address: str, timeout: int = 300):
        """Wait for SSH to be available"""
        start_time = datetime.utcnow()
        while (datetime.utcnow() - start_time).seconds < timeout:
            try:
                ssh = paramiko.SSHClient()
                ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                ssh.connect(ip_address, username='root', timeout=5)
                ssh.close()
                return
            except:
                await asyncio.sleep(5)
        raise TimeoutError(f"SSH not available on {ip_address}")
    
    def _create_ssh_connection(self, ip_address: str) -> paramiko.SSHClient:
        """Create SSH connection to droplet"""
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            ip_address,
            username='root',
            key_filename=os.path.expanduser(self.ssh_key_path),
            timeout=30
        )
        return ssh
    
    async def _run_ssh_command(self, ssh: paramiko.SSHClient, command: str) -> str:
        """Execute command via SSH and return output"""
        stdin, stdout, stderr = ssh.exec_command(command)
        output = stdout.read().decode()
        error = stderr.read().decode()
        if error and "warning" not in error.lower():
            logger.warning(f"SSH command error: {error}")
        return output
    
    async def _monitor_build_progress(self, stdout, progress_callback: Optional[Callable]):
        """Monitor build progress from stdout"""
        progress_map = {
            "Downloading Windows ISO": 55,
            "Downloading VirtIO": 60,
            "Creating disk image": 65,
            "Installing Windows": 70,
            "Starting Windows": 85
        }
        
        for line in stdout:
            line = line.strip()
            if line:
                logger.info(f"Build output: {line}")
                for key, progress in progress_map.items():
                    if key in line and progress_callback:
                        await progress_callback(progress, line)
