// pages/chat/chat.js
const OmniSocket = require('../../utils/websocket.js');

// Replace with your actual server IP/URL and Secret
// Note: For local development in WeChat DevTools, ensure "Does not verify valid domain names..." is checked in details.
// Production: Use wss://your-domain.com
const WS_URL = 'ws://localhost:3005'; 
const OMNI_SECRET = 'your-secure-secret-key'; // TODO: Move to config/env for production

Page({
  data: {
    messages: [
      { text: 'Welcome to Omni Channel!', isMe: false }
    ],
    inputValue: '',
    toView: 'scroll-bottom',
    isTyping: false
  },

  onLoad: function (options) {
    this.initSocket();
    this.recorderManager = wx.getRecorderManager();
    this.innerAudioContext = wx.createInnerAudioContext();

    this.recorderManager.onStop((res) => {
        console.log('recorder stop', res);
        const { tempFilePath } = res;
        this.uploadVoice(tempFilePath);
    });

    this.recorderManager.onError((err) => {
        console.error('recorder error', err);
    });
  },

  startRecording: function () {
    console.log('start recording');
    wx.vibrateShort();
    this.setData({ isRecording: true });
    this.recorderManager.start({
        format: 'mp3' // or aac
    });
  },

  stopRecording: function () {
      console.log('stop recording');
      this.setData({ isRecording: false });
      this.recorderManager.stop();
  },

  chooseImage: function () {
      wx.chooseImage({
          count: 1,
          sizeType: ['original', 'compressed'],
          sourceType: ['album', 'camera'],
          success: (res) => {
              const tempFilePaths = res.tempFilePaths;
              if (tempFilePaths.length > 0) {
                  this.uploadImage(tempFilePaths[0]);
              }
          }
      });
  },

  uploadImage: function (filePath) {
      wx.showLoading({ title: 'Sending Image...' });
      const serverUrl = WS_URL.replace('ws://', 'http://').replace('wss://', 'https://');
      
      wx.uploadFile({
          url: `${serverUrl}/api/upload_image`,
          filePath: filePath,
          name: 'image',
          formData: {
              'client_id': this.socket.clientId
          },
          success: (res) => {
              console.log('Image upload success', res);
              try {
                  const data = JSON.parse(res.data);
                  if (data.status === 'success') {
                      this.addMessage('[Image]', true, null, data.imageUrl);
                  } else {
                      wx.showToast({ title: 'Server Error: ' + (data.error || 'Unknown'), icon: 'none' });
                  }
              } catch (e) {
                  console.error('Parse error', e);
                  wx.showToast({ title: 'Invalid server response', icon: 'none' });
              }
          },
          fail: (err) => {
              console.error('Image upload failed', err);
              wx.showToast({ title: 'Network Error', icon: 'none' });
          },
          complete: () => {
              wx.hideLoading();
          }
      });
  },

  previewImage: function (e) {
      const src = e.currentTarget.dataset.src;
      if (src) {
          wx.previewImage({
              urls: [src],
              current: src
          });
      }
  },

  playAudio: function (e) {
      const url = e.currentTarget.dataset.audio;
      if (!url) return; // Silent return if no audio (e.g. clicking an image bubble container)
      
      console.log('Playing audio:', url);
      // Stop previous if playing
      this.innerAudioContext.stop();
      this.innerAudioContext.src = url;
      this.innerAudioContext.play();
  },

  uploadVoice: function (filePath) {
      wx.showLoading({ title: 'Sending...' });
      
      const serverUrl = WS_URL.replace('ws://', 'http://').replace('wss://', 'https://');
      
      wx.uploadFile({
          url: `${serverUrl}/api/upload_voice`,
          filePath: filePath,
          name: 'voice',
          formData: {
              'client_id': this.socket.clientId
          },
          success: (res) => {
              console.log('Upload success', res);
              try {
                  const data = JSON.parse(res.data);
                  if (data.status === 'success') {
                      this.addMessage(data.text, true, data.audioUrl);
                  } else {
                      wx.showToast({ title: 'Server Error: ' + (data.error || 'Unknown'), icon: 'none' });
                  }
              } catch (e) {
                  console.error('Parse error', e);
                  wx.showToast({ title: 'Invalid server response', icon: 'none' });
              }
          },
          fail: (err) => {
              console.error('Upload failed', err);
              wx.showToast({ title: 'Network Error', icon: 'none' });
          },
          complete: () => {
              wx.hideLoading();
          }
      });
  },

  onUnload: function () {
    if (this.socket) {
      this.socket.close();
    }
  },

  initSocket: function () {
    this.socket = new OmniSocket(WS_URL, OMNI_SECRET);
    
    // Attempt to recover previous client ID if needed, though the class handles re-auth.
    const storedClientId = wx.getStorageSync('omni_client_id');
    if (storedClientId) {
      this.socket.clientId = storedClientId;
    }

    this.socket.onMessage((data) => {
      this.handleServerMessage(data);
    });

    this.socket.connect();
  },

  handleServerMessage: function (data) {
    if (data.type === 'typing.start') {
        this.setData({ isTyping: true });
        // Scroll to bottom to show the typing bubble
        this.scrollToBottom();
    } else if (data.type === 'typing.stop') {
        this.setData({ isTyping: false });
    } else if (data.type === 'outbound_message' || data.type === 'message.send') {
      // Compatibility with both legacy 'outbound_message' and new 'message.send' protocol
      const payload = data.payload || data.data || data; 
      // The new server protocol sends { type: 'message.send', data: { ... } }
      // The client socket wrapper might just pass 'data', so we check deeply.
      
      // If we are using the socket wrapper that emits 'message' event directly with the parsed object:
      // data is the full object { type: 'message.send', data: {...} }
      
      this.setData({ isTyping: false }); // Ensure typing stops when message arrives

      const content = payload.content || payload.text;
      const audio = payload.audioUrl;
      const image = payload.imageUrl;
      
      this.addMessage(content, false, audio, image);
    } else if (data.type === 'error') {
      wx.showToast({
        title: data.message || 'Error',
        icon: 'none'
      });
    }
  },

  scrollToBottom: function() {
      this.setData({
          toView: 'msg-typing'
      });
  },

  addMessage: function (text, isMe, audioUrl, imageUrl) {
    const messages = this.data.messages;
    messages.push({ text, isMe, audioUrl, imageUrl });
    this.setData({
      messages: messages,
      toView: `msg-${messages.length - 1}` // Scroll to new message
    });
    
    // Auto-play received audio if it's not from me
    if (!isMe && audioUrl) {
        this.innerAudioContext.src = audioUrl;
        this.innerAudioContext.play();
    }
  },

  onInput: function (e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  sendMessage: function () {
    const text = this.data.inputValue.trim();
    if (!text) return;

    if (!this.socket.isConnected) {
      wx.showToast({
        title: 'Not connected',
        icon: 'none'
      });
      return;
    }

    // Send to server
    this.socket.send({
      type: 'message',
      content: text
    });

    // Optimistically add to UI
    this.addMessage(text, true);

    // Clear input
    this.setData({
      inputValue: ''
    });
  }
});
