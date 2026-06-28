const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY is not set. Exiting...");
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');

// ─── TOPIC POOL ──────────────────────────────────────────────────────────────
// Every 3rd topic is Great Ocean Road focused for dedicated SEO coverage
const topics = [
  // General Melbourne/Victoria
  "Top 5 Wineries in Mornington Peninsula",
  // Great Ocean Road
  "The Complete Great Ocean Road Driving Guide: Distances, Times & Must-See Stops",
  // General
  "A Guide to Puffing Billy Railway for Families",
  // Great Ocean Road
  "12 Apostles Facts Every Visitor Should Know Before They Go",
  // General
  "How to Plan the Ultimate Weekend Escape in Yarra Valley",
  // Great Ocean Road
  "Loch Ard Gorge: The Shipwreck Story and How to Explore It",
  // General
  "Chauffeur Service vs Taxi in Melbourne: A Luxury Comparison",
  // Great Ocean Road
  "London Arch Great Ocean Road: History, Facts and Best Viewing Tips",
  // General
  "Melbourne's Best Hidden Rooftop Bars",
  // Great Ocean Road
  "Otway Rainforest Walk: Hidden Gem Along the Great Ocean Road",
  // General
  "Exploring the Historic Architecture of Melbourne CBD",
  // Great Ocean Road
  "Cape Otway Lighthouse: Australia's Oldest Surviving Mainland Lighthouse",
  // General
  "A Chauffeur's Guide to Melbourne's Best Restaurants",
  // Great Ocean Road
  "Best Photo Spots Along the Great Ocean Road: A Photographer's Guide",
  // General
  "Luxury Wedding Venues in the Yarra Valley",
  // Great Ocean Road
  "Sunrise vs Sunset at the 12 Apostles: Which Is More Spectacular?",
  // General
  "Guide to Wine Tasting Etiquette in Australia",
  // Great Ocean Road
  "Wildlife You Can Spot Along the Great Ocean Road: Koalas, Kangaroos & More",
  // General
  "Best Coastal Walks Near Melbourne",
  // Great Ocean Road
  "The History of the Great Ocean Road: Built by Returned Soldiers",
  // General
  "A Day Trip to Mornington Peninsula Hot Springs",
  // Great Ocean Road
  "Gibson Steps Beach: Hidden Gem Near the 12 Apostles",
  // General
  "Wildlife Spotting on Phillip Island: Beyond Penguins",
  // Great Ocean Road
  "Apollo Bay to Port Campbell: Best Stops on the Great Ocean Road",
  // General
  "Top Luxury Hotels in Melbourne for an Unforgettable Stay",
  // Great Ocean Road
  "Driving the Great Ocean Road in One Day vs Two Days: What to Expect",
  // General
  "The Ultimate Melbourne Art Gallery Tour",
  // Great Ocean Road
  "Princetown and the Gellibrand River: The Quietest Stop on the Great Ocean Road",
  // General
  "Exploring Sherbrooke Forest and Dandenong Ranges",
  // Great Ocean Road
  "Great Ocean Road in Winter: Why the Off-Season Is Actually Perfect",
  // General
  "A Local Chauffeur's Favorite Melbourne Coffee Shops",
  // Great Ocean Road
  "Private Great Ocean Road Tour vs Self-Drive: The Honest Comparison",
  // General
  "Bespoke Corporate Event Transport in Melbourne",
  // Great Ocean Road
  "Great Ocean Road Food Guide: Best Cafes and Restaurants From Torquay to Warrnambool",
  // General
  "Best Family Day Trips from Melbourne",
  // Great Ocean Road
  "Surf Coast Walk: The Stunning Coastal Trail Near Lorne",
  // General
  "Romantic Weekend Getaways in Victoria",
  // Great Ocean Road
  "Port Campbell National Park: Everything You Need to Know",
  // General
  "Ultimate Guide to Yarra Valley Gin Distilleries",
  // Great Ocean Road
  "Erskine Falls Lorne: A Complete Visitor Guide",
  // General
  "Discovering the Healing Waters of Peninsula Hot Springs",
  // Great Ocean Road
  "Twelve Apostles Helicopter Tour: Is It Worth It?",
];

// Pick a topic based on today's date to ensure daily rotation without repeats
const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
const topic = topics[dayOfYear % topics.length];


console.log(`Generating daily blog post for topic: "${topic}"...`);

const prompt = `
You are a luxury travel content writer for AR Tours (https://theartours.com), a premier private chauffeur and tour company in Melbourne, Victoria, Australia.
Write a highly engaging, professional, and SEO-optimized blog article about the topic: "${topic}".

Requirements:
1. Word count: 800+ words.
2. Tone: Sophisticated, premium, welcoming, and local-expert.
3. Content: Must be factual about Melbourne/Victoria, recommending landmarks, wineries, cafes, or travel tips.
4. Internal Links: Naturally include at least one link to our luxury booking page "/booking.html" or appropriate tour page (e.g. "/tours/great-ocean-road.html" or "/tours/yarra-valley.html" or "/tours/mornington-peninsula.html" or "/tours/phillip-island.html" or "/tours/puffing-billy.html" or "/tours/melbourne-discovery.html").
5. Structure: The article must have headings (h2), detailed paragraphs, bullet points (ul/li), and optionally a tip box or blockquote.
6. Branding: Use "AR Tours" for the company and highlight the comfort, convenience, and luxury of booking a private chauffeur tour.
`;

const requestBody = {
  contents: [{
    parts: [{ text: prompt }]
  }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "The SEO-friendly title of the post" },
        metaDescription: { type: "string", description: "A compelling meta description under 150 characters" },
        keywords: { type: "string", description: "Comma-separated SEO keywords" },
        category: { type: "string", description: "The travel category (e.g. Mornington Peninsula, Yarra Valley, Travel Tips)" },
        readingTime: { type: "string", description: "Estimated reading time (e.g., '6 min read')" },
        excerpt: { type: "string", description: "A short 1-2 sentence excerpt summarizing the post" },
        bodyHtml: { type: "string", description: "The main body content in HTML format, using h2, p, ul, li, blockquote etc." }
      },
      required: ["title", "metaDescription", "keywords", "category", "readingTime", "excerpt", "bodyHtml"]
    }
  }
};

async function generate() {
  // Try newest models first — Gemini 2.0 is available on all free API keys
  const models = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro",
  ];

  let response;
  let success = false;
  let lastErrorText = "";

  for (const model of models) {
    console.log(`Attempting generation with model: "${model}"...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        success = true;
        console.log(`✅ Success with model: "${model}"!`);
        break;
      } else {
        lastErrorText = await response.text();
        console.warn(`⚠️ Model "${model}" failed (Status ${response.status}): ${lastErrorText}`);
      }
    } catch (e) {
      console.warn(`⚠️ Error attempting model "${model}":`, e.message);
    }
  }

  if (!success) {
    console.error(`❌ All models failed. Last error details: ${lastErrorText}`);
    throw new Error(`API returned error status`);
  }

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  const blogData = JSON.parse(rawText);

  // Slugify title
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '.html';
  const filePath = path.join(rootDir, 'blog', slug);
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateIso = new Date().toISOString().split('T')[0];

  // Blog post template
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blogData.title} | AR Tours Blog</title>
  <meta name="description" content="${blogData.metaDescription}">
  <meta name="keywords" content="${blogData.keywords}">
  <link rel="canonical" href="https://theartours.com/blog/${slug}">
  <meta property="og:title" content="${blogData.title}">
  <meta property="og:description" content="${blogData.metaDescription}">
  <meta property="og:url" content="https://theartours.com/blog/${slug}">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="robots" content="index, follow">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${blogData.title}",
    "description": "${blogData.metaDescription}",
    "author": { "@type": "Organization", "name": "AR Tours", "url": "https://theartours.com" },
    "publisher": { "@type": "Organization", "name": "AR Tours", "logo": { "@type": "ImageObject", "url": "https://theartours.com/images/logo.png" } },
    "datePublished": "${dateIso}",
    "dateModified": "${dateIso}",
    "mainEntityOfPage": "https://theartours.com/blog/${slug}",
    "image": "https://theartours.com/images/og-image.jpg"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://theartours.com/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://theartours.com/blog/" },
      { "@type": "ListItem", "position": 3, "name": "${blogData.title}" }
    ]
  }
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --gold: #D4AF37; --gold-light: #F0D060; --gold-dark: #A8892A;
      --emerald: #10b981; --emerald-dark: #059669;
      --bg-deep: #080C14; --bg-dark: #0D1220;
      --bg-card: rgba(255,255,255,0.04); --bg-glass: rgba(255,255,255,0.06);
      --border-glass: rgba(255,255,255,0.10); --border-gold: rgba(212,175,55,0.30);
      --text-primary: #F8F8F8; --text-muted: #9AA3B4; --text-dim: #5A6375;
      --font-head: 'Plus Jakarta Sans', sans-serif;
      --font-body: 'Outfit', sans-serif;
      --radius-sm: 8px; --radius-md: 16px; --radius-lg: 24px;
      --shadow-gold: 0 0 40px rgba(212,175,55,0.15);
      --shadow-card: 0 8px 40px rgba(0,0,0,0.5);
      --trans: all 0.35s cubic-bezier(0.4,0,0.2,1);
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; font-size: 16px; }
    body { font-family: var(--font-body); background: var(--bg-deep); color: var(--text-primary); line-height: 1.6; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
    a { text-decoration: none; color: inherit; transition: var(--trans); }
    img { max-width: 100%; display: block; }
    .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 16px 0; background: rgba(8,12,20,0.92); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-bottom: 1px solid var(--border-glass); }
    .nav-inner { max-width: 1280px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { display: flex; align-items: center; gap: 12px; font-family: var(--font-head); font-weight: 800; font-size: 1.1rem; color: var(--text-primary); }
    .nav-logo:hover { color: var(--gold); }
    .nav-logo-icon { width: 38px; height: 38px; background: linear-gradient(135deg, var(--gold), var(--gold-dark)); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem; box-shadow: 0 4px 16px rgba(212,175,55,0.4); }
    .nav-links { display: flex; align-items: center; gap: 4px; list-style: none; }
    .nav-links a { font-size: 0.88rem; font-weight: 500; color: var(--text-muted); padding: 8px 16px; border-radius: var(--radius-sm); }
    .nav-links a:hover, .nav-links a.active { color: var(--text-primary); background: rgba(255,255,255,0.06); }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; border-radius: var(--radius-sm); font-family: var(--font-body); font-size: 0.9rem; font-weight: 600; transition: var(--trans); border: 1px solid transparent; cursor: pointer; }
    .btn--gold { background: linear-gradient(135deg, var(--gold), var(--gold-light), var(--gold-dark)); color: #080C14; border-color: var(--gold); box-shadow: 0 4px 20px rgba(212,175,55,0.35); }
    .btn--gold:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(212,175,55,0.55); }
    .btn--ghost { background: transparent; color: var(--text-primary); border-color: rgba(255,255,255,0.25); }
    .btn--ghost:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.45); }
    .btn--sm { padding: 10px 20px; font-size: 0.82rem; }
    
    .blog-hero { position: relative; padding: 140px 0 60px; background: linear-gradient(160deg, rgba(8,12,20,0.97) 0%, rgba(20,40,70,0.85) 50%, rgba(8,12,20,0.97) 100%); overflow: hidden; }
    .blog-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 50%, rgba(212,175,55,0.08), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.05), transparent 50%); }
    .blog-hero-inner { position: relative; max-width: 860px; margin: 0 auto; padding: 0 24px; }
    .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text-dim); margin-bottom: 24px; flex-wrap: wrap; }
    .breadcrumb a { color: var(--text-muted); } .breadcrumb a:hover { color: var(--gold); } .breadcrumb span { color: var(--gold); }
    .post-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .post-category { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.25); padding: 5px 14px; border-radius: 50px; }
    .post-date, .post-reading-time { font-size: 0.85rem; color: var(--text-muted); }
    .post-title { font-family: var(--font-head); font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 900; line-height: 1.12; letter-spacing: -0.02em; margin-bottom: 20px; }
    .post-excerpt-hero { font-size: 1.12rem; color: var(--text-muted); line-height: 1.7; max-width: 700px; }
    
    .article-container { max-width: 860px; margin: 0 auto; padding: 60px 24px; }
    .article-content h2 { font-family: var(--font-head); font-size: 1.65rem; font-weight: 800; margin: 48px 0 16px; color: var(--text-primary); }
    .article-content h3 { font-family: var(--font-head); font-size: 1.25rem; font-weight: 700; margin: 32px 0 12px; color: var(--gold); }
    .article-content p { font-size: 1.02rem; line-height: 1.8; color: var(--text-muted); margin-bottom: 20px; }
    .article-content ul, .article-content ol { margin: 16px 0 24px 24px; }
    .article-content li { font-size: 1rem; line-height: 1.8; color: var(--text-muted); margin-bottom: 8px; }
    .article-content a { color: var(--gold); border-bottom: 1px solid rgba(212,175,55,0.3); }
    .article-content a:hover { color: var(--gold-light); border-color: var(--gold); }
    .article-content blockquote { border-left: 3px solid var(--gold); padding: 16px 24px; margin: 24px 0; background: rgba(212,175,55,0.05); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
    .article-content blockquote p { color: var(--text-primary); font-style: italic; margin-bottom: 0; }
    .gold-divider { width: 60px; height: 3px; background: linear-gradient(90deg, var(--gold), var(--gold-light)); border-radius: 2px; margin: 32px 0; }
    
    .tip-box { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: var(--radius-md); padding: 24px; margin: 32px 0; }
    .tip-box-title { font-family: var(--font-head); font-weight: 700; color: var(--emerald); margin-bottom: 8px; font-size: 0.95rem; }
    .tip-box p { margin-bottom: 0; }
    
    .cta-box { background: var(--bg-glass); border: 1px solid var(--border-gold); border-radius: var(--radius-lg); padding: 40px; text-align: center; margin: 48px 0; position: relative; overflow: hidden; }
    .cta-box::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(212,175,55,0.06), transparent 70%); }
    .cta-box h3 { font-family: var(--font-head); font-size: 1.5rem; font-weight: 800; margin-bottom: 12px; position: relative; }
    .cta-box p { color: var(--text-muted); margin-bottom: 24px; position: relative; }
    .cta-box .btn { position: relative; }
    
    .share-bar { display: flex; align-items: center; gap: 12px; margin: 32px 0; flex-wrap: wrap; }
    .share-bar span { font-size: 0.88rem; font-weight: 600; color: var(--text-muted); }
    .share-btn { width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--border-glass); display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 0.9rem; background: var(--bg-card); transition: var(--trans); }
    .share-btn:hover { border-color: var(--gold); color: var(--gold); transform: translateY(-2px); }
    .share-btn.whatsapp:hover { border-color: #25D366; color: #25D366; }
    
    .related-section { border-top: 1px solid var(--border-glass); padding-top: 48px; margin-top: 48px; }
    .related-section h2 { font-family: var(--font-head); font-size: 1.4rem; font-weight: 800; margin-bottom: 24px; }
    .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .related-card { background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 24px; transition: var(--trans); }
    .related-card:hover { border-color: var(--border-gold); transform: translateY(-4px); box-shadow: var(--shadow-card); }
    .related-card-cat { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gold); margin-bottom: 8px; }
    .related-card h3 { font-family: var(--font-head); font-size: 1.05rem; font-weight: 700; line-height: 1.3; margin-bottom: 8px; }
    .related-card p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; }
    .related-card .read-more { font-size: 0.82rem; font-weight: 600; color: var(--gold); margin-top: 12px; display: inline-block; }
    
    .site-footer { background: #04060b; border-top: 1px solid var(--border-glass); padding: 60px 0 30px; margin-top: 80px; }
    .footer-inner { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
    .footer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-bottom: 40px; }
    .footer-logo { font-family: var(--font-head); font-weight: 800; font-size: 1.15rem; color: white; margin-bottom: 12px; }
    .footer-text { font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; }
    .footer-title { font-family: var(--font-head); font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-primary); margin-bottom: 16px; }
    .footer-links { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    .footer-links a { font-size: 0.85rem; color: var(--text-muted); }
    .footer-links a:hover { color: var(--gold); padding-left: 4px; }
    .footer-bottom { border-top: 1px solid var(--border-glass); padding-top: 24px; text-align: center; font-size: 0.8rem; color: var(--text-dim); }
    
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .footer-grid { grid-template-columns: 1fr; }
      .related-grid { grid-template-columns: 1fr; }
    }
  </style>
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="48x48" href="/images/favicon-48.png" />
  <link rel="icon" type="image/png" sizes="96x96" href="/images/favicon-96.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/images/favicon-192.png" />
  <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
</head>
<body>

  <!-- Navigation -->
  <nav class="nav">
    <div class="nav-inner">
      <a href="/index.html" class="nav-logo" style="display: flex; align-items: center; gap: 12px;">
        <img src="/images/logo.png" alt="AR Tours Logo" style="height: 44px; width: auto; object-fit: contain;" />
        <div style="font-family: var(--font-head); font-weight: 800; font-size: 1.1rem; line-height: 1.2;">AR Tours<br><span style="font-size:0.65rem;font-weight:400;color:var(--text-muted);letter-spacing:0.08em;text-transform:uppercase;">Luxury Experiences</span></div>
      </a>
      <div class="nav-links">
        <a href="/index.html">Home</a>
        <a href="/index.html#tours">Tours</a>
        <a href="/blog/" class="active">Blog</a>
        <a href="/faq.html">FAQ</a>
        <a href="/booking.html" class="btn btn--gold btn--sm">Book Now</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <header class="blog-hero">
    <div class="blog-hero-inner">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/index.html">Home</a> <span>›</span>
        <a href="/blog/">Blog</a> <span>›</span>
        ${blogData.category}
      </nav>
      <div class="post-meta">
        <span class="post-category">${blogData.category}</span>
        <span class="post-date">📅 ${dateStr}</span>
        <span class="post-reading-time">⏱ ${blogData.readingTime}</span>
      </div>
      <h1 class="post-title">${blogData.title}</h1>
      <p class="post-excerpt-hero">${blogData.excerpt}</p>
    </div>
  </header>

  <!-- Main Content -->
  <article class="article-container">
    <div class="article-content">
      ${blogData.bodyHtml}
    </div>

    <!-- Share Bar -->
    <div class="share-bar">
      <span>Share this article:</span>
      <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(blogData.title)}%20https://theartours.com/blog/${slug}" target="_blank" class="share-btn whatsapp" aria-label="Share on WhatsApp">WA</a>
    </div>

    <!-- Related Posts -->
    <section class="related-section">
      <h2>Related Articles</h2>
      <div class="related-grid">
        <div class="related-card">
          <div class="related-card-cat">Great Ocean Road</div>
          <h3>Top 10 Must-See Stops on the Great Ocean Road</h3>
          <p>Discover the absolute best lookouts and hidden beaches along the coast...</p>
          <a href="top-10-great-ocean-road-stops.html" class="read-more">Read Article ›</a>
        </div>
        <div class="related-card">
          <div class="related-card-cat">Yarra Valley</div>
          <h3>Ultimate Yarra Valley Wine Tour Guide 2026</h3>
          <p>The best wineries, cellar doors, and dining spots in Melbourne's wine country...</p>
          <a href="yarra-valley-wine-guide.html" class="read-more">Read Article ›</a>
        </div>
      </div>
    </section>
  </article>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-grid">
        <div>
          <div class="footer-logo">AR Tours</div>
          <p class="footer-text">Providing bespoke, luxury private tours across Melbourne and Victoria's most iconic landscapes.</p>
        </div>
        <div>
          <h4 class="footer-title">Our Services</h4>
          <ul class="footer-links">
            <li><a href="/tours/great-ocean-road.html">Great Ocean Road Tour</a></li>
            <li><a href="/tours/yarra-valley.html">Yarra Valley Wine Tour</a></li>
            <li><a href="/tours/phillip-island.html">Phillip Island Penguin Parade</a></li>
          </ul>
        </div>
        <div>
          <h4 class="footer-title">Quick Links</h4>
          <ul class="footer-links">
            <li><a href="/index.html">Home</a></li>
            <li><a href="/blog/">Blog</a></li>
            <li><a href="/faq.html">FAQ</a></li>
            <li><a href="/reviews.html">Reviews</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        &copy; 2026 AR Tours. All rights reserved. Premium Chauffeur & Custom VIP Tour Experiences.
      </div>
    </div>
  </footer>

</body>
</html>
`;

  // Write file
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✅ Saved daily blog post to: "${filePath}"`);

  // Update blog index page
  const indexPath = path.join(rootDir, 'blog', 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf8');

  const newCard = `
      <!-- Card Auto-Generated -->
      <article class="blog-card">
        <div>
          <span class="blog-card-cat">${blogData.category}</span>
          <h2 class="blog-card-title">${blogData.title}</h2>
          <p class="blog-card-desc">${blogData.excerpt}</p>
        </div>
        <div>
          <div class="blog-card-meta">
            <span>📅 ${dateStr}</span>
            <span>⏱ ${blogData.readingTime}</span>
          </div>
          <a href="${slug}" class="blog-card-readmore">Read Article ›</a>
        </div>
      </article>
  `;

  // Inject right after '<div class="blog-grid">'
  indexHtml = indexHtml.replace('<div class="blog-grid">', `<div class="blog-grid">\n${newCard}`);
  fs.writeFileSync(indexPath, indexHtml, 'utf8');
  console.log(`✅ Updated blog/index.html listing.`);

  // Update sitemap.xml
  const sitemapPath = path.join(rootDir, 'sitemap.xml');
  let sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const newSitemapEntry = `  <url>
    <loc>https://theartours.com/blog/${slug}</loc>
    <lastmod>${dateIso}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.70</priority>
  </url>\n</urlset>`;

  sitemapXml = sitemapXml.replace('</urlset>', newSitemapEntry);
  fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
  console.log(`✅ Updated sitemap.xml.`);
}

generate().catch(err => {
  console.error("❌ Error generating daily blog post:", err);
  process.exit(1);
});
