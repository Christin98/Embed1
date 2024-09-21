import React, { useEffect, useRef, useState } from 'react';
import { models } from 'powerbi-client';
import * as pbi from 'powerbi-client';
import './PowerBIDashboard.css';

const PowerBIDashboard = () => {
  const embedContainer = useRef(null);
  const tileRef = useRef(null); // Ref to store the embedded tile
  const [embedConfig, setEmbedConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [embedInterval, setEmbedInterval] = useState(null); // To store the interval ID

  // Function to fetch embed data from the backend
  const fetchEmbedData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/embed-dashboard');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched Embed Data:', data);

      if (data.embedUrl && data.token) {
        setEmbedConfig({
          type: 'report', // Changed from 'tile' to 'dashboard' if embedding a dashboard
          id: '8c808e76-3944-4a6a-8a06-4460cb1c4e7a',
          // dashboardId: 'ff89b26e-20fe-4a7d-b481-9f04f06805a3', // Replace with your actual dashboard ID
          embedUrl: data.embedUrl,
          accessToken: data.token,
          tokenType: models.TokenType.Embed,
          permissions: models.Permissions.All,
          settings: {
            filterPaneEnabled: true,
            navContentPaneEnabled: true,
          },
        });
      } else {
        console.error('Embed URL or Token is missing in the response.');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching embed data:', error);
      setLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchEmbedData();
  }, []);

  // Function to embed the dashboard
  const embedDashboard = () => {
    if (embedConfig && embedContainer.current) {
      const powerbiService = new pbi.service.Service(
        pbi.factories.hpmFactory,
        pbi.factories.wpmpFactory,
        pbi.factories.routerFactory
      );

      // Reset any existing embeds in the container to prevent conflicts
      powerbiService.reset(embedContainer.current);

      // Embed the dashboard
      const dashboard = powerbiService.embed(embedContainer.current, embedConfig);
      console.log('Embedding dashboard:', dashboard);

      // Store the dashboard instance in the ref
      tileRef.current = dashboard;

      // Handle dashboard loaded event
      dashboard.on('loaded', () => {
        console.log('Dashboard loaded successfully.');
      });

      // Handle error event
      dashboard.on('error', (event) => {
        console.error('Dashboard error:', event.detail);
        dashboard.off('error'); // Remove the listener after handling
      });
    }
  };

  // Embed the dashboard once embedConfig is set and set up the refresh interval
  useEffect(() => {
    if (embedConfig) {
      embedDashboard();

      // Set up an interval to refresh the embed every 5 seconds
      const intervalId = setInterval(() => {
        console.log('Refreshing dashboard embed...');

        // Define an asynchronous function to reload the dashboard
        const reloadDashboard = async () => {
          if (tileRef.current) {
            try {
              await tileRef.current.refresh();
              console.log('Dashboard reloaded successfully.');
            } catch (errors) {
              console.error('Error reloading dashboard:', errors);
            }
          } else {
            console.warn('Tile reference is not available.');
          }
        };

        // Call the asynchronous reload function
        reloadDashboard();
      }, 15000); // 5000 milliseconds = 5 seconds

      setEmbedInterval(intervalId);

      // Clean up the interval on component unmount
      return () => clearInterval(intervalId);
    }
  }, [embedConfig]);

  return (
    <div className="dashboard-page">
      <header className="header">
        <div className="logo">
          <img src="/logo.png" alt="Company Logo" />
          <h1>Vehicle Analytics</h1>
        </div>
        <nav>
          <ul>
            <li><a href="#">Dashboard</a></li>
            <li><a href="#">Reports</a></li>
            <li><a href="#">Analytics</a></li>
            <li><a href="#">Contact Us</a></li>
          </ul>
        </nav>
      </header>

      <main className="main-content">
        <h2>Real-Time Vehicle Statistics</h2>
        {loading ? (
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="dashboard-container" ref={embedContainer}></div>
        )}
      </main>

      <footer className="footer">
        <p>&copy; 2024 Vehicle Analytics Company. All rights reserved.</p>
        <div className="social-media">
          <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
          <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
          <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
        </div>
      </footer>
    </div>
  );
};

export default PowerBIDashboard;
