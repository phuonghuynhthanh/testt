#!/usr/bin/env bash
# READ-ONLY survey of a shared VPS before deploying. Changes nothing.
# Usage: ssh user@vps 'bash -s' < tools/vps_survey.sh > survey.txt
# Review survey.txt for secrets before sharing it.
echo "== OS / resources"; . /etc/os-release; echo "$PRETTY_NAME"; nproc; free -m; df -h / /var/lib/docker 2>/dev/null
echo; echo "== whoami / groups"; id
echo; echo "== listening ports"; (ss -tlnp 2>/dev/null || sudo -n ss -tlnp 2>/dev/null) | awk 'NR==1 || /LISTEN/ {print $1,$4,$6}'
echo; echo "== docker"; docker --version 2>&1; docker compose version 2>&1
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' 2>&1
docker network ls 2>&1; docker volume ls 2>&1
echo; echo "== web server"; for s in nginx apache2 caddy traefik; do systemctl is-active $s 2>/dev/null | sed "s/^/$s: /"; done
ls /etc/nginx/sites-enabled /etc/nginx/conf.d 2>&1
echo; echo "== nginx server_names"; grep -rhE "^\s*(server_name|listen)\s" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | sort -u
echo; echo "== certbot"; certbot certificates 2>&1 | grep -E "Certificate Name|Domains" 
echo; echo "== firewall"; ufw status 2>&1 | head -15
echo; echo "== free tcp ports among candidates"; for p in 8010 9100 5432; do ss -tln | grep -q ":$p " && echo "$p IN USE" || echo "$p free"; done
