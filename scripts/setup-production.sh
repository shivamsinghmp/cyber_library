#!/bin/bash
# ============================================================
# LStudy — DigitalOcean Production Setup Script
# Run once on fresh DO 4vCPU-8GB Droplet (Ubuntu 24.04)
# ============================================================
set -e

echo "🚀 Setting up LStudy production environment..."

# 1. System updates
apt-get update && apt-get upgrade -y
apt-get install -y nginx certbot python3-certbot-nginx pgbouncer curl git

# 2. Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. PM2
npm install -g pm2

# 4. Create app user
useradd -m -s /bin/bash lstudy || true
mkdir -p /var/log/lstudy
chown lstudy:lstudy /var/log/lstudy

# 5. Nginx
cp /home/lstudy/app/nginx/lstudy.conf /etc/nginx/sites-available/lstudy.in
cp /home/lstudy/app/nginx/proxy_params   /etc/nginx/proxy_params
ln -sf /etc/nginx/sites-available/lstudy.in /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 6. SSL (run after DNS is pointing to this Droplet)
# certbot --nginx -d lstudy.in -d www.lstudy.in

# 7. PgBouncer (edit /etc/pgbouncer/pgbouncer.ini after)
systemctl enable pgbouncer

# 8. DigitalOcean monitoring agent
curl -sSL https://repos.insights.digitalocean.com/install.sh | bash

# 9. Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "✅ Setup complete!"
echo "Next steps:"
echo "  1. Deploy app to /home/lstudy/app"
echo "  2. Create .env.local with all secrets"
echo "  3. Run: cd /home/lstudy/app && npm ci && npm run build"
echo "  4. Run: pm2 start ecosystem.config.js && pm2 save && pm2 startup"
echo "  5. Run: certbot --nginx -d lstudy.in -d www.lstudy.in"
echo "  6. Configure PgBouncer: /etc/pgbouncer/pgbouncer.ini"
