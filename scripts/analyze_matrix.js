const fs = require('fs');

const sql39 = fs.readFileSync('supabase/migrations/0039_service_plan.sql', 'utf8');
const sql40 = fs.readFileSync('supabase/migrations/0040_service_plan_improvements.sql', 'utf8');
const sql42 = fs.readFileSync('supabase/migrations/0042_update_seylan_bank_services.sql', 'utf8');

// Parse client sites
const allSites = [];

// 0039: ('Client', 'Name', address, 'Place', ...)
const r39 = /\('([^']+)',\s*'([^']+)',\s*('[^']*'|NULL),\s*'([^']+)'/g;
let m;
while ((m = r39.exec(sql39)) !== null) {
  if (m[1] === 'ABSL') continue;
  allSites.push({ client: m[1], name: m[2], place: m[4] });
}

// 0040 Seylan section
const s4_40 = sql40.substring(sql40.indexOf('Every Seylan location from the sheets'));
const r40 = /\('([^']+)',\s*('[^']*'|NULL),\s*'([^']+)'/g;
while ((m = r40.exec(s4_40)) !== null) {
  if (m[1] === 'Seylan Bank') continue;
  allSites.push({ client: 'Seylan Bank', name: m[1], place: m[3] });
}

// 0042 Seylan section
const s1_42 = sql42.substring(sql42.indexOf('1. Ensure all Seylan Bank sites exist'), sql42.indexOf('2. Clean up obsolete'));
const r42 = /\('Seylan Bank',\s*'([^']+)',\s*NULL,\s*'([^']+)'/g;
while ((m = r42.exec(s1_42)) !== null) {
  allSites.push({ client: 'Seylan Bank', name: m[1], place: m[2] });
}

console.log('Total sites parsed:', allSites.length);

// Group by place
const placeMap = new Map();
allSites.forEach(s => {
  const p = (s.place || 'Unknown').trim();
  if (!placeMap.has(p)) placeMap.set(p, { place: p, clients: {}, totalSites: 0 });
  const entry = placeMap.get(p);
  if (!entry.clients[s.client]) entry.clients[s.client] = [];
  entry.clients[s.client].push(s.name);
  entry.totalSites++;
});

console.log('Total unique locations/towns:', placeMap.size);

// Sort places alphabetically
const sortedPlaces = Array.from(placeMap.values()).sort((a,b) => a.place.localeCompare(b.place));

// Multi-client towns (2 or more clients)
const multiClient = sortedPlaces.filter(p => Object.keys(p.clients).length >= 2);
console.log('Towns with 2+ clients:', multiClient.length);

const fourClients = sortedPlaces.filter(p => Object.keys(p.clients).length === 4);
console.log('Towns with all 4 clients:', fourClients.length, fourClients.map(p => p.place));

const threeClients = sortedPlaces.filter(p => Object.keys(p.clients).length === 3);
console.log('Towns with 3 clients:', threeClients.length, threeClients.map(p => p.place));
