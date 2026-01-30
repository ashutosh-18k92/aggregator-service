# Aggregator Service

## Overview

The aggregator service is a microservice that aggregates results from rock, paper, and scissor services to determine a winner.

**Team**: Aggregator Team  
**Port**: 3000  
**Language**: TypeScript/Node.js

## Repository Structure

```
aggregator-service/
├── src/                    # Application code
│   └── index.ts
├── deploy/                 # Kubernetes deployment (Kustomize)
│   ├── base/
│   │   ├── kustomization.yaml
│   │   └── values.yaml
│   └── overlays/
│       ├── dev/
│       └── production/
├── package.json
├── tsconfig.json
└── README.md
```

## Application Development

### Prerequisites

- Node.js 20+
- npm or pnpm

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run production build
npm start
```

### Environment Variables

```bash
PORT=3000                                    # Service port
SERVICE_NAME=aggregator                      # Service name
ROCK_SERVICE_URL=http://localhost:3001       # Rock service endpoint
PAPER_SERVICE_URL=http://localhost:3002      # Paper service endpoint
SCISSOR_SERVICE_URL=http://localhost:3003    # Scissor service endpoint
```

### API Endpoints

- **GET /health** - Health check
- **GET /ready** - Readiness check
- **GET /api/play** - Main endpoint (calls rock, paper, scissor services)

## Kubernetes Deployment

This service uses **Helm + Kustomize hybrid** approach for deployment.

### Base Chart

The service references the base API chart from GitHub:

- **Repository**: https://github.com/ashutosh-18k92/sf-helm-registry.git
- **Chart**: `api`
- **Version**: `0.1.0`

### Deploy Configuration

```
deploy/
├── base/
│   ├── kustomization.yaml    # References GitHub chart
│   └── values.yaml           # Service-specific values
└── overlays/
    ├── dev/                  # Development environment
    └── production/           # Production environment
        └── patches/          # Production patches
```

### Deployment

#### Via ArgoCD (Recommended)

```yaml
# ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: aggregator-prod
spec:
  source:
    repoURL: https://github.com/your-org/aggregator-service.git
    targetRevision: main
    path: deploy/overlays/production
    kustomize:
      version: v5.0.0
  destination:
    server: https://kubernetes.default.svc
    namespace: super-fortnight
```

#### Manual Deployment

```bash
# Render manifests
kustomize build deploy/overlays/production

# Deploy to production
kustomize build deploy/overlays/production | kubectl apply -f -

# Deploy to dev
kustomize build deploy/overlays/dev | kubectl apply -f -
```

### Updating Base Chart

When the platform team releases a new base chart version:

```bash
cd deploy/base
vim kustomization.yaml
# Change: version: 0.1.0 → version: 0.2.0

# Test
kustomize build ../overlays/production

# Commit
git add .
git commit -m "Upgrade to API chart v0.2.0"
git push
```

### Custom Configuration

To add service-specific configuration:

```bash
cd deploy/overlays/production

# Create patch
cat > patches/custom-config.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aggregator-api-v1
spec:
  template:
    spec:
      containers:
        - name: api
          env:
            - name: CUSTOM_SETTING
              value: "enabled"
EOF

# Add to kustomization
vim kustomization.yaml
# Add: - patches/custom-config.yaml
```

## CI/CD Pipeline

### Build

```bash
# Build Docker image
docker build -t aggregator-service:v1.0.0 .

# Push to registry
docker push your-registry/aggregator-service:v1.0.0
```

### Deploy

```bash
# Update image tag in values
cd deploy/base
vim values.yaml
# image.tag: v1.0.0

# Commit and push
git add .
git commit -m "Release v1.0.0"
git push

# ArgoCD auto-syncs
```

## Team Ownership

**Team**: Aggregator Team  
**Slack**: #team-aggregator  
**On-call**: [PagerDuty link]

## Related Documentation

- [Helm + Kustomize Hybrid Guide](../../gitops-v3/helm-charts/HELM_KUSTOMIZE_HYBRID.md)
- [Base API Chart](https://github.com/ashutosh-18k92/sf-helm-registry)
- [Platform Documentation](../../gitops-v3/README.md)
