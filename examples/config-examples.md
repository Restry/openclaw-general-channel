# Generic Channel Configuration Examples

## Example 1: WebSocket Mode (Default)

```yaml
channels:
  generic:
    enabled: true
    connectionMode: "websocket"
    wsPort: 8080
    wsPath: "/ws"
    dmPolicy: "open"
    historyLimit: 10
    textChunkLimit: 4000
```

## Example 2: Webhook Mode

```yaml
channels:
  generic:
    enabled: true
    connectionMode: "webhook"
    webhookPath: "/generic/events"
    webhookPort: 3000
    webhookSecret: "your-secret-key"
    dmPolicy: "open"
    historyLimit: 10
    textChunkLimit: 4000
```

## Example 3: With Allowlist (Restricted Access)

```yaml
channels:
  generic:
    enabled: true
    connectionMode: "websocket"
    wsPort: 8080
    wsPath: "/ws"
    dmPolicy: "allowlist"
    allowFrom:
      - "user-123"
      - "user-456"
      - "admin-user"
    historyLimit: 10
    textChunkLimit: 4000
```

## Example 4: Pairing Mode (Approval Required)

```yaml
channels:
  generic:
    enabled: true
    connectionMode: "websocket"
    wsPort: 8080
    wsPath: "/ws"
    dmPolicy: "pairing"
    historyLimit: 10
    textChunkLimit: 4000
```

## Example 5: Combined with Feishu Channel

```yaml
channels:
  feishu:
    enabled: true
    appId: "cli_xxxxx"
    appSecret: "your_app_secret"
    connectionMode: "websocket"
    dmPolicy: "pairing"
    groupPolicy: "allowlist"
    requireMention: true
    
  generic:
    enabled: true
    connectionMode: "websocket"
    wsPort: 8080
    wsPath: "/ws"
    dmPolicy: "open"
    historyLimit: 10
    textChunkLimit: 4000
```

## Testing Your Configuration

1. Save your config to `~/.openclaw/config.yaml` or your OpenClaw config location
2. Start OpenClaw:
   ```bash
   openclaw start
   ```
3. Check the logs to verify the Generic Channel started successfully:
   ```
   [generic] WebSocket server started on port 8080 at path /ws
   ```
4. Open `examples/h5-client.html` in your browser
5. Connect using `ws://localhost:8080/ws` (or your configured port/path)

## Environment-Specific Configurations

### Development
```yaml
channels:
  generic:
    enabled: true
    connectionMode: "websocket"
    wsPort: 8080
    dmPolicy: "open"
```

### Production
```yaml
channels:
  generic:
    enabled: true
    connectionMode: "webhook"
    webhookPath: "/generic/events"
    webhookPort: 3000
    webhookSecret: "${GENERIC_WEBHOOK_SECRET}"
    dmPolicy: "allowlist"
    allowFrom:
      - "${APPROVED_USER_1}"
      - "${APPROVED_USER_2}"
```

## Troubleshooting

### WebSocket Connection Failed
- Check if the port is already in use: `lsof -i :8080`
- Verify firewall settings allow the port
- Check OpenClaw logs for error messages

### Messages Not Being Received
- Verify the chatId in your client matches what you configured
- Check if dmPolicy is "allowlist" and your user is in allowFrom
- Look for errors in browser console and OpenClaw logs

### Configuration Not Applied
- Restart OpenClaw after config changes
- Verify YAML syntax is correct (indentation matters)
- Check OpenClaw logs for config validation errors
