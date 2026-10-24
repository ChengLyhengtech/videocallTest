import * as signalR from '@microsoft/signalr';

class SignalRService {
  constructor() {
    this.connection = null;
    this.listeners = {
      onReceiveVideoOffer: null,
      onReceiveVideoAnswer: null,
      onReceiveIceCandidate: null,
      onReceiveCallEnded: null,
      onStatusChange: null,
      onLog: null,
    };
  }

  setCallbacks(callbacks) {
    this.listeners = { ...this.listeners, ...callbacks };
  }

  log(message, type = 'info', data = null) {
    if (this.listeners.onLog) {
      this.listeners.onLog({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        source: 'SignalR',
        message,
        type,
        data,
      });
    }
    console.log(`[SignalR] ${message}`, data || '');
  }

  isConnected() {
    return this.connection && this.connection.state === signalR.HubConnectionState.Connected;
  }

  getConnectionState() {
    return this.connection ? this.connection.state : signalR.HubConnectionState.Disconnected;
  }

  async connect(hubUrl, jwtToken, options = {}) {
    if (this.isConnected()) {
      this.log('Already connected to SignalR Hub', 'warning');
      return;
    }

    this.log(`Initiating connection to ${hubUrl}...`, 'info');
    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange(signalR.HubConnectionState.Connecting);
    }

    try {
      // Configure transport based on options
      // Default: WebSockets with automatic fallback to LongPolling
      const transportType =
        options.transport === 'WebSocketsOnly'
          ? signalR.HttpTransportType.WebSockets
          : options.transport === 'LongPollingOnly'
          ? signalR.HttpTransportType.LongPolling
          : signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling;

      const skipNegotiation = options.transport === 'WebSocketsOnly';

      const builder = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => (jwtToken ? jwtToken.trim() : ''),
          skipNegotiation,
          transport: transportType,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information);

      this.connection = builder.build();

      // Register incoming handlers exactly as defined in VideoCallHub
      this.connection.on('ReceiveVideoOffer', (senderUserId, offer) => {
        this.log(`Received video offer from [${senderUserId}]`, 'success', offer);
        if (this.listeners.onReceiveVideoOffer) {
          this.listeners.onReceiveVideoOffer(senderUserId, offer);
        }
      });

      this.connection.on('ReceiveVideoAnswer', (senderUserId, answer) => {
        this.log(`Received video answer from [${senderUserId}]`, 'success', answer);
        if (this.listeners.onReceiveVideoAnswer) {
          this.listeners.onReceiveVideoAnswer(senderUserId, answer);
        }
      });

      this.connection.on('ReceiveIceCandidate', (senderUserId, candidate) => {
        this.log(`Received ICE Candidate from [${senderUserId}]`, 'info', candidate);
        if (this.listeners.onReceiveIceCandidate) {
          this.listeners.onReceiveIceCandidate(senderUserId, candidate);
        }
      });

      this.connection.on('ReceiveCallEnded', (senderUserId) => {
        this.log(`Call terminated by [${senderUserId}]`, 'warning');
        if (this.listeners.onReceiveCallEnded) {
          this.listeners.onReceiveCallEnded(senderUserId);
        }
      });

      // Lifecycle events
      this.connection.onreconnecting((error) => {
        this.log(`Reconnecting to SignalR Hub... ${error ? error.message : ''}`, 'warning');
        if (this.listeners.onStatusChange) {
          this.listeners.onStatusChange(signalR.HubConnectionState.Reconnecting);
        }
      });

      this.connection.onreconnected((connectionId) => {
        this.log(`Reconnected to SignalR Hub. Connection ID: ${connectionId}`, 'success');
        if (this.listeners.onStatusChange) {
          this.listeners.onStatusChange(signalR.HubConnectionState.Connected);
        }
      });

      this.connection.onclose((error) => {
        this.log(`SignalR connection closed ${error ? ': ' + error.message : ''}`, 'error');
        if (this.listeners.onStatusChange) {
          this.listeners.onStatusChange(signalR.HubConnectionState.Disconnected);
        }
      });

      await this.connection.start();
      this.log(`Connected to SignalR Hub. Connection ID: ${this.connection.connectionId}`, 'success');
      if (this.listeners.onStatusChange) {
        this.listeners.onStatusChange(signalR.HubConnectionState.Connected);
      }
    } catch (err) {
      this.log(`Connection failed: ${err.message}`, 'error', err);
      if (this.listeners.onStatusChange) {
        this.listeners.onStatusChange(signalR.HubConnectionState.Disconnected);
      }
      throw err;
    }
  }

  async disconnect() {
    if (this.connection) {
      try {
        this.log('Disconnecting from SignalR Hub...', 'info');
        await this.connection.stop();
        this.log('Disconnected from SignalR Hub', 'info');
      } catch (err) {
        this.log(`Error during disconnect: ${err.message}`, 'error');
      } finally {
        this.connection = null;
        if (this.listeners.onStatusChange) {
          this.listeners.onStatusChange(signalR.HubConnectionState.Disconnected);
        }
      }
    }
  }

  /**
   * Helper to serialize payload if needed, or pass raw object
   */
  preparePayload(data) {
    if (!data) return data;
    if (typeof data === 'object' && typeof data.toJSON === 'function') {
      return data.toJSON();
    }
    return data;
  }

  async sendVideoOffer(targetUserId, offer) {
    if (!this.isConnected()) throw new Error('SignalR is not connected');
    const payload = this.preparePayload(offer);
    this.log(`Invoking SendVideoOffer to [${targetUserId}]`, 'info', payload);
    return await this.connection.invoke('SendVideoOffer', targetUserId, payload);
  }

  async sendVideoAnswer(targetUserId, answer) {
    if (!this.isConnected()) throw new Error('SignalR is not connected');
    const payload = this.preparePayload(answer);
    this.log(`Invoking SendVideoAnswer to [${targetUserId}]`, 'info', payload);
    return await this.connection.invoke('SendVideoAnswer', targetUserId, payload);
  }

  async sendIceCandidate(targetUserId, candidate) {
    if (!this.isConnected()) throw new Error('SignalR is not connected');
    const payload = this.preparePayload(candidate);
    this.log(`Invoking SendIceCandidate to [${targetUserId}]`, 'info', payload);
    return await this.connection.invoke('SendIceCandidate', targetUserId, payload);
  }

  async endVideoCall(targetUserId) {
    if (!this.isConnected()) {
      this.log('Cannot invoke EndVideoCall: SignalR disconnected', 'warning');
      return;
    }
    this.log(`Invoking EndVideoCall to [${targetUserId}]`, 'warning');
    return await this.connection.invoke('EndVideoCall', targetUserId);
  }
}

export const signalRService = new SignalRService();
