import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRoutes);

// Health check endpoint (root level)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Directory Creation Wizard API is running' });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});

export default app;
