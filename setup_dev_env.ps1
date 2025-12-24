Write-Host "Installing AWS CLI..."
winget install -e --id Amazon.AWSCLI --accept-source-agreements --accept-package-agreements

Write-Host "Installing Terraform..."
winget install -e --id Hashicorp.Terraform --accept-source-agreements --accept-package-agreements

Write-Host "Installing Docker Desktop..."
winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements

Write-Host "Installation complete. Please restart your terminal/system for changes to take effect."
