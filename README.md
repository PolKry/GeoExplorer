# GeoExplorer

**GeoExplorer** is a web-based geography game inspired by [GeoGuessr](https://www.geoguessr.com/).

The idea is simple: you're given a location somewhere in the world, and you have to figure out where you are. The closer your guess is, the more points you get.

The project started as a way to learn more about web development, multiplayer systems, and working with geographic data.

---

## Features

* **Explore** different locations around the world
* **Multiple game modes**

  * Points
  * Country Streak
  * FFA
  * Teams
* **Multiplayer parties** with friends
* **Custom maps**
* User accounts and statistics
* Map categories and tags
* Round timers and scoring
* Real-time multiplayer using Socket.IO

---

## Tech Stack

| Part            | Technology                |
| --------------- | ------------------------- |
| Frontend        | HTML, CSS, JavaScript     |
| Backend         | Node.js, Express          |
| Database        | MongoDB, Mongoose         |
| Multiplayer     | Socket.IO                 |
| Authentication  | JWT, bcrypt               |
| Maps            | Google Maps / Street View |
| Geographic data | Turf.js, GeoJSON          |

---

## How It Works

A game consists of multiple rounds. Each round gives the player a location, and they have to place their guess on the map.

The distance between the actual location and the player's guess is then used to calculate the score.

Different game modes change how the rounds and scoring work.

### Multiplayer

Players can create a party and share a **party code** with their friends.

The server keeps everyone synchronized in real time, including:

* Players and teams
* Game state
* Rounds
* Timers
* Results

---

## Maps

GeoExplorer supports different types of maps.

Maps can be organized using categories and tags such as:

`Official` · `Community` · `Urban` · `Coastal` · `Nature`

Some maps and geographic data are stored locally, while community-created maps are stored in MongoDB.

---

## Running Locally

### Requirements

* Node.js
* MongoDB
* Google Maps API key

### Setup

Clone the repository:

```bash
git clone https://github.com/PolKry/GeoExplorer.git
cd GeoExplorer
```

Install the dependencies:

```bash
npm install
```

Create a `.env` file with the required environment variables:

```env
# =========================
# SERVER CONFIGURATION
# =========================
PORT=4444
NODE_ENV=development

# =========================
# JWT & SESSION
# =========================
JWT_SECRET=your_secret
JWT_EXPIRES_IN=1d
COOKIE_SECRET=your_cookie_secret

# =========================
# EMAIL (Verification & Reset)
# =========================
EMAIL_USER=email_to_send_emails_from
EMAIL_PASS=password_to_the_email
BASE_URL=http://localhost:4444

# =========================
# GOOGLE API (Restricted in Console!)
# =========================
GOOGLE_API_KEY=your_google_maps_api_key

# =========================
# DATABASE
# =========================
MONGO_URI=your_mongodb_connection_string

# =========================
# Auth
# =========================
MIN_USERNAME_LENGHT=4
MAX_USERNAME_LENGHT=14

MIN_PASSWORD_LENGHT=8
MAX_PASSWORD_LENGHT=20

# =========================
# Gameplay
# =========================
GAME_FINISHED_MAX_LIFETIME_MIN=5
GAME_UNFINISHED_MAX_LIFETIME_MIN=10

# =========================
# Other 3rd party keys
# =========================¨
REST_COUNTRIES_API_KEY=your_rest_api_key
```

Start the server:

```bash
npm start
```

The application will then be available locally.

---

## Project Status

GeoExplorer is still a work in progress.

I'm continuing to improve the game, add new features, and experiment with different ways of handling maps and multiplayer games.

---

## Author

**Kryštof Polák**

[GitHub Repository](https://github.com/PolKry/GeoExplorer)