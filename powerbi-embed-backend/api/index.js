// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const {
  TENANT_ID,
  CLIENT_ID,
  CLIENT_SECRET,
  GROUP_ID,
  DASHBOARD_ID,
  TILE_ID,
  REPORT_ID
} = process.env;

let cachedToken = null;
let tokenExpiry = null;

// Function to get access token from Azure AD
const getAccessToken = async () => {
  const tokenEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('scope', 'https://analysis.windows.net/powerbi/api/.default');

  const corsOptions = {
    origin: "https://relogpt.azurewebsites.net", // Only allow this origin
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Enable if you need to include credentials like cookies or authorization headers
  };
  
  app.use(cors(corsOptions));
  app.options("https://relogpt.azurewebsites.net", cors(corsOptions));

  try {
    const response = await axios.post(tokenEndpoint, params);
    return response.data.access_token;
  } catch (error) {
    console.error('Error obtaining access token:', error.response?.data || error.message);
    throw error;
  }
};

// Function to get embed token with caching
const getEmbedToken = async () => {
  const currentTime = new Date().getTime();

  if (cachedToken && tokenExpiry && currentTime < tokenExpiry) {
    // Return cached token if not expired
    return cachedToken;
  }

  try {
    const accessToken = await getAccessToken();
    console.log('Access Token obtained.', accessToken);

    // API endpoint to generate embed token
    const embedTokenEndpoint = `https://api.powerbi.com/v1.0/myorg/groups/${GROUP_ID}/reports/${REPORT_ID}/GenerateToken`;

    // Request body
    const body = {
      accessLevel: 'View',
    };

    const embedTokenResponse = await axios.post(embedTokenEndpoint, body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('Embed Token generated.');

    // Cache the token and set expiry (assuming token is valid for 60 minutes)
    cachedToken = embedTokenResponse.data.token;
    tokenExpiry = currentTime + 60 * 60 * 1000; // 60 minutes in milliseconds

    return cachedToken;
  } catch (error) {
    console.error('Error generating embed token:', error.response?.data || error.message);
    throw error;
  }
};

// Endpoint to get embed token and URL
app.get('/api/embed-dashboard', async (req, res) => {
  try {
    const token = await getEmbedToken();
    console.log('Using cached Embed Token.');

    // Use the cached access token to get embed URL
    const accessToken = await getAccessToken();

    // API endpoint to get embed URL
    const dashboardInfoEndpoint = `https://api.powerbi.com/v1.0/myorg/groups/${GROUP_ID}/reports/${REPORT_ID}`;

    const dashboardInfoResponse = await axios.get(dashboardInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('Dashboard Info fetched.');

    const embedUrl = dashboardInfoResponse.data.embedUrl;

    res.json({
      embedUrl,
      token,
    });
  } catch (error) {
    console.error('Error generating embed token:', error.response?.data || error.message);
    res.status(500).send('Failed to generate embed token');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
