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
├── charts/                 # Service-specific Helm chart
│   └── aggregator/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values.schema.json
│       ├── README.md
│       └── templates/
├── deploy/                 # Kubernetes deployment (Kustomize overlays)
│   └── overlays/
│       ├── development/
│       │   ├── kustomization.yaml
│       │   ├── values.yaml
│       │   └── patches/
│       ├── staging/
│       └── production/
├── package.json
├── tsconfig.json
└── README.md
```

## Architecture: Service-Specific Helm Charts

This service uses a **service-specific Helm chart** approach, which provides:

✅ **Team Ownership**: The aggregator team owns and controls the `charts/aggregator/` chart  
✅ **Base Configuration**: `charts/aggregator/values.yaml` is the source of truth for base config  
✅ **Environment Overlays**: Kustomize overlays provide environment-specific customization  
✅ **Chart Distribution**: Published via GitHub Pages for versioning and distribution  
✅ **Dependency Management**: Can declare dependencies on other service charts

### How It Works

1. **Service Chart** (`charts/aggregator/`): Contains the base Helm chart for this service
   - Owned and maintained by the Aggregator Team
   - Defines default values, templates, and schema
   - Published to GitHub Pages for distribution

2. **Environment Overlays** (`deploy/overlays/`): Kustomize overlays for each environment
   - Reference the service chart via Helm
   - Provide environment-specific values
   - Apply patches for environment-specific customization

3. **ArgoCD Integration**: ArgoCD ApplicationSets reference the service chart
   - Single-source approach (Kustomize + Helm)
   - Automatic sync and deployment
   - Environment-specific configurations

### Benefits Over Previous Approach

**Previous**: Kustomize tried to reference a remote Helm chart from `sf-helm-charts` repository  
**Problem**: Kustomize limitations with remote Helm charts

**Current**: Each service has its own Helm chart  
**Benefits**:

- ✅ No Kustomize limitations with remote resources
- ✅ Team autonomy and ownership
- ✅ Independent versioning and evolution
- ✅ Proper Helm dependency management
- ✅ `api` chart in `sf-helm-charts` is now just a template for new services

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

## Helm Chart

### Chart Structure

```
charts/aggregator/
├── Chart.yaml              # Chart metadata and version
├── values.yaml             # Default values (base configuration)
├── values.schema.json      # Values validation schema
├── README.md               # Chart documentation
└── templates/              # Kubernetes resource templates
    ├── deployment.yaml
    ├── service.yaml
    ├── hpa.yaml
    ├── istioVirtualService.yaml
    ├── serviceAccount.yaml
    └── _helpers.tpl
```

## Deployment order

The standard and recommended order for deploying the specified Kubernetes manifests is:
ServiceAccount
Service
Deployment
HorizontalPodAutoscaler (HPA)
Ingress
Rationale for the Order
Deploying in this sequence ensures that dependent objects exist before the controllers or resources that reference them are created.
ServiceAccount
This is typically the first resource to ensure it's available for other components, specifically the Deployment, to use for defining permissions for the pods it manages [1, 2].
Service
The Service defines how to access your pods and gives them a stable IP address and DNS name [1, 2]. While it can be created before or concurrently with the Deployment it targets (it will simply wait for pods to match its selector), it must exist before other resources like Ingress or the HPA can reference it [1].
Deployment
The Deployment manages the creation and scaling of your application's pods [1, 2]. It requires the ServiceAccount to be present if a custom one is specified. Once the pods managed by the Deployment are running and healthy, the Service can route traffic to them.
HorizontalPodAutoscaler (HPA)
The HPA is responsible for automatically scaling the number of pods in the Deployment (or other scalable resource) based on observed metrics like CPU utilization [1, 2]. It depends entirely on the existence of the Deployment it is designed to scale.
Ingress
The Ingress manages external access to the services within the cluster, typically HTTP routing [1, 2]. It must reference an existing Service to know where to direct incoming traffic. Deploying it last ensures all internal components are ready to receive traffic once the ingress controller configures the external access rules.
Adhering to this order minimizes errors related to missing dependencies during the deployment process [2].

### Base Values

The `charts/aggregator/values.yaml` file contains the base configuration:

```yaml
# Business/Service Identity
app:
  name: aggregator-service
  component: api
  partOf: superfortnight

# Container configuration
containerPort: 3000
replicaCount: 1

# Image configuration
image:
  repository: "ashutoshkumar18/aggregator-service"
  tag: "latest"
  pullPolicy: IfNotPresent

# Environment variables
env:
  PORT: "3000"
  SERVICE_NAME: "aggregator-service"

# Health checks
healthCheck:
  livenessProbe:
    httpGet:
      path: /health
      port: 3000
  readinessProbe:
    httpGet:
      path: /ready
      port: 3000

# Resources
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```

### Testing the Chart

```bash
# Render chart with default values
helm template aggregator ./charts/aggregator

# Render with development values
helm template aggregator ./charts/aggregator \
  -f deploy/overlays/development/values.yaml

# Validate chart
helm lint ./charts/aggregator

# Package chart
helm package ./charts/aggregator
```

### Troubleshooting: Prettier and Helm Templates

**Problem**: If you're using Prettier as your YAML formatter, it may incorrectly format Helm template syntax by adding spaces:

- ❌ Prettier formats `{{-` as `{{ -` (incorrect)
- ✅ Correct Helm syntax is `{{-` (no space)

This causes lint errors like:

```
Error: templates/service.yaml: unable to parse YAML: error converting YAML to JSON: yaml: line 4: did not find expected node content
```

**Solution**: The repository includes a `.prettierignore` file that excludes Helm templates from Prettier formatting:

```
# .prettierignore
# Helm chart templates - Prettier doesn't understand Helm template syntax
charts/**/templates/**/*.yaml
charts/**/templates/**/*.tpl
```

If you encounter formatting issues, verify that:

1. The `.prettierignore` file exists in the repository root
2. Your editor respects `.prettierignore` files
3. Helm template files use `{{-` syntax without spaces

## Deployment

### Environment Overlays

Each environment has its own overlay in `deploy/overlays/`:

```
deploy/overlays/
├── development/
│   ├── kustomization.yaml    # References aggregator chart
│   ├── values.yaml           # Dev-specific values
│   └── patches/              # Dev-specific patches
├── staging/
└── production/
```

### Development Overlay

**File**: `deploy/overlays/development/kustomization.yaml`

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
  - name: aggregator
    repo: https://ashutosh-18k92.github.io/aggregator-service
    releaseName: aggregator-service
    namespace: super-fortnight-dev
    valuesFile: values.yaml
    version: 0.1.0
    includeCRDs: false
```

**File**: `deploy/overlays/development/values.yaml`

```yaml
app:
  name: aggregator-service
  component: api
  partOf: superfortnight

environment: development

image:
  tag: "dev-latest"
  pullPolicy: Always

env:
  LOG_LEVEL: "debug"
  NODE_ENV: "development"

autoscaling:
  enabled: false

resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
```

### ArgoCD Deployment

**File**: `gitops-v2/argocd/__test_apps__/aggregator-appset-single-source.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: aggregator-service
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/ashutosh-18k92/aggregator-service.git
        revision: main
        files:
          - path: "deploy/environments/*.yaml"

  template:
    metadata:
      name: "aggregator-service-{{.env}}"
    spec:
      project: default

      # Single source: Kustomize overlay (includes Helm chart + patches)
      source:
        repoURL: https://github.com/ashutosh-18k92/aggregator-service.git
        targetRevision: "{{.env}}"
        path: deploy/overlays/{{.env}}
        kustomize: {} # Uses global --enable-helm from argocd-cm

      destination:
        server: https://kubernetes.default.svc
        namespace: "{{.namespace}}"

      syncPolicy:
        automated:
          enabled: true
          prune: true
          selfHeal: true
```

### Manual Deployment

```bash
# Render manifests for development
kustomize build --enable-helm deploy/overlays/development

# Deploy to development
kustomize build --enable-helm deploy/overlays/development | kubectl apply -f -

# Deploy to production
kustomize build --enable-helm deploy/overlays/production | kubectl apply -f -
```

## Chart Publishing (GitHub Pages)

The aggregator chart is published to GitHub Pages for distribution:

```bash
# Package the chart
helm package charts/aggregator

# Move to gh-pages branch
git checkout gh-pages
mv aggregator-*.tgz charts/

# Update index
helm repo index charts/ --url https://ashutosh-18k92.github.io/aggregator-service/charts

# Commit and push
git add charts/
git commit -m "Release aggregator chart v0.1.0"
git push origin gh-pages
```

**Chart URL**: `https://ashutosh-18k92.github.io/aggregator-service`

## Updating the Service

### Update Application Code

```bash
# Make changes to src/
vim src/index.ts

# Build and test locally
npm run build
npm test

# Commit
git add src/
git commit -m "Add new feature"
```

### Update Chart

```bash
# Update chart version
vim charts/aggregator/Chart.yaml
# Bump version: 0.1.0 → 0.1.1

# Update values if needed
vim charts/aggregator/values.yaml

# Test chart
helm lint charts/aggregator
helm template aggregator charts/aggregator

# Commit
git add charts/
git commit -m "Update chart to v0.1.1"
```

### Update Environment Configuration

```bash
# Update development values
vim deploy/overlays/development/values.yaml

# Update image tag
# image.tag: "dev-latest" → "v1.1.0"

# Test rendering
kustomize build --enable-helm deploy/overlays/development

# Commit
git add deploy/
git commit -m "Update dev environment to v1.1.0"
git push
```

ArgoCD will automatically sync the changes.

## Chart Dependencies (Future)

The aggregator service can declare dependencies on other services:

**File**: `charts/aggregator/Chart.yaml`

```yaml
apiVersion: v2
name: aggregator
version: 0.2.0
appVersion: "v1"

dependencies:
  - name: rock-service
    version: "0.1.0"
    repository: "https://ashutosh-18k92.github.io/rock-service"
  - name: paper-service
    version: "0.1.0"
    repository: "https://ashutosh-18k92.github.io/paper-service"
  - name: scissor-service
    version: "0.1.0"
    repository: "https://ashutosh-18k92.github.io/scissor-service"
```

This enables the "leader chart" pattern for complex services.

## CI/CD Pipeline

### Build

```bash
# Build Docker image
docker build -t ashutoshkumar18/aggregator-service:v1.0.0 .

# Push to Docker Hub
docker push ashutoshkumar18/aggregator-service:v1.0.0
```

### Release

```bash
# 1. Update chart version
vim charts/aggregator/Chart.yaml

# 2. Update image tag in base values
vim charts/aggregator/values.yaml

# 3. Package and publish chart
helm package charts/aggregator
# ... publish to GitHub Pages

# 4. Update environment overlays
vim deploy/overlays/production/values.yaml

# 5. Commit and push
git add .
git commit -m "Release v1.0.0"
git push

# ArgoCD auto-syncs
```

## Team Ownership

**Team**: Aggregator Team  
**Slack**: #team-aggregator  
**On-call**: [PagerDuty link]

**Responsibilities**:

- Maintain `charts/aggregator/` Helm chart
- Update environment overlays in `deploy/overlays/`
- Publish chart releases to GitHub Pages
- Monitor and maintain the service

## Related Documentation

- [Adding a New Service](../../gitops-v3/gitops-docs/docs/gitops/guides/adding-new-service.md)
- [Helm Chart Reference](../../gitops-v3/gitops-docs/docs/gitops/reference/helm-chart-reference.md)
- [Service-Specific Charts Pattern](../../gitops-v3/gitops-docs/docs/gitops/guides/service-specific-charts.md)
- [Platform Documentation](../../gitops-v3/README.md)
