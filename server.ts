import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Apollo API Proxy
  app.post('/api/prospects/search', async (req, res) => {
    try {
      const { prompt, filters } = req.body;
      const apiKey = process.env.APOLLO_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: 'Apollo API key not configured' });
      }

      // We'll use Apollo's mixed_people search
      // Documentation: https://apolloio.github.io/apollo-api-docs/#search-for-people-and-organizations
      const response = await axios.post('https://api.apollo.io/v1/mixed_people/search', {
        api_key: apiKey,
        q_keywords: prompt,
        person_locations: filters?.region ? [filters.region] : undefined,
        // You can add more mapping here based on the intent parsing
      });

      res.json(response.data);
    } catch (error: any) {
      console.error('Apollo API error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch prospects from Apollo',
        details: error.response?.data || error.message
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
