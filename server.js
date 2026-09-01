require('dotenv').config({ path: './.env' });

const path = require('path');
const http = require('http');

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const errorHandler = require('./middleware/error.middleware');
const authSocketMiddleware = require('./sockets/auth.socket');

const { init } = require('./socket');

const {
  recoverActiveGames,
  recoverParties,
} = require('./services/game-recovery.service');

const { loadCountryLookup } = require('./services/country.service');
const { loadTerritoryMappings } = require('./services/territory-mappings.service');
const { checkStatResets } = require('./services/lazy-stats-reset.service');
const { fetchCountries } = require('./services/countries.service');

const { registerPartyEvents } = require('./handlers/party.handler');
const { registerTimerEvents } = require('./handlers/timer.handler');
const { registerGameEvents } = require('./sockets/game.socket');

// Routes
const gameRoutes = require('./routes/game.routes');
const authRoutes = require('./routes/auth.routes');
const mapCreationRoutes = require('./routes/map-creation.routes');
const mapRoutes = require('./routes/map.routes');
const tagRoutes = require('./routes/tag.routes');
const usersRoutes = require('./routes/users.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const partyRoutes = require('./routes/party.routes');
const streetViewRoutes = require('./routes/street-view.routes');
const gamePageRoutes = require('./routes/game-page.routes');
const countriesRoutes = require('./routes/countries.routes');
const { showStartupBanner, showStartupError, showStartupSection } = require('./utils/startup-console');

const app = express();
const server = http.createServer(app);
const io = init(server);

global.io = io;

const PORT = process.env.PORT || 3000;

// APP CONFIGURATION
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// SECURITY
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://maps.googleapis.com',
        ],

        connectSrc: [
          "'self'",
          'ws:',
          'https://maps.googleapis.com',
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
        ],

        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://maps.gstatic.com',
          'https://maps.googleapis.com',
          'https://fonts.gstatic.com',
          'https://streetviewpixels-pa.googleapis.com',
          'https://lh3.googleusercontent.com',
          'https://cbk0.google.com',
          'https://*.ggpht.com',
          'https://flagcdn.com',
        ],

        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
        ],
      },
    },
  })
);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  next();
});

// MIDDLEWEARE
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

// SOCKET.IO
io.use(authSocketMiddleware);
io.of('/game').use(authSocketMiddleware);

// BACKGROUD JOBS
require('./jobs/leaderboard-reset.job');

// ROUTES
app.use('/', gamePageRoutes);

app.use('/api/game', gameRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/mapCreationRoutes', mapCreationRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/party', partyRoutes);
app.use('/api/random-sv', streetViewRoutes);

// ERROR HANDLING
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// This must stay after all routes.
app.use(errorHandler);

// STARTUP
async function startServer() {
  showStartupBanner();

  try {
    showStartupSection('Connecting to database');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connection established.');

    showStartupSection('Registering socket events');

    registerPartyEvents();
    registerGameEvents();
    registerTimerEvents();

    showStartupSection('Restoring server state');

    await recoverActiveGames();
    await recoverParties();

    showStartupSection('Loading application data');

    await loadCountryLookup();
    await fetchCountries();
    await loadTerritoryMappings();

    showStartupSection('Checking statistics');

    await checkStatResets();

    showStartupSection('Starting HTTP server');

    server.listen(PORT, () => {
      console.log(`  http://localhost:${PORT}\n`);
      console.log('Server is running and ready to accept connections.');
    });
  } catch (error) {
    showStartupError(error);

    process.exit(1);
  }
}

// PROCESS ERRORS
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);

  shutdown(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);

  shutdown(1);
});

async function shutdown(exitCode = 0) {
  try {
    server.close();
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error while shutting down:', error);
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());

startServer();