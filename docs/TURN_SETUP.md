# TURN Server Setup Guide (COTURN)

This guide explains how to set up a COTURN server for ShareUs Cloud Rooms using Docker. A TURN server is essential for WebRTC connectivity when users are behind restrictive firewalls or NATs.

## Prerequisites
- A server with a public IP address (e.g., AWS EC2, DigitalOcean Droplet).
- Docker and Docker Compose installed.
- A domain name pointing to your server (optional but recommended for TLS).

## 1. Docker Compose Configuration

Create a `docker-compose.yml` file on your TURN server:

```yaml
version: '3.8'

services:
  coturn:
    image: coturn/coturn
    restart: always
    network_mode: host
    environment:
      - TURN_REALM=your-domain.com # Or your public IP
      - TURN_SECRET=your-turn-secret # MUST match TURN_SECRET in your app's .env
    command:
      - -n
      - --log-file=stdout
      - --min-port=49152
      - --max-port=65535
      - --realm=your-domain.com
      - --listening-port=3478
      - --tls-listening-port=5349
      - --external-ip=$(detect-external-ip) # Or hardcode your public IP
      - --user=user:password # Temporary user for testing
      - --lt-cred-mech
      - --fingerprint
      - --no-multicast-peers
      - --no-cli
```

## 2. Configuration Steps

1.  **Set `TURN_REALM`**: Use your domain name or public IP.
2.  **Set `TURN_SECRET`**: Generate a strong random string. **This MUST match the `TURN_SECRET` in your ShareUs application's `.env` file.**
3.  **Ports**: Ensure the following ports are open in your firewall (Security Group / UFW):
    -   `3478` (TCP/UDP)
    -   `5349` (TCP/UDP) - if using TLS
    -   `49152-65535` (UDP) - Relay ports

## 3. Running the Server

```bash
docker-compose up -d
```

## 4. Testing

You can test your TURN server using [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/).
1.  Add your TURN server URI: `turn:your-ip:3478`
2.  Enter username and password (if you added a static user) or generate one using the secret.
3.  Click "Gather candidates". You should see candidates of type `relay`.

## 5. Update ShareUs App

Update your `server/.env` file:

```env
TURN_SECRET=your-turn-secret
TURN_URL=your-ip-or-domain
```
