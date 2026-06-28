const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY is not set.");
  process.exit(1);
}

async function test() {
  console.log("Testing Gemini API Connection...");
  
  // 1. Test List Models
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(listUrl);
    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ List Models Failed (Status ${res.status}): ${text}`);
    } else {
      const data = await res.json();
      console.log("✅ Connection Successful! Available models:");
      data.models.slice(0, 10).forEach(m => console.log(` - ${m.name}`));
    }
  } catch (e) {
    console.error("❌ Error listing models:", e);
  }
}

test();
