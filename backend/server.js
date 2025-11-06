require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5000;
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: ALLOW_ORIGIN }));
app.use(express.json());
app.use(morgan('dev'));

// Utility: Haversine (km)
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = v => v * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || null;

async function getDistance(origin, destination) {
  // Supports origin/destination as "lat,lng" or as address strings if GOOGLE_API_KEY is set.
  const latlonRegex = /^\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*$/;
  if (!GOOGLE_API_KEY) {
    if (latlonRegex.test(origin) && latlonRegex.test(destination)) {
      const [olat, olng] = origin.split(',').map(Number);
      const [dlat, dlng] = destination.split(',').map(Number);
      const distance_km = haversine(olat, olng, dlat, dlng);
      const duration_min = (distance_km / 22) * 60; // assume avg 22 km/h in city
      return { distance_km, duration_min };
    }
    throw new Error('GOOGLE_API_KEY missing. Provide lat,lng pairs, or set a key to use addresses.');
  } else {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_API_KEY}`;
    const r = await fetch(url);
    const j = await r.json();
    if (j.status !== 'OK' || !j.rows?.[0]?.elements?.[0] || j.rows[0].elements[0].status !== 'OK') {
      throw new Error('Google Distance Matrix request failed');
    }
    return {
      distance_km: j.rows[0].elements[0].distance.value / 1000,
      duration_min: j.rows[0].elements[0].duration.value / 60
    };
  }
}

// fare formulas tuned roughly for Bengaluru local mobility (adjust as needed)
function computeFares(distance_km, duration_min) {
  const round = n => Math.max(0, Math.round(n));

  // Base + per-km + per-min *some providers weigh time*
  const fares = [
    { key: 'ola_auto', label: 'Ola (Auto)', price: round(30 + 12.0 * distance_km + 0.5 * duration_min) },
    { key: 'uber_auto', label: 'Uber (Auto)', price: round(35 + 11.0 * distance_km + 0.6 * duration_min) },
    { key: 'rapido_bike', label: 'Rapido (Bike)', price: round(20 + 9.0 * distance_km + 0.4 * duration_min) },
    { key: 'nammayatri_auto', label: 'Namma Yatri (Auto)', price: round(25 + 10.0 * distance_km + 0.4 * duration_min) }
  ];

  fares.sort((a, b) => a.price - b.price);
  return fares;
}

// Deep link helpers (best-effort)
function buildDeepLinks(origin, destination) {
  // We'll pass through the user-provided strings; on mobile these URLs may open apps.
  const ola = `https://book.olacabs.com/?pickup=${encodeURIComponent(origin)}&drop=${encodeURIComponent(destination)}`;
  const uber = `https://m.uber.com/ul/?action=setPickup&pickup=${encodeURIComponent(origin)}&dropoff=${encodeURIComponent(destination)}`;
  const rapido = `https://rapido.bike/`; // limited deeplinks publicly available
  const namma = `https://nammayatri.in/`;
  return { ola, uber, rapido, namma };
}

app.post('/api/fare', async (req, res) => {
  try {
    const { origin, destination } = req.body || {};
    if (!origin || !destination) return res.status(400).json({ error: 'origin and destination are required' });

    const { distance_km, duration_min } = await getDistance(origin, destination);
    const fares = computeFares(distance_km, duration_min);
    const links = buildDeepLinks(origin, destination);

    res.json({
      meta: {
        distance_km: Number(distance_km.toFixed(2)),
        duration_min: Math.round(duration_min)
      },
      fares,
      links
    });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Failed to compute fares' });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
