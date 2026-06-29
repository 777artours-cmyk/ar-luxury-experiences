// =============================================================================
//  AR Tours – Daily Blog Generator (Google Apps Script)
//  ─────────────────────────────────────────────────────────────────────────────
//  HOW TO DEPLOY:
//  1. Go to https://script.google.com → New Project
//  2. Paste this entire script into the editor
//  3. Click the gear icon (Project Settings) → Script Properties
//  4. Add these properties:
//       GROQ_API_KEY       → free key from https://console.groq.com (primary AI)
//       GEMINI_API_KEY     → Google AI Studio key (backup AI, optional)
//       GITHUB_TOKEN       → GitHub Personal Access Token (repo write access)
//       MAKE_WEBHOOK_URL   → Webhook URL from Make.com or Zapier (for GMB auto-posting)
//  5. Click Run → generateAndPublishBlog() once to test
//  6. Set up a daily trigger: Triggers → Add Trigger → generateAndPublishBlog
//       → Time-driven → Day timer → 11pm to midnight
// =============================================================================

const GITHUB_OWNER  = "777artours-cmyk";
const GITHUB_REPO   = "ar-luxury-experiences";
const GITHUB_BRANCH = "main";
const SITE_URL      = "https://theartours.com";

const TOPICS = [
  "Top 5 Wineries in Mornington Peninsula",
  "The Complete Great Ocean Road Driving Guide: Distances, Times and Must-See Stops",
  "A Guide to Puffing Billy Railway for Families",
  "12 Apostles Facts Every Visitor Should Know Before They Go",
  "How to Plan the Ultimate Weekend Escape in Yarra Valley",
  "Loch Ard Gorge: The Shipwreck Story and How to Explore It",
  "Chauffeur Service vs Taxi in Melbourne: A Luxury Comparison",
  "London Arch Great Ocean Road: History, Facts and Best Viewing Tips",
  "Melbourne's Best Hidden Rooftop Bars",
  "Otway Rainforest Walk: Hidden Gem Along the Great Ocean Road",
  "Exploring the Historic Architecture of Melbourne CBD",
  "Cape Otway Lighthouse: Australia's Oldest Surviving Mainland Lighthouse",
  "A Chauffeur's Guide to Melbourne's Best Restaurants",
  "Best Photo Spots Along the Great Ocean Road: A Photographer's Guide",
  "Luxury Wedding Venues in the Yarra Valley",
  "Sunrise vs Sunset at the 12 Apostles: Which Is More Spectacular?",
  "Guide to Wine Tasting Etiquette in Australia",
  "Wildlife You Can Spot Along the Great Ocean Road: Koalas, Kangaroos and More",
  "Best Coastal Walks Near Melbourne",
  "The History of the Great Ocean Road: Built by Returned Soldiers",
  "A Day Trip to Mornington Peninsula Hot Springs",
  "Gibson Steps Beach: Hidden Gem Near the 12 Apostles",
  "Wildlife Spotting on Phillip Island: Beyond Penguins",
  "Apollo Bay to Port Campbell: Best Stops on the Great Ocean Road",
  "Top Luxury Hotels in Melbourne for an Unforgettable Stay",
  "Driving the Great Ocean Road in One Day vs Two Days: What to Expect",
  "The Ultimate Melbourne Art Gallery Tour",
  "Princetown and the Gellibrand River: The Quietest Stop on the Great Ocean Road",
  "Exploring Sherbrooke Forest and Dandenong Ranges",
  "Great Ocean Road in Winter: Why the Off-Season Is Actually Perfect",
  "A Local Chauffeur's Favorite Melbourne Coffee Shops",
  "Private Great Ocean Road Tour vs Self-Drive: The Honest Comparison",
  "Bespoke Corporate Event Transport in Melbourne",
  "Great Ocean Road Food Guide: Best Cafes and Restaurants From Torquay to Warrnambool",
  "Best Family Day Trips from Melbourne",
  "Surf Coast Walk: The Stunning Coastal Trail Near Lorne",
  "Romantic Weekend Getaways in Victoria",
  "Port Campbell National Park: Everything You Need to Know",
  "Ultimate Guide to Yarra Valley Gin Distilleries",
  "Erskine Falls Lorne: A Complete Visitor Guide",
  "Discovering the Healing Waters of Peninsula Hot Springs",
  "Twelve Apostles Helicopter Tour: Is It Worth It?",
];

// Groq free models — very fast, generous free limits (14,400 req/day)
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "gemma2-9b-it",
];

// Gemini models as fallback
const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
];

// =============================================================================
//  MAIN ENTRY POINT — run this function daily
// =============================================================================
function generateAndPublishBlog() {
  var scriptProps = PropertiesService.getScriptProperties();
  var groqKey     = scriptProps.getProperty("GROQ_API_KEY");
  var geminiKey   = scriptProps.getProperty("GEMINI_API_KEY");
  var githubToken = scriptProps.getProperty("GITHUB_TOKEN");

  if (!githubToken) throw new Error("Missing Script Property: GITHUB_TOKEN");
  if (!groqKey && !geminiKey) throw new Error("Missing at least one AI key: GROQ_API_KEY or GEMINI_API_KEY");

  var dayOfYear = getDayOfYear();
  var topic     = TOPICS[dayOfYear % TOPICS.length];
  Logger.log("Today's topic: " + topic);

  // Try Groq first (free, fast, generous limits), then fall back to Gemini
  var blogData = null;
  if (groqKey) {
    try {
      blogData = generateWithGroq(groqKey, topic);
      Logger.log("Content generated via Groq: " + blogData.title);
    } catch (e) {
      Logger.log("Groq failed: " + e.message + " — trying Gemini...");
    }
  }
  if (!blogData && geminiKey) {
    blogData = generateWithGemini(geminiKey, topic);
    Logger.log("Content generated via Gemini: " + blogData.title);
  }
  if (!blogData) throw new Error("All AI providers failed.");

  var slug    = slugify(topic) + ".html";
  var dateStr = Utilities.formatDate(new Date(), "Australia/Melbourne", "MMMM d, yyyy");
  var dateIso = Utilities.formatDate(new Date(), "Australia/Melbourne", "yyyy-MM-dd");
  var html    = buildBlogHtml(blogData, slug, dateStr, dateIso);
  var blogUrl = "https://theartours.com/blog/" + slug;

  pushFileToGitHub(githubToken, "blog/" + slug, html, "auto: add daily blog - " + blogData.title);
  Logger.log("Blog pushed to GitHub: blog/" + slug);

  updateSitemap(githubToken, slug, dateIso);
  Logger.log("Sitemap updated");

  updateBlogIndex(githubToken, blogData, slug, dateStr);
  Logger.log("Blog index updated");

  // Auto-post to Google My Business
  try {
    postToGoogleMyBusiness(blogData, blogUrl);
    Logger.log("Posted to Google My Business!");
  } catch (e) {
    Logger.log("GMB post failed (non-critical): " + e.message);
  }

  Logger.log("Daily blog generation complete!");
}

// =============================================================================
//  GOOGLE MY BUSINESS WEBHOOK TRIGGER
// =============================================================================
/**
 * Sends a webhook payload containing the blog post details to Make.com/Zapier.
 * This triggers a workflow to auto-post the blog update to Google Business Profile.
 */
function postToGoogleMyBusiness(blogData, blogUrl) {
  var scriptProps = PropertiesService.getScriptProperties();
  var webhookUrl  = scriptProps.getProperty("MAKE_WEBHOOK_URL");

  if (!webhookUrl) {
    Logger.log("Skipping GMB auto-post: MAKE_WEBHOOK_URL script property is not set.");
    return;
  }

  // Strip HTML tags from bodyHtml to get plain text
  var plainText = blogData.bodyHtml
    ? blogData.bodyHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : blogData.excerpt || "";

  // Shorten plain text for the post excerpt
  if (plainText.length > 500) {
    plainText = plainText.substring(0, 497) + "...";
  }

  var payload = {
    title: blogData.title,
    excerpt: blogData.excerpt || "",
    summary: plainText,
    url: blogUrl,
    phone: "0400 044 004",
    website: "https://theartours.com"
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var resp = UrlFetchApp.fetch(webhookUrl, options);
  var code = resp.getResponseCode();
  if (code >= 200 && code < 300) {
    Logger.log("Successfully sent webhook payload to Make.com! Status: " + code);
  } else {
    throw new Error("Webhook endpoint returned status " + code + ": " + resp.getContentText());
  }
}


// =============================================================================
//  GROQ CONTENT GENERATION (Primary — free, fast)
// =============================================================================
function generateWithGroq(apiKey, topic) {
  var prompt = "You are a luxury travel content writer for AR Tours (https://theartours.com), "
    + "a premier private chauffeur and tour company in Melbourne, Victoria, Australia. "
    + "Write a highly engaging, professional, and SEO-optimized blog article about: \"" + topic + "\". "
    + "Requirements: 700-900 words in bodyHtml. Sophisticated tone. Factual about Melbourne/Victoria. "
    + "Include one internal link to /booking.html or /tours/great-ocean-road.html. "
    + "Use h2 headings, paragraphs, bullet points. End with a short call to action. "
    + "Return ONLY valid JSON starting with { and ending with }, with NO markdown fences, NO backticks. "
    + "Fields: title, metaDescription (max 150 chars), keywords, category, readingTime, excerpt (1-2 sentences), bodyHtml.";

  var lastError = "";
  for (var i = 0; i < GROQ_MODELS.length; i++) {
    var model = GROQ_MODELS[i];
    Logger.log("Trying Groq model: " + model);
    try {
      var url     = "https://api.groq.com/openai/v1/chat/completions";
      var payload = {
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      };
      var options = {
        method: "post",
        contentType: "application/json",
        headers: { "Authorization": "Bearer " + apiKey },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      var resp = UrlFetchApp.fetch(url, options);
      var code = resp.getResponseCode();
      if (code === 200) {
        var data    = JSON.parse(resp.getContentText());
        var rawText = data.choices[0].message.content;
        var jsonStart = rawText.indexOf("{");
        var jsonEnd   = rawText.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) rawText = rawText.substring(jsonStart, jsonEnd + 1);
        var blogData = JSON.parse(rawText);
        Logger.log("Groq success with model: " + model);
        return blogData;
      } else {
        lastError = resp.getContentText();
        Logger.log("Groq model " + model + " returned " + code + ": " + lastError);
      }
    } catch (e) {
      lastError = e.message;
      Logger.log("Groq model " + model + " threw: " + e.message);
    }
  }
  throw new Error("All Groq models failed. Last error: " + lastError);
}

// =============================================================================
//  GEMINI CONTENT GENERATION (Backup)
// =============================================================================
function generateWithGemini(apiKey, topic) {
  var prompt = "You are a luxury travel content writer for AR Tours (https://theartours.com). "
    + "Write a blog article about: \"" + topic + "\". "
    + "Return ONLY valid JSON starting with { and ending with }, NO markdown. "
    + "Fields: title, metaDescription, keywords, category, readingTime, excerpt, bodyHtml (700 words, h2/p/ul tags).";

  var lastError = "";
  for (var i = 0; i < GEMINI_MODELS.length; i++) {
    var model = GEMINI_MODELS[i];
    Logger.log("Trying Gemini model: " + model);
    try {
      var url     = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
      var payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } };
      var options = { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true };
      var resp    = UrlFetchApp.fetch(url, options);
      var code    = resp.getResponseCode();
      if (code === 429) { Utilities.sleep(35000); resp = UrlFetchApp.fetch(url, options); code = resp.getResponseCode(); }
      if (code === 200) {
        var data    = JSON.parse(resp.getContentText());
        var rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
        var jsonStart = rawText.indexOf("{");
        var jsonEnd   = rawText.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) rawText = rawText.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(rawText);
      } else {
        lastError = resp.getContentText();
        Logger.log("Gemini model " + model + " returned " + code);
      }
    } catch (e) {
      lastError = e.message;
      Logger.log("Gemini model " + model + " threw: " + e.message);
    }
  }
  throw new Error("All Gemini models failed. Last error: " + lastError);
}

// =============================================================================
//  BUILD BLOG HTML PAGE
// =============================================================================
function buildBlogHtml(d, slug, dateStr, dateIso) {
  return '<!DOCTYPE html>\n'
    + '<html lang="en">\n<head>\n'
    + '  <!-- Google tag (gtag.js) -->\n'
    + '  <script async src="https://www.googletagmanager.com/gtag/js?id=G-EV2D1P64V9"></script>\n'
    + '  <script>\n'
    + '    window.dataLayer = window.dataLayer || [];\n'
    + '    function gtag(){dataLayer.push(arguments);}\n'
    + '    gtag(\'js\', new Date());\n'
    + '    gtag(\'config\', \'G-EV2D1P64V9\');\n'
    + '  </script>\n'
    + '  <meta charset="UTF-8">\n'
    + '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '  <title>' + d.title + ' | AR Tours Blog</title>\n'
    + '  <meta name="description" content="' + d.metaDescription + '">\n'
    + '  <meta name="keywords" content="' + d.keywords + '">\n'
    + '  <link rel="canonical" href="' + SITE_URL + '/blog/' + slug + '">\n'
    + '  <meta property="og:title" content="' + d.title + '">\n'
    + '  <meta property="og:description" content="' + d.metaDescription + '">\n'
    + '  <meta property="og:url" content="' + SITE_URL + '/blog/' + slug + '">\n'
    + '  <meta property="og:type" content="article">\n'
    + '  <meta name="robots" content="index, follow">\n'
    + '  <link rel="icon" type="image/x-icon" href="/favicon.ico">\n'
    + '  <script type="application/ld+json">\n'
    + '  { "@context":"https://schema.org","@type":"Article","headline":"' + d.title + '",'
    + '"description":"' + d.metaDescription + '",'
    + '"author":{"@type":"Organization","name":"AR Tours","url":"' + SITE_URL + '"},'
    + '"publisher":{"@type":"Organization","name":"AR Tours","logo":{"@type":"ImageObject","url":"' + SITE_URL + '/images/logo.png"}},'
    + '"datePublished":"' + dateIso + '","dateModified":"' + dateIso + '",'
    + '"mainEntityOfPage":"' + SITE_URL + '/blog/' + slug + '"}\n'
    + '  </script>\n'
    + '  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
    + '  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">\n'
    + '  <style>\n'
    + '    :root{--gold:#D4AF37;--gold-light:#F0D060;--bg-deep:#080C14;--border-glass:rgba(255,255,255,.10);--text-primary:#F8F8F8;--text-muted:#9AA3B4;--font-head:"Plus Jakarta Sans",sans-serif;--font-body:"Outfit",sans-serif}\n'
    + '    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n'
    + '    body{font-family:var(--font-body);background:var(--bg-deep);color:var(--text-primary);line-height:1.7;-webkit-font-smoothing:antialiased}\n'
    + '    a{text-decoration:none;color:var(--gold)}\n'
    + '    a:hover{color:var(--gold-light)}\n'
    + '    .nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:16px 0;background:rgba(8,12,20,.95);backdrop-filter:blur(24px);border-bottom:1px solid var(--border-glass)}\n'
    + '    .nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between}\n'
    + '    .nav-logo{display:flex;align-items:center;gap:12px;color:var(--text-primary);font-family:var(--font-head);font-weight:800}\n'
    + '    .nav-links{display:flex;gap:24px;list-style:none}\n'
    + '    .nav-links a{color:var(--text-muted);font-size:.9rem}\n'
    + '    .hero{padding:140px 24px 60px;background:linear-gradient(160deg,rgba(8,12,20,.97) 0%,rgba(15,25,55,.9) 50%,rgba(8,12,20,.97) 100%);text-align:center}\n'
    + '    .hero-category{display:inline-block;background:rgba(212,175,55,.15);color:var(--gold);border:1px solid rgba(212,175,55,.3);border-radius:20px;padding:6px 16px;font-size:.8rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-bottom:20px}\n'
    + '    .hero h1{font-family:var(--font-head);font-size:clamp(1.8rem,4vw,2.8rem);font-weight:900;line-height:1.2;max-width:800px;margin:0 auto 20px}\n'
    + '    .hero-meta{display:flex;align-items:center;justify-content:center;gap:16px;color:var(--text-muted);font-size:.85rem}\n'
    + '    .article-wrap{max-width:780px;margin:60px auto 100px;padding:0 24px}\n'
    + '    .article-body h2{font-family:var(--font-head);font-size:1.5rem;font-weight:800;margin:40px 0 16px;color:var(--gold)}\n'
    + '    .article-body p{color:var(--text-muted);margin-bottom:20px;font-size:1rem;line-height:1.8}\n'
    + '    .article-body ul,.article-body ol{margin:16px 0 24px 24px}\n'
    + '    .article-body li{color:var(--text-muted);margin-bottom:10px;line-height:1.7}\n'
    + '    .article-body blockquote{border-left:3px solid var(--gold);padding:16px 24px;margin:32px 0;background:rgba(212,175,55,.06);border-radius:0 8px 8px 0;font-style:italic;color:var(--text-primary)}\n'
    + '    .cta-box{background:linear-gradient(135deg,rgba(212,175,55,.12),rgba(212,175,55,.05));border:1px solid rgba(212,175,55,.25);border-radius:16px;padding:40px;text-align:center;margin:60px 0}\n'
    + '    .cta-box h3{font-family:var(--font-head);font-size:1.5rem;margin-bottom:12px}\n'
    + '    .cta-box p{color:var(--text-muted);margin-bottom:24px}\n'
    + '    .btn-gold{display:inline-block;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#080C14;font-weight:700;padding:14px 32px;border-radius:8px;font-family:var(--font-head)}\n'
    + '    .back-link{display:inline-flex;align-items:center;gap:8px;color:var(--text-muted);font-size:.9rem;margin-bottom:40px}\n'
    + '    footer{background:#04060b;border-top:1px solid var(--border-glass);padding:40px 24px;text-align:center;color:var(--text-muted);font-size:.85rem}\n'
    + '    @media(max-width:768px){.nav-links{display:none}}\n'
    + '  </style>\n</head>\n<body>\n'
    + '  <nav class="nav"><div class="nav-inner">\n'
    + '    <a href="/index.html" class="nav-logo"><img src="/images/logo.png" alt="AR Tours" style="height:40px;width:auto">\n'
    + '      <div style="font-family:var(--font-head);font-weight:800;font-size:1rem;line-height:1.2">AR Tours<br><span style="font-size:.6rem;font-weight:400;color:var(--text-muted);letter-spacing:.08em;text-transform:uppercase">Luxury Experiences</span></div></a>\n'
    + '    <ul class="nav-links"><li><a href="/index.html">Home</a></li><li><a href="/index.html#tours">Tours</a></li><li><a href="/blog/">Blog</a></li><li><a href="/faq.html">FAQ</a></li><li><a href="/booking.html" style="color:var(--gold);font-weight:600">Book Now</a></li></ul>\n'
    + '  </div></nav>\n'
    + '  <header class="hero">\n'
    + '    <div class="hero-category">' + d.category + '</div>\n'
    + '    <h1>' + d.title + '</h1>\n'
    + '    <div class="hero-meta"><span>By AR Tours</span><span>·</span><span>' + dateStr + '</span><span>·</span><span>' + d.readingTime + '</span></div>\n'
    + '  </header>\n'
    + '  <main class="article-wrap">\n'
    + '    <a href="/blog/" class="back-link">Back to Blog</a>\n'
    + '    <div class="article-body">' + d.bodyHtml + '</div>\n'
    + '    <div class="cta-box"><h3>Ready to Experience Victoria in Luxury?</h3>\n'
    + '      <p>Let AR Tours craft your perfect private itinerary — fully customised, door to door, with a local expert guide.</p>\n'
    + '      <a href="/booking.html" class="btn-gold">Book Your Private Tour</a></div>\n'
    + '  </main>\n'
    + '  <footer><p>&copy; 2026 AR Tours – Luxury Experiences. All rights reserved.</p>\n'
    + '    <p style="margin-top:8px"><a href="/privacy-policy.html">Privacy Policy</a> &nbsp;·&nbsp; <a href="/terms.html">Terms &amp; Conditions</a></p></footer>\n'
    + '</body></html>';
}

// =============================================================================
//  PUSH FILE TO GITHUB VIA API
// =============================================================================
function pushFileToGitHub(token, filePath, content, commitMessage) {
  var apiUrl  = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + filePath;
  var headers = { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json", "Content-Type": "application/json" };

  var sha = null;
  try {
    var getResp = UrlFetchApp.fetch(apiUrl, { headers: headers, muteHttpExceptions: true });
    if (getResp.getResponseCode() === 200) {
      sha = JSON.parse(getResp.getContentText()).sha;
    }
  } catch (e) {}

  var payload = { message: commitMessage, content: Utilities.base64Encode(content, Utilities.Charset.UTF_8), branch: GITHUB_BRANCH };
  if (sha) payload.sha = sha;

  var resp = UrlFetchApp.fetch(apiUrl, { method: "put", headers: headers, payload: JSON.stringify(payload), muteHttpExceptions: true });
  var code = resp.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error("GitHub push failed (" + code + "): " + resp.getContentText());
  }
}

// =============================================================================
//  UPDATE SITEMAP.XML
// =============================================================================
function updateSitemap(token, slug, dateIso) {
  var sitemapPath = "sitemap.xml";
  var apiUrl      = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + sitemapPath;
  var headers     = { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" };

  var getResp = UrlFetchApp.fetch(apiUrl, { headers: headers, muteHttpExceptions: true });
  if (getResp.getResponseCode() !== 200) return;

  var fileData   = JSON.parse(getResp.getContentText());
  var currentXml = Utilities.newBlob(Utilities.base64Decode(fileData.content.replace(/\n/g, ""))).getDataAsString();
  var newEntry   = "  <url>\n    <loc>" + SITE_URL + "/blog/" + slug + "</loc>\n    <lastmod>" + dateIso + "</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.70</priority>\n  </url>\n</urlset>";
  var updatedXml = currentXml.replace("</urlset>", newEntry);

  pushFileToGitHub(token, sitemapPath, updatedXml, "auto: add " + slug + " to sitemap");
}

// =============================================================================
//  UPDATE BLOG/INDEX.HTML
// =============================================================================
function updateBlogIndex(token, blogData, slug, dateStr) {
  var indexPath = "blog/index.html";
  var apiUrl    = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + indexPath;
  var headers   = { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" };

  var getResp = UrlFetchApp.fetch(apiUrl, { headers: headers, muteHttpExceptions: true });
  if (getResp.getResponseCode() !== 200) return;

  var fileData    = JSON.parse(getResp.getContentText());
  var currentHtml = Utilities.newBlob(Utilities.base64Decode(fileData.content.replace(/\n/g, ""))).getDataAsString();

  var newCard = '\n  <!-- AUTO-GENERATED: ' + slug + ' -->\n'
    + '  <article class="blog-card">\n'
    + '    <div class="blog-card-category">' + blogData.category + '</div>\n'
    + '    <h2 class="blog-card-title"><a href="' + slug + '">' + blogData.title + '</a></h2>\n'
    + '    <p class="blog-card-excerpt">' + blogData.excerpt + '</p>\n'
    + '    <div class="blog-card-meta"><span>' + dateStr + '</span><span>·</span><span>' + blogData.readingTime + '</span></div>\n'
    + '    <a href="' + slug + '" class="blog-card-link">Read Article</a>\n'
    + '  </article>';

  var updatedHtml = currentHtml.replace(/(class="[^"]*blog-grid[^"]*"[^>]*>)/, "$1" + newCard);
  pushFileToGitHub(token, indexPath, updatedHtml, "auto: add blog card for " + blogData.title);
}

// =============================================================================
//  HELPERS
// =============================================================================
function getDayOfYear() {
  var now   = new Date();
  var start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
