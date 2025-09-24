const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

let wss;
const clientsMap = new Map(); // Stores ws instances keyed by userId

const initializeWebSocket = (server) => {
  wss = new WebSocket.Server({ 
    server, 
    path: '/api/stream',
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10,
      threshold: 1024
    }
  });

  // Heartbeat setup
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        console.log('Terminating inactive connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (e) {
        console.error('Ping error:', e);
      }
    });
  }, 30000);

  wss.on('connection', (ws, req) => {
    console.log('Client connected to WebSocket');

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
      console.log('Received pong from client');
    });

    // Authenticate using Authorization header or query parameter
    let token;
    const authHeader = req.headers['authorization'];
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.url && req.url.includes('token=')) {
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      token = urlParams.get('token');
    }

    if (!token) {
      console.log('No token provided, closing connection');
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      ws.userId = decoded.id;
      ws.userEmail = decoded.email;
      ws.userRole = decoded.role;

      // Store ws instance in map
      clientsMap.set(ws.userId.toString(), ws);

      console.log(`User ${decoded.email} (${decoded.role}) connected to WebSocket`);

      // Send initial connection success message
      ws.send(JSON.stringify({
        event: 'connection.established',
        data: { message: 'WebSocket connection established successfully' },
        timestamp: new Date()
      }));

    } catch (error) {
      console.error('Token verification error:', error);
      ws.close(1008, 'Invalid token');
      return;
    }

    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        console.log('Received message:', parsedMessage);
        
        // Handle different message types
        if (parsedMessage.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    ws.on('close', (code, reason) => {
      clientsMap.delete(ws.userId);
      console.log(`Client ${ws.userEmail} disconnected from WebSocket. Code: ${code}, Reason: ${reason}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clientsMap.delete(ws.userId);
    });
  });

  wss.on('close', () => {
    clearInterval(interval);
    console.log('WebSocket server closed');
  });

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
};

// Broadcast to all connected clients
const broadcastMessage = (message) => {
  if (!wss) {
    console.error('WebSocket server not initialized');
    return;
  }

  const messageString = JSON.stringify({
    ...message,
    timestamp: new Date()
  });

  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageString);
        sentCount++;
      } catch (err) {
        console.error('Failed to send message to client:', err);
      }
    }
  });
  
  console.log(`Broadcasted message to ${sentCount} clients: ${message.event}`);
};

// Send a message to a specific user
const sendToUser = (userId, message) => {
  const client = clientsMap.get(userId.toString());
  if (client && client.readyState === WebSocket.OPEN) {
    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: new Date()
      };
      client.send(JSON.stringify(messageWithTimestamp));
      console.log(`Sent message to user ${userId}: ${message.event}`);
    } catch (err) {
      console.error(`Failed to send message to user ${userId}:`, err);
    }
  } else {
    console.log(`User ${userId} is not connected or client not found`);
  }
};

// Send to multiple users
const sendToUsers = (userIds, message) => {
  userIds.forEach(userId => sendToUser(userId, message));
};

// Send to users by role
const sendToRole = (role, message) => {
  // This would require accessing user data, might need to be implemented differently
  console.log(`Send to role ${role} not fully implemented`);
};

module.exports = {
  initializeWebSocket,
  broadcastMessage,
  sendToUser,
  sendToUsers,
  sendToRole
};