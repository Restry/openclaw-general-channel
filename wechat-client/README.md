# Omni-Channel WeChat Client

This is a WeChat Mini Program client for the Omni-Channel chat system.

## Setup Instructions

1.  **Install WeChat Developer Tools:**
    Download and install the [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html).

2.  **Import Project:**
    -   Open WeChat Developer Tools.
    -   Select "Import Project" (or "Mini Program" -> "Import").
    -   Choose the `wechat-client` folder in this repository (`.../omni-channel/wechat-client`).
    -   **AppID:** Use `touristappid` (Test Account) or your own registered AppID.

3.  **Local Development Configuration:**
    -   The server is configured to run on `ws://localhost:3005`.
    -   In the WeChat Developer Tools toolbar, click **Details** (or "Project Settings").
    -   Under the **Local Settings** tab, check the box: **"Does not verify valid domain names, web-view (business domain names), TLS versions and HTTPS certificates"**.
    -   *Why?* Real WeChat Mini Programs require `wss://` (SSL) and registered domains. For localhost development, this check must be disabled.

4.  **Update Configuration:**
    -   Open `pages/chat/chat.js`.
    -   Ensure `WS_URL` matches your running server (default: `ws://localhost:3005`).
    -   Ensure `OMNI_SECRET` matches the `OMNI_SECRET` in your server's `.env` file.

## Running the Client

1.  Start the backend server:
    ```bash
    # From the root omni-channel directory
    npm start
    # or
    node server.js
    ```
2.  The Mini Program in the simulator should connect automatically.
3.  Type a message and hit "Send".
4.  Green bubbles are your messages. White bubbles are responses (or outbound messages) from the bot/server.

## Features

-   **WebSocket Integration:** Persists connection and handles authentication handshake.
-   **Auto-Reconnect:** Implements exponential backoff if the server goes down.
-   **Chat UI:** Basic interface with scrollable message history and distinct styles for sent/received messages.
