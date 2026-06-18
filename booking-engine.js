// booking-engine.js - AR Luxury Experiences Central Booking Engine & State Management

const BookingEngine = {
  // CONSTANTS & API SETTINGS
  BRAND: 'AR Luxury Experiences',
  PHONE: '0400 044 004',
  EMAIL: '777artours@gmail.com',
  WEBSITE: 'toursau.com',
  LOCATION: 'Melbourne CBD',
  API_BASE: 'http://localhost:5001/api',

  getHeaders() {
    const token = localStorage.getItem('ar_admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  },

  // Asynchronously synchronize all databases from backend
  async loadFromBackend() {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1500); // 1.5 second timeout

      // 1. Fetch Tours
      const toursRes = await fetch(`${this.API_BASE}/tours`, { signal: controller.signal });
      if (toursRes.ok) {
        const toursData = await toursRes.json();
        localStorage.setItem('ar_luxury_tours', JSON.stringify(toursData));
      }
      
      // 2. Fetch Chauffeur Services
      const chauffeurRes = await fetch(`${this.API_BASE}/chauffeur`, { signal: controller.signal });
      if (chauffeurRes.ok) {
        const chauffeurData = await chauffeurRes.json();
        localStorage.setItem('ar_luxury_chauffeur', JSON.stringify(chauffeurData));
      }

      // 3. Fetch Bookings
      const bookingsRes = await fetch(`${this.API_BASE}/bookings`, { signal: controller.signal });
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        localStorage.setItem('ar_luxury_bookings', JSON.stringify(bookingsData));
      }

      // 4. Fetch Settings
      const settingsRes = await fetch(`${this.API_BASE}/settings`, { signal: controller.signal });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        localStorage.setItem('ar_luxury_settings', JSON.stringify(settingsData));
        if (settingsData.googleWebhookUrl) {
          localStorage.setItem('ar_google_webhook_url', settingsData.googleWebhookUrl);
        }
      }
      clearTimeout(id);
      return true;
    } catch(e) {
      console.warn('Backend API connection offline, utilizing offline caching modes.', e);
      return false;
    }
  },

  // GET DYNAMIC PRICING CONFIGURATION
  getPricing() {
    if (localStorage.getItem('ar_version') !== '2.0') {
      localStorage.removeItem('ar_luxury_pricing');
      localStorage.removeItem('ar_luxury_tours');
      localStorage.removeItem('ar_luxury_chauffeur');
      localStorage.setItem('ar_version', '2.0');
    }

    let pricing = localStorage.getItem('ar_luxury_pricing');
    if (!pricing) {
      pricing = {
        gorPrivatePrice: 1590,
        phillipPrivatePrice: 1290,
        yarraPrivatePrice: 1190,
        morningtonPrivatePrice: 1190,
        puffingPrivatePrice: 1290,
        melbournePrivatePrice: 890,
        groupGorRate: 169,
        groupPhillipRate: 199
      };
      localStorage.setItem('ar_luxury_pricing', JSON.stringify(pricing));
    } else {
      try {
        pricing = JSON.parse(pricing);
        // Ensure all individual fields are populated (backwards compatibility)
        if (pricing.privateFlatRate && !pricing.gorPrivatePrice) {
          pricing.gorPrivatePrice = pricing.privateFlatRate;
          pricing.phillipPrivatePrice = pricing.privateFlatRate;
          pricing.yarraPrivatePrice = pricing.privateFlatRate;
          pricing.morningtonPrivatePrice = pricing.privateFlatRate;
          pricing.puffingPrivatePrice = pricing.privateFlatRate;
          pricing.melbournePrivatePrice = pricing.privateFlatRate;
        }
      } catch(e) {
        pricing = {
          gorPrivatePrice: 1590,
          phillipPrivatePrice: 1290,
          yarraPrivatePrice: 1190,
          morningtonPrivatePrice: 1190,
          puffingPrivatePrice: 1290,
          melbournePrivatePrice: 890,
          groupGorRate: 169,
          groupPhillipRate: 199
        };
      }
    }
    return pricing;
  },

  savePricing(pricing) {
    localStorage.setItem('ar_luxury_pricing', JSON.stringify(pricing));
  },

  // TOUR CATALOGUE (Fully dynamic backend/localStorage catalog)
  getTours() {
    let tours = localStorage.getItem('ar_luxury_tours');
    if (!tours) {
      // Default Tours if local cache is empty
      const defaultTours = [
        {
          id: 'great-ocean-road-private',
          name: 'Great Ocean Road Private Tour',
          duration: '14 Hours',
          price: 1590,
          type: 'private',
          vehicle: 'Toyota Vellfire (up to 6 pax)',
          paxLimit: 22,
          description: 'Bespoke reverse coastal route on a luxury vehicle. Tiered pricing based on vehicle size.',
          emoji: '🌊',
          image: '',
          itinerary: '08:00 Departure | 10:30 Memorial Arch | 12:00 Apollo Bay Lunch | 14:30 12 Apostles | 16:30 Loch Ard Gorge | 21:00 Return'
        },
        {
          id: 'phillip-island-private',
          name: 'Phillip Island Private Tour',
          duration: '9 Hours',
          price: 1290,
          type: 'private',
          vehicle: 'Toyota Vellfire (up to 6 pax)',
          paxLimit: 22,
          description: 'Private sunset Little Penguin parade twilight tour. Tiered pricing based on vehicle size.',
          emoji: '🐧',
          image: '',
          itinerary: '13:00 Departure | 14:30 Wildlife Park | 16:30 Nobbies Boardwalk | 18:30 Penguin Parade | 21:30 Return'
        },
        {
          id: 'yarra-valley-private',
          name: 'Yarra Valley Wine Private Tour',
          duration: '7 Hours',
          price: 1190,
          type: 'private',
          vehicle: 'Toyota Vellfire (up to 6 pax)',
          paxLimit: 22,
          description: 'Bespoke wine tasting and estate lunch charter. Tiered pricing based on vehicle size.',
          emoji: '🍷',
          image: '',
          itinerary: '09:30 Departure | 10:30 Boutique Winery | 12:30 2-Course Estate Lunch | 14:30 Gin Distillery | 16:30 Return'
        },
        {
          id: 'mornington-peninsula-private',
          name: 'Mornington Peninsula Private Tour',
          duration: '8 Hours',
          price: 1190,
          type: 'private',
          vehicle: 'Toyota Vellfire (up to 6 pax)',
          paxLimit: 11,
          description: 'Hot springs, boutique wineries and stunning bay beaches. Tiered pricing based on vehicle size.',
          emoji: '🌺',
          image: '',
          itinerary: '09:00 Departure | 10:30 Hot Springs | 13:00 Winery Lunch | 15:30 Bay Views | 17:00 Return'
        },
        {
          id: 'puffing-billy-private',
          name: 'Puffing Billy Private Tour',
          duration: '7 Hours',
          price: 1290,
          type: 'private',
          vehicle: 'Toyota Vellfire (up to 6 pax)',
          paxLimit: 11,
          description: 'Ride the iconic heritage steam train through ancient fern gullies. Tiered pricing based on vehicle size.',
          emoji: '🚂',
          image: '',
          itinerary: '09:00 Departure | 10:30 Steam Train Ride | 12:30 Sassafras Village | 14:30 Wildlife Park | 16:00 Return'
        },
        {
          id: 'melbourne-discovery-private',
          name: 'Melbourne City Private Tour',
          duration: '4-6 Hours',
          price: 890,
          type: 'private',
          vehicle: 'Toyota Vellfire (up to 6 pax)',
          paxLimit: 11,
          description: 'Hidden laneways, world-class cuisine, street art and cultural icons.',
          emoji: '🏙️',
          image: '',
          itinerary: '10:00 Departure | 10:30 Laneways | 12:30 Lunch | 14:00 Shrine of Remembrance | 15:30 Return'
        },
        {
          id: 'great-ocean-road-group',
          name: 'Great Ocean Road Group Tour',
          duration: '14 Hours',
          price: 169,
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
          name: 'Phillip Island Group Tour',
          duration: '9 Hours',
          price: 199,
          type: 'group',
          vehicle: 'Toyota Hiace 11-seater',
          paxLimit: 11,
          description: 'Small group sunset Little Penguin parade twilight tour per person.',
          emoji: '🐧',
          image: '',
          itinerary: '13:00 Departure | 14:30 Wildlife Park | 16:30 Nobbies Boardwalk | 18:30 Penguin Parade | 21:30 Return'
        }
      ];
      localStorage.setItem('ar_luxury_tours', JSON.stringify(defaultTours));
      return defaultTours;
    }
    return JSON.parse(tours);
  },

  saveTours(tours) {
    localStorage.setItem('ar_luxury_tours', JSON.stringify(tours));
    return true;
  },

  async addTour(tour) {
    const tours = this.getTours();
    tours.push(tour);
    this.saveTours(tours);
    try {
      await fetch(`${this.API_BASE}/tours`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(tour)
      });
    } catch(e) { console.error('API Sync Error:', e); }
    return true;
  },

  async updateTour(id, updatedData) {
    const tours = this.getTours();
    const idx = tours.findIndex(t => t.id === id);
    if (idx !== -1) {
      tours[idx] = { ...tours[idx], ...updatedData };
      this.saveTours(tours);
      try {
        await fetch(`${this.API_BASE}/tours/${id}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(updatedData)
        });
      } catch(e) { console.error('API Sync Error:', e); }
      return true;
    }
    return false;
  },

  async deleteTour(id) {
    let tours = this.getTours();
    tours = tours.filter(t => t.id !== id);
    this.saveTours(tours);
    try {
      await fetch(`${this.API_BASE}/tours/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
    } catch(e) { console.error('API Sync Error:', e); }
    return true;
  },

  // CHAUFFEUR SERVICES (Loaded dynamically from server with fallback)
  getChauffeurServices() {
    let services = localStorage.getItem('ar_luxury_chauffeur');
    if (!services) {
      const defaultChauffeurs = [
        { id: 'airport-transfer', name: 'Premium Airport Transfer', price: 180, type: 'chauffeur', emoji: '✈️', vehicle: 'Toyota Vellfire / Sedan', description: 'One-way premium chauffeur collection to or from Melbourne Airport.' },
        { id: 'hourly-hire', name: 'Hourly Chauffeur Hire (Min 3 hrs)', price: 195, type: 'chauffeur', emoji: '⏱️', vehicle: 'Toyota Vellfire / Sedan', description: 'Hourly executive driver service (minimum 3 hour charter).' },
        { id: 'corporate', name: 'Corporate Business Travel', price: 195, type: 'chauffeur', emoji: '💼', vehicle: 'Premium Executive Vehicle', description: 'Premium business events, meetings, and corporate transfers.' },
        { id: 'wedding', name: 'Wedding Chauffeur Service', price: 1490, type: 'chauffeur', emoji: '💍', vehicle: 'Toyota Vellfire or Limo', description: 'Elite chauffeured luxury for your special day. Red carpet setup.' },
        { id: 'vip-event', name: 'VIP Event Service', price: 590, type: 'chauffeur', emoji: '🎭', vehicle: 'Premium Executive Vehicle', description: 'Grand Prix, AFL Grand Final, concerts and galas transfers.' },
        { id: 'school-excursion', name: 'School & Group Excursions', price: 890, type: 'chauffeur', emoji: '🎓', vehicle: 'Toyota Coaster / Bus', description: 'Safe, licensed transport for school trips and community groups.' },
        { id: 'party-transport', name: 'Bucks/Hens Party Transport', price: 990, type: 'chauffeur', emoji: '🎉', vehicle: 'Toyota HiAce / Coaster', description: 'Winery crawls, bar hopping, themed party transport with the fun factor.' },
        { id: 'snow-trip', name: 'Snow Trip Shuttle (Mt Buller)', price: 1490, type: 'chauffeur', emoji: '🏔️', vehicle: 'Toyota HiAce / Coaster', description: 'Seasonal winter snow day trips with experienced mountain drivers.' }
      ];
      localStorage.setItem('ar_luxury_chauffeur', JSON.stringify(defaultChauffeurs));
      return defaultChauffeurs;
    }
    return JSON.parse(services);
  },

  async addChauffeur(service) {
    const services = this.getChauffeurServices();
    services.push(service);
    localStorage.setItem('ar_luxury_chauffeur', JSON.stringify(services));
    try {
      await fetch(`${this.API_BASE}/chauffeur`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(service)
      });
    } catch(e) { console.error('API Sync Error:', e); }
    return true;
  },

  async updateChauffeur(id, updatedData) {
    const services = this.getChauffeurServices();
    const idx = services.findIndex(s => s.id === id);
    if (idx !== -1) {
      services[idx] = { ...services[idx], ...updatedData };
      localStorage.setItem('ar_luxury_chauffeur', JSON.stringify(services));
      try {
        await fetch(`${this.API_BASE}/chauffeur/${id}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(updatedData)
        });
      } catch(e) { console.error('API Sync Error:', e); }
      return true;
    }
    return false;
  },

  async deleteChauffeur(id) {
    let services = this.getChauffeurServices();
    services = services.filter(s => s.id !== id);
    localStorage.setItem('ar_luxury_chauffeur', JSON.stringify(services));
    try {
      await fetch(`${this.API_BASE}/chauffeur/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
    } catch(e) { console.error('API Sync Error:', e); }
    return true;
  },

  // Backwards compatibility pointer
  get chauffeurServices() {
    return this.getChauffeurServices();
  },

  // EXTRAS
  extras: [
    { id: 'champagne', name: 'Champagne on Arrival', price: 45 },
    { id: 'photographer', name: 'Professional Photographer (2hrs)', price: 350 },
    { id: 'hamper', name: 'Gourmet Hamper', price: 85 },
    { id: 'flowers', name: 'Fresh Flower Arrangement', price: 65 },
    { id: 'childSeat', name: 'Child Safety Seat', price: 25 }
  ],

  // VEHICLE FLEET
  fleet: [
    { id: 'v1', name: 'Mercedes V-Class Luxury', capacity: 7, type: 'luxury-van', rego: 'AR001', cpvExpiry: '2027-04-12', rwcDate: '2026-09-12', status: 'available' },
    { id: 'v2', name: 'Mercedes Sprinter Elite', capacity: 12, type: 'sprinter', rego: 'AR002', cpvExpiry: '2026-11-20', rwcDate: '2026-08-01', status: 'active' },
    { id: 'v3', name: 'BMW 7 Series Executive', capacity: 4, type: 'sedan', rego: 'AR003', cpvExpiry: '2027-02-15', rwcDate: '2026-11-20', status: 'available' },
    { id: 'v4', name: 'Luxury Range SUV', capacity: 6, type: 'suv', rego: 'AR004', cpvExpiry: '2026-06-30', rwcDate: '2026-06-01', status: 'available' }
  ],

  // DRIVERS
  drivers: [
    { id: 'd1', name: 'Driver 1', status: 'available', phone: '0400 044 004', accreditationExpiry: '2027-06-01' },
    { id: 'd2', name: 'Driver 2', status: 'on-tour', phone: '0400 044 004', accreditationExpiry: '2026-12-15' }
  ],

  // CUSTOMER PHOTOS GALLERY STORAGE
  getCustomerPhotos() {
    return JSON.parse(localStorage.getItem('ar_customer_photos') || '[]');
  },

  addCustomerPhoto(base64Data, caption = 'Happy Customers') {
    const photos = this.getCustomerPhotos();
    photos.push({ id: 'photo_' + Date.now(), data: base64Data, caption });
    localStorage.setItem('ar_customer_photos', JSON.stringify(photos));
    return true;
  },

  deleteCustomerPhoto(id) {
    let photos = this.getCustomerPhotos();
    photos = photos.filter(p => p.id !== id);
    localStorage.setItem('ar_customer_photos', JSON.stringify(photos));
    return true;
  },

  // INITIALIZER & SEED
  init() {
    const existing = localStorage.getItem('ar_luxury_bookings');
    if (!existing) {
      this.seedDemoBookings();
    }
    // Fire asynchronous background loader on launch
    this.loadFromBackend();
  },

  seedDemoBookings() {
    const today = new Date().toISOString().split('T')[0];
    const demoBookings = [
      {
        ref: 'ARL-481920',
        tourId: 'great-ocean-road-private',
        serviceType: 'day-tour',
        experienceName: 'Great Ocean Road Private Tour',
        date: today,
        time: '07:00',
        pax: 4,
        pickupType: 'hotel',
        pickupLocation: 'Crown Towers, Southbank',
        dropoffLocation: 'Same as pickup',
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
        vehicleId: 'v1',
        driverId: 'd1',
        source: 'direct'
      },
      {
        ref: 'ARL-726190',
        tourId: 'great-ocean-road-group',
        serviceType: 'day-tour',
        experienceName: 'Great Ocean Road Group Tour',
        date: today,
        time: '09:30',
        pax: 2,
        pickupType: 'hotel',
        pickupLocation: 'The Langham, Southbank',
        dropoffLocation: 'Same as pickup',
        customerName: 'David Chen',
        customerEmail: 'david.chen@corporateluxe.com',
        customerPhone: '0422 987 654',
        extras: [],
        specialRequirements: 'Toyota Hiace 11-seater group tour booking.',
        basePrice: 298,
        extrasPrice: 0,
        discount: 30,
        totalPrice: 268,
        promoApplied: 'LUXE10',
        status: 'On Tour',
        vehicleId: 'v2',
        driverId: 'd2',
        source: 'agent',
        agentId: 'AGENT001'
      }
    ];
    localStorage.setItem('ar_luxury_bookings', JSON.stringify(demoBookings));
  },

  // DYNAMIC PRICING: Calculate price
  calculatePrice(experienceId, pax, date, selectedExtraIds = [], promoCode = '') {
    let basePrice = 0;
    let serviceType = 'day-tour';
    let experienceName = '';
    
    // Check Tours
    const tours = this.getTours();
    const tour = tours.find(t => t.id === experienceId);
    if (tour) {
      if (tour.type === 'private') {
        basePrice = tour.price; // Flat rate for private
      } else {
        basePrice = tour.price * pax; // Per person for group
      }
      experienceName = tour.name;
      serviceType = 'day-tour';
    } else {
      // Check Chauffeur
      const chauffeur = this.chauffeurServices.find(c => c.id === experienceId);
      if (chauffeur) {
        basePrice = chauffeur.basePrice * (experienceId === 'hourly-hire' ? Math.max(3, pax) : 1);
        experienceName = chauffeur.name;
        serviceType = 'chauffeur';
      }
    }

    // Calculate extras
    let extrasPrice = 0;
    selectedExtraIds.forEach(id => {
      const extra = this.extras.find(e => e.id === id);
      if (extra) {
        extrasPrice += extra.price;
      }
    });

    // Subtotal
    const subtotal = basePrice + extrasPrice;

    // Apply promo
    let discount = 0;
    if (promoCode) {
      const promo = this.applyPromoCode(promoCode);
      if (promo.valid) {
        discount = Math.round(subtotal * (promo.discountPercent / 100));
      }
    }

    const totalPrice = subtotal - discount;

    return {
      basePrice,
      extrasPrice,
      discount,
      totalPrice,
      experienceName,
      serviceType
    };
  },

  applyPromoCode(code) {
    const codes = {
      'LUXE10': 10,
      'WELCOME15': 15,
      'GROUPVIP': 20
    };
    const cleanCode = code.toUpperCase().trim();
    if (codes[cleanCode]) {
      return { valid: true, discountPercent: codes[cleanCode], code: cleanCode };
    }
    return { valid: false, discountPercent: 0, code: '' };
  },

  // BOOKING CRUD
  async createBooking(bookingData) {
    const bookings = this.getAllBookings();
    const ref = bookingData.ref || this.generateRef();
    const newBooking = {
      ref,
      status: 'Pending',
      source: bookingData.source || 'direct',
      vehicleId: '',
      driverId: '',
      ...bookingData
    };
    bookings.push(newBooking);
    localStorage.setItem('ar_luxury_bookings', JSON.stringify(bookings));

    // Server Sync
    try {
      await fetch(`${this.API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      });
    } catch(e) { console.error('API Sync Error:', e); }

    // Dynamic Google Sheets & Calendar integration dispatcher
    const webhookUrl = localStorage.getItem('ar_google_webhook_url');
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newBooking)
      }).catch(e => console.warn('Google Sheets/Calendar webhook failed:', e));
    }

    return newBooking;
  },

  saveBooking(bookingData) {
    return this.createBooking(bookingData);
  },

  getBooking(ref) {
    const bookings = this.getAllBookings();
    return bookings.find(b => b.ref.toUpperCase().trim() === ref.toUpperCase().trim() || b.customerEmail.toLowerCase().trim() === ref.toLowerCase().trim());
  },

  getAllBookings() {
    const bookings = localStorage.getItem('ar_luxury_bookings');
    return bookings ? JSON.parse(bookings) : [];
  },

  async updateBookingStatus(ref, status) {
    const bookings = this.getAllBookings();
    const booking = bookings.find(b => b.ref === ref);
    if (booking) {
      booking.status = status;
      localStorage.setItem('ar_luxury_bookings', JSON.stringify(bookings));
      try {
        await fetch(`${this.API_BASE}/bookings/${ref}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({ status })
        });
      } catch(e) { console.error('API Sync Error:', e); }
      return true;
    }
    return false;
  },

  async assignDriverVehicle(ref, driverId, vehicleId) {
    const bookings = this.getAllBookings();
    const booking = bookings.find(b => b.ref === ref);
    if (booking) {
      booking.driverId = driverId;
      booking.vehicleId = vehicleId;
      if (driverId && vehicleId) {
        booking.status = 'Driver Assigned';
      }
      localStorage.setItem('ar_luxury_bookings', JSON.stringify(bookings));
      try {
        await fetch(`${this.API_BASE}/bookings/${ref}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({ driverId, vehicleId, status: booking.status })
        });
      } catch(e) { console.error('API Sync Error:', e); }
      return true;
    }
    return false;
  },

  async deleteBooking(ref) {
    let bookings = this.getAllBookings();
    bookings = bookings.filter(b => b.ref !== ref);
    localStorage.setItem('ar_luxury_bookings', JSON.stringify(bookings));
    try {
      await fetch(`${this.API_BASE}/bookings/${ref}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
    } catch(e) { console.error('API Sync Error:', e); }
    return true;
  },

  // AVAILABILITY
  getAvailability(tourId, date) {
    const slots = ['07:00', '08:30', '09:30', '13:00', '14:30'];
    const bookings = this.getAllBookings().filter(b => b.date === date && b.tourId === tourId);
    return slots.map(time => {
      const isBooked = bookings.some(b => b.time === time);
      return {
        time,
        available: !isBooked
      };
    });
  },

  // ANALYTICS
  getRevenueStats() {
    const bookings = this.getAllBookings().filter(b => b.status !== 'Cancelled' && b.status !== 'No Show');
    const today = new Date().toISOString().split('T')[0];
    
    let todayRev = 0;
    let weekRev = 0;
    let monthRev = 0;
    let totalRev = 0;

    const oneDay = 24 * 60 * 60 * 1000;
    const nowTime = Date.now();

    bookings.forEach(b => {
      const bDate = new Date(b.date);
      const bTime = bDate.getTime();
      const val = b.totalPrice || b.revenue || 0;

      totalRev += val;

      if (b.date === today) {
        todayRev += val;
      }
      if (nowTime - bTime <= 7 * oneDay) {
        weekRev += val;
      }
      if (nowTime - bTime <= 30 * oneDay) {
        monthRev += val;
      }
    });

    return {
      today: todayRev,
      week: weekRev,
      month: monthRev,
      total: totalRev
    };
  },

  getTopTours() {
    const bookings = this.getAllBookings().filter(b => b.status !== 'Cancelled');
    const stats = {};
    bookings.forEach(b => {
      const key = b.experienceName || b.tourId;
      stats[key] = (stats[key] || 0) + (b.totalPrice || 0);
    });
    return Object.entries(stats).map(([name, revenue]) => ({ name, revenue })).sort((a,b) => b.revenue - a.revenue);
  },

  sendConfirmationEmail(booking) {
    const subject = encodeURIComponent(`Booking Confirmed: ${booking.ref} - ${this.BRAND}`);
    const body = encodeURIComponent(`G'day ${booking.customerName},\n\nWe are delighted to confirm your luxury booking reference ${booking.ref} with AR Luxury Experiences.\n\nExperience: ${booking.experienceName}\nDate: ${booking.date}\nTime: ${booking.time}\nPassengers: ${booking.pax} Guests\nPickup Location: ${booking.pickupLocation}\nTotal Amount: $${booking.totalPrice}\n\nOur professional chauffeur will contact you 24 hours prior to departure.\n\nWarm regards,\nAR Luxury Experiences Team\nMelbourne CBD | ${this.PHONE}`);
    return `mailto:${booking.customerEmail}?subject=${subject}&body=${body}`;
  },

  generatePDF(booking) {
    return `
      <div style="font-family: 'Outfit', sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
          <div>
            <h1 style="color: #D4AF37; margin: 0; font-size: 24px;">AR Luxury Experiences</h1>
            <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">Melbourne CBD, Victoria | Phone: 0400 044 004</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 20px; color: #475569;">INVOICE</h2>
            <p style="margin: 4px 0 0; font-size: 14px; font-weight: bold; color: #0f172a;">Ref: ${booking.ref}</p>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
          <div>
            <h3 style="color: #475569; font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Client Details</h3>
            <p style="margin: 0; font-weight: bold; font-size: 15px;">${booking.customerName}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">${booking.customerEmail}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">${booking.customerPhone}</p>
          </div>
          <div>
            <h3 style="color: #475569; font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Service Details</h3>
            <p style="margin: 0; font-weight: bold; font-size: 15px;">${booking.experienceName}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">Date: ${booking.date} at ${booking.time}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">Pickup: ${booking.pickupLocation}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; text-align: left;">
              <th style="padding: 10px 0; color: #475569; font-size: 13px;">Description</th>
              <th style="padding: 10px 0; text-align: right; color: #475569; font-size: 13px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; font-size: 14px;"><strong>${booking.experienceName}</strong> (Base rate - charter)</td>
              <td style="padding: 12px 0; text-align: right; font-size: 14px;">$${booking.basePrice}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; font-size: 14px;">Selected Extras & custom amenities</td>
              <td style="padding: 12px 0; text-align: right; font-size: 14px;">$${booking.extrasPrice}</td>
            </tr>
            ${booking.discount > 0 ? `
            <tr style="border-bottom: 1px solid #f1f5f9; color: #dc2626;">
              <td style="padding: 12px 0; font-size: 14px;">Promotional Discount (${booking.promoApplied || 'Bespoke discount'})</td>
              <td style="padding: 12px 0; text-align: right; font-size: 14px;">-$${booking.discount}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 20px 0 10px; font-size: 16px; font-weight: bold;">Total Paid</td>
              <td style="padding: 20px 0 10px; text-align: right; font-size: 20px; font-weight: 900; color: #D4AF37;">$${booking.totalPrice}</td>
            </tr>
          </tbody>
        </table>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">Thank you for choosing AR Luxury Experiences. All trips are subject to our standard Terms & Conditions.</p>
          <p style="margin: 4px 0 0;">Secure Direct Payments Only. www.toursau.com</p>
        </div>
      </div>
    `;
  },

  // HELPERS
  generateRef() {
    return 'ARL-' + Math.floor(100000 + Math.random() * 900000);
  },

  formatCurrency(amount) {
    return '$' + Number(amount).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  },

  toast(message, type = 'success') {
    let container = document.getElementById('luxury-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'luxury-toast-container';
      container.style.position = 'fixed';
      container.style.bottom = '32px';
      container.style.right = '32px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `luxury-toast ${type}`;
    toast.style.marginTop = '10px';
    toast.innerHTML = `
      <div style="font-size: 1.2rem;">${type === 'success' ? '✓' : 'ℹ'}</div>
      <div>${message}</div>
    `;
    
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }
};

// Initialize central booking engine namespace
BookingEngine.init();
window.BookingEngine = BookingEngine;
