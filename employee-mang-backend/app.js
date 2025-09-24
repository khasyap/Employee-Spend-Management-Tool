const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config(); // Add this line
const http = require('http');
const WebSocket = require('ws');

// Import routes
const authRoutes = require('./routes/auth.routes');
const employeeRoutes = require('./routes/employee.routes');
const managerRoutes = require('./routes/manager.routes');
const financeRoutes = require('./routes/finance.routes');
const adminRoutes = require('./routes/admin.routes');
const usersRoutes = require('./routes/users'); // assuming users.js exports a router
const indexRoutes = require('./routes/index'); // optional, depends on your setup
const authMiddleware = require('./middlewares/auth.middleware');
// Environment variables
const MONGO_URI = 'mongodb://localhost:27017/expenses-manager';
const PORT = 5000;
const CLIENT_URL = 'http://localhost:4200';
console.log('JWT Secret:', process.env.JWT_SECRET ? 'Set' : 'Not set'); // Debug
// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const app = express();

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Register all routes
app.use('/api/auth', authRoutes);

// Protected routes - apply auth middleware
app.use('/api/employee', authMiddleware, employeeRoutes);
app.use('/api/manager', authMiddleware, require('./middlewares/role.middleware')('manager'), managerRoutes);
app.use('/api/finance', authMiddleware, require('./middlewares/role.middleware')('finance'), financeRoutes);
app.use('/api/admin', authMiddleware, require('./middlewares/role.middleware')('admin'), adminRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// --- Create HTTP + WebSocket Server ---
const server = http.createServer(app);

// WebSocket server at /api/stream
const wss = new WebSocket.Server({ server, path: "/api/stream" });

wss.on('connection', (ws) => {
  console.log("New WebSocket client connected");

  // Optional: Authenticate if client sends token
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'auth') {
        console.log("Auth token received:", data.token);
        // TODO: verify JWT token here if needed
      } else {
        console.log("Message from client:", data);
      }
    } catch (err) {
      console.error("Error parsing message:", err);
    }
  });

  ws.send(JSON.stringify({ type: "welcome", message: "Connected to WebSocket server" }));

  ws.on('close', () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server listening on ws://localhost:${PORT}/api/stream`);
});
