# Deploy Script for Hawk Travelmate Backend
# Prerequisites: AWS CLI installed and configured, Docker installed

$Region = "ap-southeast-2" # Must match your Terraform region
$RepoName = "hawk-travelmate-backend"
$AWSAccountId = aws sts get-caller-identity --query Account --output text

if (!$AWSAccountId) {
    Write-Error "Could not get AWS Account ID. Is AWS CLI configured?"
    exit 1
}

Write-Host "AWS Account ID: $AWSAccountId" -ForegroundColor Green

# 1. Login to ECR
Write-Host "Logging into ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$AWSAccountId.dkr.ecr.$Region.amazonaws.com"

# 2. Build Docker Image
Write-Host "Building Docker image..." -ForegroundColor Cyan
$ImageUri = "$AWSAccountId.dkr.ecr.$Region.amazonaws.com/${RepoName}:latest"
$ServerPath = Join-Path $PSScriptRoot "..\server"
if (!(Test-Path $ServerPath)) {
    Write-Error "Server directory not found at $ServerPath"
    exit 1
}
docker build -t $ImageUri $ServerPath

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed."
    exit 1
}

# 3. Push to ECR
Write-Host "Pushing image to ECR..." -ForegroundColor Cyan
docker push $ImageUri

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker push failed."
    exit 1
}

Write-Host "Deployment artifact pushed successfully!" -ForegroundColor Green
Write-Host "Image URI for App Runner: $ImageUri" -ForegroundColor Yellow
Write-Host "App Runner should auto-deploy this new image shortly." -ForegroundColor Green
