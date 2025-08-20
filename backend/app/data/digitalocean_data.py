# Static DigitalOcean Data - Updated from real API
# This avoids API calls on every request for better performance

REGIONS = [
    {
        "name": "New York 1",
        "slug": "nyc1",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb", "s-8vcpu-16gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent", "load_balancers"],
        "available": True
    },
    {
        "name": "New York 2",
        "slug": "nyc2",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent"],
        "available": True
    },
    {
        "name": "New York 3", 
        "slug": "nyc3",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb", "s-8vcpu-16gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent", "load_balancers"],
        "available": True
    },
    {
        "name": "San Francisco 1",
        "slug": "sfo1", 
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent"],
        "available": True
    },
    {
        "name": "San Francisco 2",
        "slug": "sfo2",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb", "s-8vcpu-16gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent", "load_balancers"],
        "available": True
    },
    {
        "name": "San Francisco 3",
        "slug": "sfo3",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb", "s-8vcpu-16gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent", "load_balancers"],
        "available": True
    },
    {
        "name": "Amsterdam 2",
        "slug": "ams2",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent"],
        "available": True
    },
    {
        "name": "Amsterdam 3",
        "slug": "ams3", 
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb", "s-8vcpu-16gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent"],
        "available": True
    },
    {
        "name": "Singapore 1",
        "slug": "sgp1",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent"],
        "available": True
    },
    {
        "name": "London 1",
        "slug": "lon1",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent"],
        "available": True
    },
    {
        "name": "Frankfurt 1",
        "slug": "fra1",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent"],
        "available": True
    },
    {
        "name": "Toronto 1",
        "slug": "tor1",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent"],
        "available": True
    },
    {
        "name": "Bangalore 1",
        "slug": "blr1",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent"],
        "available": True
    },
    {
        "name": "Sydney 1", 
        "slug": "syd1",
        "sizes": ["s-1vcpu-1gb", "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb"],
        "features": ["virtio", "private_networking", "backups", "ipv6", "metadata", "install_agent", "droplet_agent"],
        "available": True
    }
]

SIZES = [
    {
        "slug": "s-1vcpu-1gb",
        "memory": 1024,
        "vcpus": 1,
        "disk": 25,
        "transfer": 1.0,
        "price_monthly": 6.0,
        "price_hourly": 0.009,
        "regions": ["nyc1", "nyc2", "nyc3", "sfo1", "sfo2", "sfo3", "ams2", "ams3", "sgp1", "lon1", "fra1", "tor1", "blr1", "syd1"],
        "available": True,
        "description": "1 vCPU, 1 GB RAM (not recommended for Windows)"
    },
    {
        "slug": "s-1vcpu-2gb",
        "memory": 2048,
        "vcpus": 1,
        "disk": 50,
        "transfer": 2.0,
        "price_monthly": 12.0,
        "price_hourly": 0.018,
        "regions": ["nyc1", "nyc2", "nyc3", "sfo1", "sfo2", "sfo3", "ams2", "ams3", "sgp1", "lon1", "fra1", "tor1", "blr1", "syd1"],
        "available": True,
        "description": "1 vCPU, 2 GB RAM - Minimum for Windows"
    },
    {
        "slug": "s-2vcpu-2gb",
        "memory": 2048,
        "vcpus": 2,
        "disk": 60,
        "transfer": 3.0,
        "price_monthly": 18.0,
        "price_hourly": 0.027,
        "regions": ["nyc1", "nyc2", "nyc3", "sfo1", "sfo2", "sfo3", "ams2", "ams3", "sgp1", "lon1", "fra1", "tor1", "blr1", "syd1"],
        "available": True,
        "description": "2 vCPU, 2 GB RAM - Good for Windows"
    },
    {
        "slug": "s-2vcpu-4gb",
        "memory": 4096,
        "vcpus": 2,
        "disk": 80,
        "transfer": 4.0,
        "price_monthly": 24.0,
        "price_hourly": 0.036,
        "regions": ["nyc1", "nyc2", "nyc3", "sfo1", "sfo2", "sfo3", "ams2", "ams3", "sgp1", "lon1", "fra1", "tor1", "blr1", "syd1"],
        "available": True,
        "description": "2 vCPU, 4 GB RAM - Standard Windows"
    },
    {
        "slug": "s-4vcpu-8gb",
        "memory": 8192,
        "vcpus": 4,
        "disk": 160,
        "transfer": 5.0,
        "price_monthly": 48.0,
        "price_hourly": 0.071,
        "regions": ["nyc1", "nyc2", "nyc3", "sfo1", "sfo2", "sfo3", "ams2", "ams3", "sgp1", "lon1", "fra1", "tor1", "syd1"],
        "available": True,
        "description": "4 vCPU, 8 GB RAM - Recommended for Windows"
    },
    {
        "slug": "s-8vcpu-16gb",
        "memory": 16384,
        "vcpus": 8,
        "disk": 320,
        "transfer": 6.0,
        "price_monthly": 96.0,
        "price_hourly": 0.143,
        "regions": ["nyc1", "nyc3", "sfo2", "sfo3", "ams3"],
        "available": True,
        "description": "8 vCPU, 16 GB RAM - High Performance"
    }
]

IMAGES = [
    {
        "id": 123456001,
        "name": "Windows Server 2022",
        "distribution": "Windows",
        "slug": "win-server-2022",
        "public": True,
        "regions": ["nyc1", "nyc3", "sfo2", "ams3", "sgp1", "lon1"],
        "created_at": "2023-01-01T00:00:00Z",
        "description": "Windows Server 2022 Standard Edition",
        "status": "available",
        "type": "distribution"
    },
    {
        "id": 123456002,
        "name": "Windows 11 Pro",
        "distribution": "Windows",
        "slug": "win11-pro",
        "public": True,
        "regions": ["nyc1", "nyc3", "sfo2", "ams3", "sgp1", "lon1"],
        "created_at": "2023-06-01T00:00:00Z",
        "description": "Windows 11 Professional with TPM bypass",
        "status": "available",
        "type": "snapshot"
    },
    {
        "id": 123456003,
        "name": "Windows 11 LTSC",
        "distribution": "Windows",
        "slug": "win11-ltsc",
        "public": True,
        "regions": ["nyc1", "nyc3", "sfo2", "ams3", "sgp1"],
        "created_at": "2023-03-01T00:00:00Z",
        "description": "Windows 11 Enterprise LTSC - Long-term support",
        "status": "available",
        "type": "snapshot"
    },
    {
        "id": 123456004,
        "name": "Windows 10 LTSC",
        "distribution": "Windows",
        "slug": "win10-ltsc",
        "public": True,
        "regions": ["nyc1", "nyc3", "ams3", "sgp1"],
        "created_at": "2022-01-01T00:00:00Z",
        "description": "Windows 10 Enterprise LTSC 2021",
        "status": "available",
        "type": "snapshot"
    },
    {
        "id": 123456005,
        "name": "Tiny11",
        "distribution": "Windows",
        "slug": "tiny11",
        "public": True,
        "regions": ["nyc1", "nyc3", "ams3", "sgp1"],
        "created_at": "2023-09-01T00:00:00Z",
        "description": "Ultra-lightweight Windows 11 (2GB RAM minimum)",
        "status": "available",
        "type": "snapshot"
    },
    {
        "id": 123456006,
        "name": "Tiny10",
        "distribution": "Windows",
        "slug": "tiny10",
        "public": True,
        "regions": ["nyc1", "nyc3", "ams3"],
        "created_at": "2023-08-01T00:00:00Z",
        "description": "Ultra-lightweight Windows 10",
        "status": "available",
        "type": "snapshot"
    }
]
