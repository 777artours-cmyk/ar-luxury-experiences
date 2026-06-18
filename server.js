const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'ar-luxury-secure-token-secret-777';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '777artours'; // Default premium secure password

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database folder setup
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR);
}

const TOURS_FILE = path.join(DB_DIR, 'tours.json');
const CHAUFFEUR_FILE = path.join(DB_DIR, 'chauffeur.json');
const BOOKINGS_FILE = path.join(DB_DIR, 'bookings.json');
const SETTINGS_FILE = path.join(DB_DIR, 'settings.json');

// Helper to safely read files
function readJSON(file, defaultVal = []) {
  try {
    if (!fs.existsSync(file)) {
      writeJSON(file, defaultVal);
      return defaultVal;
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${file}:`, e);
    return defaultVal;
  }
}

// Helper to safely write files
function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`Error writing ${file}:`, e);
    return false;
  }
}

// ─── INITIAL SEEDING ────────────────────────────────
function seedInitialData() {
  // 1. Seed Tours
  if (!fs.existsSync(TOURS_FILE) || readJSON(TOURS_FILE).length === 0) {
    const defaultTours = [
      {
        id: 'great-ocean-road-private',
        name: 'Great Ocean Road Private Tour',
        duration: '14 Hours',
        price: 1500,
        type: 'private',
        vehicle: 'Luxury Vehicle',
        paxLimit: 5,
        description: 'Bespoke reverse coastal route on a luxury vehicle. Fits up to 5 people flat-rate.',
        emoji: '🌊',
        image: '',
        itinerary: '08:00 Departure | 10:30 Memorial Arch | 12:00 Apollo Bay Lunch | 14:30 12 Apostles | 16:30 Loch Ard Gorge | 21:00 Return'
      },
      {
        id: 'phillip-island-private',
        name: 'Phillip Island Private Tour',
        duration: '9 Hours',
        price: 1500,
        type: 'private',
        vehicle: 'Luxury Vehicle',
        paxLimit: 5,
        description: 'Private sunset Little Penguin parade twilight tour. Fits up to 5 people flat-rate.',
        emoji: '🐧',
        image: '',
        itinerary: '13:00 Departure | 14:30 Wildlife Park | 16:30 Nobbies Boardwalk | 18:30 Penguin Parade | 21:30 Return'
      },
      {
        id: 'yarra-valley-private',
        name: 'Yarra Valley Wine Private Tour',
        duration: '7 Hours',
        price: 1500,
        type: 'private',
        vehicle: 'Luxury Vehicle',
        paxLimit: 5,
        description: 'Bespoke wine tasting and estate lunch charter. Fits up to 5 people flat-rate.',
        emoji: '🍷',
        image: '',
        itinerary: '09:30 Departure | 10:30 Boutique Winery | 12:30 2-Course Estate Lunch | 14:30 Gin Distillery | 16:30 Return'
      },
      {
        id: 'mornington-peninsula-private',
        name: 'Mornington Peninsula Private Tour',
        duration: '8 Hours',
        price: 1500,
        type: 'private',
        vehicle: 'Luxury Vehicle',
        paxLimit: 5,
        description: 'Thermal hot springs and scenic clifftop sights. Fits up to 5 people flat-rate.',
        emoji: '🌺',
        image: '',
        itinerary: '08:30 Departure | 10:00 Peninsula Hot Springs | 13:00 Winery Lunch | 15:30 Arthurs Seat Gondola | 17:30 Return'
      },
      {
        id: 'puffing-billy-private',
        name: 'Puffing Billy Steam Train Private Tour',
        duration: '7 Hours',
        price: 1500,
        type: 'private',
        vehicle: 'Luxury Vehicle',
        paxLimit: 5,
        description: 'Temperate rainforest hikes and heritage train rides. Fits up to 5 people flat-rate.',
        emoji: '🚂',
        image: '',
        itinerary: '09:00 Departure | 10:30 Puffing Billy Train Ride | 12:30 Sassafras Village | 14:30 Sherbrooke Forest | 16:00 Return'
      },
      {
        id: 'melbourne-discovery-private',
        name: 'Melbourne City Discovery Private Tour',
        duration: '4-6 Hours',
        price: 1500,
        type: 'private',
        vehicle: 'Luxury Vehicle',
        paxLimit: 5,
        description: 'Bespoke laneway art, culture, and beach boxes. Fits up to 5 people flat-rate.',
        emoji: '🏙',
        image: '',
        itinerary: '09:00 Departure | 09:30 Laneway Coffee tour | 11:00 Shrine of Remembrance | 12:30 St Kilda Beach boxes | 14:00 Return'
      },
      {
        id: 'great-ocean-road-group',
        name: 'Great Ocean Road Group Tour',
        duration: '14 Hours',
        price: 149,
        type: 'group',
        vehicle: 'Toyota Hiace 11-seater',
        paxLimit: 11,
        description: 'Reverse scenic GOR itinerary per person on our modern Toyota Hiace 11-seater.',
        emoji: '🌊',
        image: '',
        itinerary: '07:30 Departure | 10:00 Colac Stop | 12:00 12 Apostles reverse route | 14:00 Apollo Bay | 16:00 Kennett River Koalas | 20:30 Return'
      },
      {
        id: 'phillip-island-group',
        name: 'Phillip Island Penguin Group Tour',
        duration: '9 Hours',
        price: 250,
        type: 'group',
        vehicle: '11-seater Vehicle',
        paxLimit: 11,
        description: 'Twilight Little Penguin migration experience per person on our comfortable 11-seater.',
        emoji: '🐧',
        image: '',
        itinerary: '12:30 Departure | 14:00 Maru Koala Park | 16:00 Nobbies Center | 18:00 Penguin Parade Premium | 21:00 Return'
      }
    ];
    writeJSON(TOURS_FILE, defaultTours);
  }

  // 2. Seed Chauffeur Services
  if (!fs.existsSync(CHAUFFEUR_FILE) || readJSON(CHAUFFEUR_FILE).length === 0) {
    const defaultChauffeur = [
      { id: 'airport-transfer', name: 'Premium Airport Transfer', price: 150, type: 'chauffeur', emoji: '✈️', vehicle: 'Luxury Sedan / SUV', description: 'One-way premium chauffeur collection to or from Melbourne Airport.' },
      { id: 'hourly-hire', name: 'Hourly Chauffeur Hire (Min 3 hrs)', price: 195, type: 'chauffeur', emoji: '⏱️', vehicle: 'Luxury Sedan / SUV', description: 'Hourly executive driver service (minimum 3 hour charter).' },
      { id: 'corporate', name: 'Corporate Business Travel', price: 250, type: 'chauffeur', emoji: '💼', vehicle: 'Premium Executive Vehicle', description: 'Premium business events, meetings, and corporate transfers.' },
      { id: 'wedding', name: 'Wedding Chauffeur Service', price: 890, type: 'chauffeur', emoji: '💍', vehicle: 'Mercedes V-Class or S-Class', description: 'Elite chauffeured luxury for your special day. Red carpet setup.' },
      { id: 'vip-event', name: 'VIP Event Private Transfer', price: 350, type: 'chauffeur', emoji: '⭐', vehicle: 'Luxury SUV', description: 'Bespoke red carpet arrival and premium transfers for events.' }
    ];
    writeJSON(CHAUFFEUR_FILE, defaultChauffeur);
  }

  // 3. Seed Bookings
  if (!fs.existsSync(BOOKINGS_FILE) || readJSON(BOOKINGS_FILE).length === 0) {
    const today = new Date().toISOString().split('T')[0];
    const defaultBookings = [
      {
        ref: 'ARL-481920',
        tourId: 'great-ocean-road-private',
        serviceType: 'day-tour',
        experienceName: 'Great Ocean Road Private Tour',
        date: today,
        time: '07:00',
        pax: 4,
        pickupLocation: 'Crown Towers, Southbank',
        customerName: 'Sarah Jenkins',
        customerEmail: 's.jenkins@gmail.com',
        customerPhone: '0412 345 678',
        extras: ['champagne', 'hamper'],
        specialRequirements: 'Celebrating a 10th anniversary. Flat-rate private vehicle.',
        basePrice: 1500,
        extrasPrice: 130,
        discount: 0,
        totalPrice: 1630,
        status: 'Confirmed',
        source: 'direct'
      }
    ];
    writeJSON(BOOKINGS_FILE, defaultBookings);
  }

  // 4. Seed Settings
  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaultSettings = {
      brand: 'AR Luxury Experiences',
      phone: '0400 044 004',
      email: '777artours@gmail.com',
      website: 'toursau.com',
      location: 'Melbourne CBD',
      googleWebhookUrl: '',
      customerPhotos: []
    };
    writeJSON(SETTINGS_FILE, defaultSettings);
  }
}

seedInitialData();

// ─── AUTHENTICATION GATEWAY ─────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, message: 'Invalid administrative password' });
});

// Middleware to verify session tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied. Authentication required.' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expired. Please log in again.' });
    req.user = user;
    next();
  });
}

// ─── API ENDPOINTS: TOURS ───────────────────────────
app.get('/api/tours', (req, res) => {
  res.json(readJSON(TOURS_FILE));
});

app.post('/api/tours', authenticateToken, (req, res) => {
  const tours = readJSON(TOURS_FILE);
  const newTour = {
    id: req.body.id || `tour-${Date.now()}`,
    name: req.body.name,
    duration: req.body.duration || 'N/A',
    price: Number(req.body.price),
    type: req.body.type || 'private',
    vehicle: req.body.vehicle || 'Luxury Vehicle',
    paxLimit: Number(req.body.paxLimit) || 5,
    description: req.body.description || '',
    emoji: req.body.emoji || '✨',
    image: req.body.image || '',
    itinerary: req.body.itinerary || ''
  };
  tours.push(newTour);
  writeJSON(TOURS_FILE, tours);
  res.json({ success: true, tour: newTour });
});

app.put('/api/tours/:id', authenticateToken, (req, res) => {
  const tours = readJSON(TOURS_FILE);
  const idx = tours.findIndex(t => t.id === req.params.id);
  if (idx !== -1) {
    tours[idx] = { ...tours[idx], ...req.body };
    writeJSON(TOURS_FILE, tours);
    return res.json({ success: true, tour: tours[idx] });
  }
  res.status(404).json({ error: 'Tour not found' });
});

app.delete('/api/tours/:id', authenticateToken, (req, res) => {
  let tours = readJSON(TOURS_FILE);
  tours = tours.filter(t => t.id !== req.params.id);
  writeJSON(TOURS_FILE, tours);
  res.json({ success: true });
});

// ─── API ENDPOINTS: CHAUFFEUR SERVICES ─────────────
app.get('/api/chauffeur', (req, res) => {
  res.json(readJSON(CHAUFFEUR_FILE));
});

app.post('/api/chauffeur', authenticateToken, (req, res) => {
  const services = readJSON(CHAUFFEUR_FILE);
  const newService = {
    id: req.body.id || `chauffeur-${Date.now()}`,
    name: req.body.name,
    price: Number(req.body.price),
    type: 'chauffeur',
    emoji: req.body.emoji || '🚗',
    vehicle: req.body.vehicle || 'Luxury Sedan',
    description: req.body.description || ''
  };
  services.push(newService);
  writeJSON(CHAUFFEUR_FILE, services);
  res.json({ success: true, service: newService });
});

app.put('/api/chauffeur/:id', authenticateToken, (req, res) => {
  const services = readJSON(CHAUFFEUR_FILE);
  const idx = services.findIndex(s => s.id === req.params.id);
  if (idx !== -1) {
    services[idx] = { ...services[idx], ...req.body };
    writeJSON(CHAUFFEUR_FILE, services);
    return res.json({ success: true, service: services[idx] });
  }
  res.status(404).json({ error: 'Chauffeur service not found' });
});

app.delete('/api/chauffeur/:id', authenticateToken, (req, res) => {
  let services = readJSON(CHAUFFEUR_FILE);
  services = services.filter(s => s.id !== req.params.id);
  writeJSON(CHAUFFEUR_FILE, services);
  res.json({ success: true });
});

// ─── API ENDPOINTS: BOOKINGS ────────────────────────
app.get('/api/bookings', (req, res) => {
  res.json(readJSON(BOOKINGS_FILE));
});

app.post('/api/bookings', (req, res) => {
  const bookings = readJSON(BOOKINGS_FILE);
  const ref = req.body.ref || `ARL-${Math.floor(100000 + Math.random() * 900000)}`;
  const newBooking = {
    ref,
    status: 'Pending',
    source: req.body.source || 'direct',
    ...req.body
  };
  bookings.push(newBooking);
  writeJSON(BOOKINGS_FILE, bookings);

  // Trigger Google Sheet & Calendar Sync Webhook if registered
  const settings = readJSON(SETTINGS_FILE, {});
  if (settings.googleWebhookUrl) {
    const fetch = require('node-fetch') || global.fetch;
    if (fetch) {
      fetch(settings.googleWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      }).catch(e => console.warn('Google Sheets Webhook Sync failed:', e));
    }
  }

  res.json({ success: true, booking: newBooking });
});

app.put('/api/bookings/:ref', authenticateToken, (req, res) => {
  const bookings = readJSON(BOOKINGS_FILE);
  const idx = bookings.findIndex(b => b.ref === req.params.ref);
  if (idx !== -1) {
    bookings[idx] = { ...bookings[idx], ...req.body };
    writeJSON(BOOKINGS_FILE, bookings);
    return res.json({ success: true, booking: bookings[idx] });
  }
  res.status(404).json({ error: 'Booking not found' });
});

app.delete('/api/bookings/:ref', authenticateToken, (req, res) => {
  let bookings = readJSON(BOOKINGS_FILE);
  bookings = bookings.filter(b => b.ref !== req.params.ref);
  writeJSON(BOOKINGS_FILE, bookings);
  res.json({ success: true });
});

// ─── API ENDPOINTS: SETTINGS ────────────────────────
app.get('/api/settings', (req, res) => {
  res.json(readJSON(SETTINGS_FILE, {}));
});

app.post('/api/settings', authenticateToken, (req, res) => {
  const settings = readJSON(SETTINGS_FILE, {});
  const newSettings = { ...settings, ...req.body };
  writeJSON(SETTINGS_FILE, newSettings);
  res.json({ success: true, settings: newSettings });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 AR Luxury Experiences Backend active on port ${PORT}`);
  console.log(`🔐 Admin Security: Active.`);
  console.log(`📂 DB Location: ${DB_DIR}`);
  console.log(`====================================================`);
});
