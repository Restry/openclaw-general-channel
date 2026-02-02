// utils/websocket.js

class OmniSocket {
  constructor(url, secret) {
    this.url = url;
    this.secret = secret;
    this.socketTask = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.baseReconnectDelay = 1000;
    this.clientId = null;
    this.messageHandlers = [];
  }

  connect() {
    if (this.isConnected) return;

    console.log('Connecting to WebSocket...', this.url);
    this.socketTask = wx.connectSocket({
      url: this.url,
      success: () => console.log('Socket connecting...'),
      fail: (err) => {
        console.error('Socket connect failed', err);
        this.handleReconnect();
      }
    });

    this.socketTask.onOpen(() => {
      console.log('Socket opened. Authenticating...');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.authenticate();
    });

    this.socketTask.onMessage((res) => {
      try {
        const data = JSON.parse(res.data);
        console.log('Received:', data);
        this.handleMessage(data);
      } catch (e) {
        console.error('Parse error', e);
      }
    });

    this.socketTask.onClose((res) => {
      console.log('Socket closed', res);
      this.isConnected = false;
      this.handleReconnect();
    });

    this.socketTask.onError((err) => {
      console.error('Socket error', err);
      // onError usually precedes onClose, so we'll handle reconnect in onClose
    });
  }

  authenticate() {
    const authPayload = {
      type: 'auth',
      token: this.secret
    };
    if (this.clientId) {
      authPayload.client_id = this.clientId;
    }
    this.send(authPayload);
  }

  handleMessage(data) {
    if (data.type === 'auth_success') {
      console.log('Auth success. Client ID:', data.client_id);
      this.clientId = data.client_id;
      // Store client ID locally if needed for session persistence
      wx.setStorageSync('omni_client_id', this.clientId);
    } else {
      // Notify listeners
      this.messageHandlers.forEach(handler => handler(data));
    }
  }

  send(data) {
    if (!this.isConnected) {
      console.warn('Socket not connected, cannot send');
      return;
    }
    // WeChat sendSocketMessage expects string for data, not object wrapping 'data'
    // Actually, wx.connectSocket returns a SocketTask. 
    // socketTask.send(Object object) -> object.data is string/ArrayBuffer.
    // The previous code was `this.socketTask.send({ data: message })` which is CORRECT for SocketTask.
    // BUT, some mini-program frameworks vary. The standard WeChat Mini Program API is correct.
    // Double checking: https://developers.weixin.qq.com/miniprogram/dev/api/network/websocket/SocketTask.send.html
    // Yes, object with 'data' property.
    
    // However, let's make sure 'data' is correctly structured before JSON.stringify if it's not already.
    // The input 'data' to this function is an object.
    
    const message = JSON.stringify(data);
    this.socketTask.send({
      data: message,
      fail: (err) => {
          console.error('Send failed', err);
          // If send fails, it might be due to connection drop not yet detected.
          // We can trigger a check or reconnect logic?
          // For now just log.
      }
    });
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts + 1})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  close() {
    if (this.socketTask) {
      this.socketTask.close();
    }
  }
}

module.exports = OmniSocket;
