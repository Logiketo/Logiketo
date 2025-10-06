# Logiketo Deployment Guide

## 🌐 Domain Setup (logiketo.com)

### 1. Domain Configuration
Your domain `logiketo.com` is already purchased. Here's how to configure it:

#### DNS Settings
Configure these DNS records with your domain provider:

```
# A Records (Point to your hosting provider)
@                    A     [YOUR_SERVER_IP]
www                  A     [YOUR_SERVER_IP]

# CNAME Records (For subdomains)
api                  CNAME [YOUR_API_DOMAIN]
admin                CNAME [YOUR_FRONTEND_DOMAIN]
```

#### SSL Certificate
- **Let's Encrypt** (Free): Use Certbot for automatic SSL
- **Cloudflare** (Recommended): Free SSL + CDN + DDoS protection

### 2. Recommended Hosting Setup

#### Option A: Vercel + Railway (Recommended for Startups)
**Frontend (Vercel)**
- Connect your GitHub repository
- Automatic deployments on push
- Free tier: 100GB bandwidth/month
- Custom domain support

**Backend (Railway)**
- PostgreSQL database included
- Automatic deployments
- Free tier: $5 credit/month
- Custom domain support

#### Option B: DigitalOcean (Recommended for Scale)
**Droplet Setup**
- 2GB RAM, 1 CPU, 50GB SSD ($12/month)
- Ubuntu 22.04 LTS
- Docker + Docker Compose
- Nginx reverse proxy

#### Option C: AWS (Enterprise)
**Services**
- Frontend: S3 + CloudFront
- Backend: EC2 or ECS
- Database: RDS PostgreSQL
- Load Balancer: ALB

## 🚀 Deployment Steps

### Step 1: Environment Setup

#### Backend Environment Variables
Create `backend/.env`:
```env
# Database
DATABASE_URL="postgresql://username:password@host:5432/logiketo_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="production"

# CORS
FRONTEND_URL="https://logiketo.com"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Maps API
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

#### Frontend Environment Variables
Create `frontend/.env`:
```env
VITE_API_URL=https://api.logiketo.com
VITE_APP_NAME=Logiketo
VITE_APP_VERSION=1.0.0
```

### Step 2: Database Setup

#### Using Railway PostgreSQL
```bash
# Connect to your Railway database
psql $DATABASE_URL

# Run migrations
cd backend
npx prisma migrate deploy
npx prisma generate
```

#### Using Docker PostgreSQL
```bash
# Start database
docker-compose up -d postgres

# Run migrations
cd backend
npx prisma migrate dev
npx prisma generate
```

### Step 3: Build and Deploy

#### Frontend (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod

# Configure custom domain
vercel domains add logiketo.com
```

#### Backend (Railway)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

### Step 4: Production Configuration

#### Nginx Configuration (if using VPS)
Create `/etc/nginx/sites-available/logiketo.com`:
```nginx
server {
    listen 80;
    server_name logiketo.com www.logiketo.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name logiketo.com www.logiketo.com;

    ssl_certificate /etc/letsencrypt/live/logiketo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/logiketo.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d logiketo.com -d www.logiketo.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Production Optimizations

### 1. Performance
- Enable gzip compression
- Use CDN for static assets
- Implement caching strategies
- Optimize database queries
- Use Redis for session storage

### 2. Security
- Enable HTTPS everywhere
- Set security headers
- Implement rate limiting
- Use environment variables for secrets
- Regular security updates

### 3. Monitoring
- Set up error tracking (Sentry)
- Monitor performance (New Relic)
- Database monitoring
- Uptime monitoring
- Log aggregation

## 📊 Monitoring Setup

### Error Tracking (Sentry)
```bash
# Install Sentry
npm install @sentry/react @sentry/node

# Configure in frontend/src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
});
```

### Performance Monitoring
```bash
# Install New Relic
npm install newrelic

# Configure in backend/src/index.ts
require('newrelic');
```

## 🔄 CI/CD Pipeline

### GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./frontend

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        uses: railway-app/railway-deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend
```

## 🚨 Backup Strategy

### Database Backups
```bash
# Daily automated backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Upload to cloud storage
aws s3 cp backup_$(date +%Y%m%d).sql s3://logiketo-backups/
```

### File Backups
- Use cloud storage (AWS S3, Google Cloud)
- Implement versioning
- Regular backup testing

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer setup
- Database read replicas
- CDN implementation
- Microservices architecture

### Vertical Scaling
- Increase server resources
- Database optimization
- Caching implementation
- Code optimization

## 🆘 Troubleshooting

### Common Issues
1. **SSL Certificate Issues**
   - Check domain DNS settings
   - Verify certificate installation
   - Test with SSL Labs

2. **Database Connection Issues**
   - Check connection string
   - Verify database is running
   - Check firewall settings

3. **Build Failures**
   - Check environment variables
   - Verify dependencies
   - Check build logs

### Support Contacts
- **Domain Provider**: [Your domain provider support]
- **Hosting Provider**: [Your hosting provider support]
- **SSL Provider**: [Let's Encrypt or Cloudflare support]

## 📋 Pre-Launch Checklist

- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] Environment variables set
- [ ] Database migrated
- [ ] Frontend deployed
- [ ] Backend deployed
- [ ] Error tracking configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] Performance optimized
- [ ] Testing completed
- [ ] Documentation updated
- [ ] Team trained
- [ ] Go-live plan ready
