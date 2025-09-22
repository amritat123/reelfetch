const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://yourdomain.com'
      ];
  
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
  
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
  
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  };
  
  module.exports = corsOptions;