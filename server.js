// server.js
require('dotenv').config({ path: './.env' });

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const server = require("http").createServer(app);
const io = require("./socket").init(server);
global.io = io;

app.set("views", path.join(__dirname, "views"));

// Set EJS as the default template engine
app.set("view engine", "ejs");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          // Google Maps injects a small inline bootstrap script when the API
          // is loaded asynchronously. Allow that required bootstrap code.
          "'unsafe-inline'",
          "https://maps.googleapis.com"
        ],
        connectSrc: [
          "'self'",
          "ws:",
          "https://maps.googleapis.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://maps.gstatic.com",
          "https://maps.googleapis.com",
          "https://fonts.gstatic.com",
          "https://streetviewpixels-pa.googleapis.com",
          "https://lh3.googleusercontent.com",
          "https://cbk0.google.com",
          "https://*.ggpht.com",
          "https://flagcdn.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
      },
    },
  })
);

// Additional Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME sniffing
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // HTTPS only
  next();
});

// Performance Enhancements
app.use(compression()); // Gzip compression
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static frontend with caching
app.use(express.static(path.join(__dirname, 'public')));

// API ROUTES
const authSocketMiddleware = require('./sockets/auth.socket');

// Jobs
require("./jobs/leaderboard-reset.job");

const { recoverActiveGames, recoverParties } = require("./services/game-recovery.service");
const { registerPartyEvents } = require('./handlers/party.handler');
const { registerTimerEvents } = require('./handlers/timer.handler');
const { registerGameEvents } = require('./sockets/game.socket');
const { loadCountryLookup } = require("./services/country.service");
const { loadTerritoryMappings } = require('./services/territory-mappings.service');
const { checkStatResets } = require('./services/lazy-stats-reset.service');
const { fetchCountries } = require('./services/countries.service');

// Server init functions
const gameRoutes = require('./routes/game.routes');
const authRoutes = require('./routes/auth.routes');
const mapCreationRoutes = require('./routes/map-creation.routes');
const mapRoutes = require('./routes/map.routes');
const tagRoutes = require('./routes/tag.routes');
const usersRoutes = require('./routes/users.routes');
const leaderboardRoute = require('./routes/leaderboard.routes');
const partyRoute = require('./routes/party.routes');
const streetViewRoutes = require("./routes/street-view.routes");
const gamePageRoutes = require("./routes/game-page.routes");
const countriesRoute = require('./routes/countries.routes');

io.use(authSocketMiddleware);
io.of('/game').use(authSocketMiddleware);

app.use("/", gamePageRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/mapCreationRoutes', mapCreationRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/countries', countriesRoute);
app.use('/api/leaderboard', leaderboardRoute);
app.use('/api/party', partyRoute);
app.use("/api/random-sv", streetViewRoutes);

// Automaticly redirect users to error site whenerver a certain site could not be found
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// CONNECT TO MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(`[${new Date().toISOString()}] MongoDB connected`))
  .catch(err => console.error(err));

// START SERVER
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`);

  try {
    // SOCKET.IO
    registerPartyEvents();
    registerGameEvents();
    registerTimerEvents();

    // Restore games
    await recoverActiveGames();
    // Restore parties
    await recoverParties();

    // Cache country ISO to name tables
    await loadCountryLookup();
    // Caches all countries
    await fetchCountries();
    // Cache territory mappings
    await loadTerritoryMappings();
    // Checks if the daily and monthly stats aren't expired and resets them if so
    await checkStatResets();

    console.log(`[${new Date().toISOString()}] Server successfully initiated`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Server failed to initiate:`, err);
    process.exit(1);
  }
});
