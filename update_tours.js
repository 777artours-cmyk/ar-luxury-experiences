const fs = require('fs');
const path = require('path');

const toursDir = path.join(__dirname, 'tours');
const files = fs.readdirSync(toursDir).filter(f => f.endsWith('.html'));

const prices = {
  'great-ocean-road.html': { base: '$1,590', old: '$1,290' },
  'phillip-island.html': { base: '$1,290', old: '$1,190' },
  'yarra-valley.html': { base: '$1,190', old: '$990' },
  'mornington-peninsula.html': { base: '$1,190', old: '$990' },
  'puffing-billy.html': { base: '$1,290', old: '$1,090' },
  'melbourne-discovery.html': { base: '$890', old: '$790' }
};

const groupPrices = {
  'great-ocean-road.html': { newGroup: '$169', oldGroup: '$149' },
  'phillip-island.html': { newGroup: '$199', oldGroup: '$149' } // Wait, what was the old PI group price? It might be different, let's use regex
};

for (const file of files) {
  const filePath = path.join(toursDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace phone numbers
  content = content.replace(/0400044004/g, '+61414445344');
  content = content.replace(/0400 044 004/g, '+61 414 445 344');

  // Replace prices
  if (prices[file]) {
    // Regex to match the price format
    content = content.replace(new RegExp('\\$' + prices[file].old.replace('$', '').replace(',', '\\,'), 'g'), prices[file].base);
  }

  // Inject JSON-LD
  const jsonLd = `
  <!-- JSON-LD SEO Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "name": "AR Luxury Experiences - \${file.replace('.html', '').replace(/-/g, ' ')}",
    "description": "Premium luxury tour in Victoria.",
    "provider": {
      "@type": "TravelAgency",
      "name": "AR Luxury Experiences"
    }
  }
  </script>
`;
  if (!content.includes('application/ld+json')) {
    content = content.replace('</title>', '</title>' + jsonLd);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
