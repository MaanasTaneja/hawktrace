const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('URL parameter is required');
  }

  try {
    const response = await axios.get(targetUrl, {
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    let html = response.data;

    // Strip security headers that block iframes
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Frame-Options');

    // Inject <base> tag to fix relative assets (images, css, js)
    const baseUrl = new URL(targetUrl).origin;
    const baseTag = `<base href="${baseUrl}/">`;
    
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}`);
    } else if (html.includes('<html>')) {
      html = html.replace('<html>', `<html><head>${baseTag}</head>`);
    } else {
      html = baseTag + html;
    }

    // Optional: Strip any <meta> tags that specify CSP
    html = html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/gi, '');
    html = html.replace(/<meta http-equiv="X-Frame-Options" content="[^"]*">/gi, '');

    res.send(html);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send(`Error fetching URL: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Vigil Proxy Server running at http://localhost:${PORT}`);
  console.log(`Example: http://localhost:${PORT}/proxy?url=https://parallel.ai`);
});
