// app.js - AR Tours Operations Portal Logic

// --- Global State ---
let bookings = [];
let fleet = [
    { name: "Toyota HiAce Coaster", rego: "BS1234", cpvCheck: "Accredited", rwcDate: "2026-09-12", status: "Available" },
    { name: "Mercedes Sprinter Luxury 12-Seater", rego: "MS7777", cpvCheck: "Accredited", rwcDate: "2026-08-01", status: "Active Tour" },
    { name: "Executive Coach 24-Seater", rego: "EC8888", cpvCheck: "Accredited", rwcDate: "2026-11-20", status: "Available" }
];

let checklists = {
    daily: [
        { text: "Steering, brakes, and warning lights verified operational", checked: false },
        { text: "Windscreen wipers, washers, and demisters checked", checked: false },
        { text: "Tyre tread depth and pressure check (daily visual inspection)", checked: false },
        { text: "Commercial passenger seatbelts checked for damage/wear", checked: false },
        { text: "Safe Transport Victoria (STV) Accreditation document present on dashboard/cabin", checked: false }
    ],
    weekly: [
        { text: "Inspect complete fluid levels (coolant, brake fluid, steering oil)", checked: false },
        { text: "Verify operations of fire extinguisher (pressure level and date)", checked: false },
        { text: "Clean air filters and cabin ventilation outlets", checked: false },
        { text: "Ensure first-aid compliance kit is fully stocked", checked: false }
    ],
    monthly: [
        { text: "Detailed under-carriage inspection for oil/fluid leaks", checked: false },
        { text: "Tyre pressure calibration (all fleet tires including spare)", checked: false },
        { text: "Test rear commercial air-conditioning performance", checked: false }
    ],
    annual: [
        { text: "Licensed Vehicle Tester Certificate of Roadworthiness (RWC) completed", checked: false },
        { text: "Renew Safe Transport Victoria (STV) Commercial Fleet Accreditation fee", checked: false },
        { text: "Submit updated driver medical assessment cards to STV records", checked: false }
    ]
};

let currentChecklistType = 'daily';

// --- Seed Data (Simulating Google Sheet Synchronization) ---
const mockSheetBookings = [
    { date: "2026-05-30", name: "Sarah Jenkins", tour: "Great Ocean Road Reverse Tour", pax: 4, revenue: 1200, status: "Active", time: "07:00 AEST" },
    { date: "2026-05-30", name: "David Chen (Yarra Wine Tour)", tour: "Yarra Valley Premium Wine Tour", pax: 10, revenue: 2500, status: "Active", time: "09:00 AEST" },
    { date: "2026-05-30", name: "John Doe", tour: "Phillip Island Penguin Tour", pax: 6, revenue: 950, status: "Confirmed", time: "13:30 AEST" }
];

// --- AI Persona Prompt Base ---
const AI_CONTEXT = {
    voice: "Warm, professional, friendly Australian hospitality voice. Always greets clients politely and finishes answers by reminding them to contact AR Tours Direct or visit theartours.com.",
    quotes: {
        gor: "Great Ocean Road Reverse Tour is quoted from $149 per seat to $4500 for a premium private custom coach package (Takes 14 hours!). Includes sunset at 12 Apostles.",
        yarra: "Yarra Valley Wine Tour starts at $2500 for private group bookings of up to 12 guests (Takes 7 hours!). Includes gourmet lunch, tastings, and luxury transport.",
        phillip: "Phillip Island Penguin Parade Tour is quoted based on booking requirements and private customization. Includes beach waddle tickets."
    },
    contact: "Refer to www.theartours.com or direct call/WhatsApp 0400 044 004.",
    cpv: "Victorian CPV rules: Tour operators must hold Safe Transport Victoria Commercial Passenger Vehicle Accreditation. Annual Roadworthy Certificates are mandatory. Drivers must hold valid commercial Driver Accreditation card and current medical check."
};

// --- Page Initialization ---
window.addEventListener("DOMContentLoaded", () => {
    // Load state from LocalStorage or seed with mock Google Sheet
    const savedBookings = localStorage.getItem("ar_tours_bookings");
    if (savedBookings) {
        bookings = JSON.parse(savedBookings);
    } else {
        bookings = [...mockSheetBookings];
        localStorage.setItem("ar_tours_bookings", JSON.stringify(bookings));
    }
    
    // Load inspection progress
    const savedChecklists = localStorage.getItem("ar_tours_checklists");
    if (savedChecklists) {
        checklists = JSON.parse(savedChecklists);
    }

    renderDashboard();
    renderBookings();
    renderFleet();
    loadChecklist('daily');
});

// --- Tab Switcher ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}-content`).classList.add('active');
    document.getElementById(`nav-${tabId}`).classList.add('active');
    
    // Update Header
    const titles = {
        dashboard: ["Daily Dashboard", "Live operations tracking for AR Tours Australia"],
        bookings: ["Bookings Manager", "Complete transaction ledgers and customer calendar"],
        compliance: ["Fleet Compliance", "CPV Safe Transport Victoria standards & checks"],
        agent: ["AR Tours AI Assistant", "Interactive review replying & pricing operator"]
    };
    
    document.getElementById('tab-title').innerText = titles[tabId][0];
    document.getElementById('tab-subtitle').innerText = titles[tabId][1];
}

// --- Render Operations Dashboard ---
function renderDashboard() {
    const today = "2026-05-30";
    const todayBookings = bookings.filter(b => b.date === today);
    
    let totalRevenue = 0;
    let activePaxCount = 0;
    
    const tbody = document.getElementById("today-bookings-table");
    tbody.innerHTML = "";
    
    todayBookings.forEach(b => {
        totalRevenue += b.revenue;
        activePaxCount += b.pax;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${b.name}</strong></td>
            <td>${b.tour}</td>
            <td>👤 ${b.pax}</td>
            <td><strong>$${b.revenue}</strong></td>
            <td>⏱ ${b.time || 'TBD'}</td>
            <td><span class="reg-badge" style="background: rgba(16,185,129,0.15); color: var(--accent-emerald);">${b.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
    
    // Update Stats
    document.getElementById("stat-revenue").innerText = `$${totalRevenue.toLocaleString()}`;
    document.getElementById("stat-bookings").innerText = todayBookings.length;
}

// --- Render Fleet ---
function renderFleet() {
    const tbody = document.getElementById("fleet-table");
    tbody.innerHTML = "";
    
    fleet.forEach(v => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${v.name}</strong></td>
            <td><code>${v.rego}</code></td>
            <td><span class="reg-badge" style="background:rgba(16,185,129,0.1); color:var(--accent-emerald);">${v.cpvCheck}</span></td>
            <td>📅 ${v.rwcDate}</td>
            <td><span class="reg-badge" style="background:rgba(59,130,246,0.15); color:var(--accent-blue);">${v.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Render Booking Manager Table ---
function renderBookings() {
    const tbody = document.getElementById("all-bookings-table");
    tbody.innerHTML = "";
    
    bookings.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach((b, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>📅 ${b.date}</td>
            <td><strong>${b.name}</strong></td>
            <td>${b.tour}</td>
            <td>👤 ${b.pax}</td>
            <td><strong>$${b.revenue}</strong></td>
            <td><span class="reg-badge">${b.status}</span></td>
            <td><button class="btn-add" style="background:rgba(239,68,68,0.15); color:#ef4444; border:none; padding: 0.35rem 0.7rem; font-size:0.75rem;" onclick="deleteBooking(${idx})">Delete</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Delete Booking ---
function deleteBooking(idx) {
    bookings.splice(idx, 1);
    localStorage.setItem("ar_tours_bookings", JSON.stringify(bookings));
    renderBookings();
    renderDashboard();
    showToast("Booking successfully removed! 📋");
}

// --- Add Manual Booking (Simulated) ---
function showAddBookingModal() {
    const name = prompt("Enter customer name:");
    if (!name) return;
    const tour = prompt("Enter tour name (e.g. Great Ocean Road Reverse Tour, Yarra Valley Premium Wine Tour):");
    const pax = parseInt(prompt("Enter passenger count (PAX):") || "1");
    const revenue = parseFloat(prompt("Enter price quote / revenue amount ($):") || "0");
    const date = prompt("Enter booking date (YYYY-MM-DD):", "2026-05-30");

    const newBooking = {
        date: date,
        name: name,
        tour: tour,
        pax: pax,
        revenue: revenue,
        status: "Active",
        time: "09:00 AEST"
    };

    bookings.push(newBooking);
    localStorage.setItem("ar_tours_bookings", JSON.stringify(bookings));
    renderBookings();
    renderDashboard();
    showToast("New manual booking successfully added! 🚐");
}

// --- Sync Google Sheet (Simulated) ---
function syncGoogleSheets() {
    document.getElementById("sheet-sync-status").innerText = "Syncing...";
    showToast("Connecting to live Google Sheets API... ⏳");
    
    setTimeout(() => {
        // Reset bookings to seed data to showcase fresh sync
        bookings = [...mockSheetBookings];
        localStorage.setItem("ar_tours_bookings", JSON.stringify(bookings));
        
        renderDashboard();
        renderBookings();
        document.getElementById("sheet-sync-status").innerText = "Connected & Synced";
        showToast("SUCCESS! Synced 3 today bookings from Google Sheet! 📊");
    }, 1500);
}

// --- Load CPV Inspection Checklists ---
function loadChecklist(type) {
    currentChecklistType = type;
    
    // Toggle active tab buttons
    document.querySelectorAll('.tab-content button').forEach(b => {
        if(b.id && b.id.startsWith('chk-')) {
            b.style.background = 'rgba(255,255,255,0.05)';
            b.style.color = 'white';
        }
    });
    const activeBtn = document.getElementById(`chk-${type}`);
    if (activeBtn) {
        activeBtn.style.background = 'var(--accent-emerald)';
        activeBtn.style.color = 'white';
    }
    
    const box = document.getElementById("checklist-box");
    box.innerHTML = "";
    
    checklists[type].forEach((item, idx) => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.gap = "0.75rem";
        div.style.padding = "0.75rem";
        div.style.background = "rgba(255,255,255,0.02)";
        div.style.border = "1px solid var(--border-color)";
        div.style.borderRadius = "10px";
        
        div.innerHTML = `
            <input type="checkbox" id="chk-${type}-${idx}" ${item.checked ? 'checked' : ''} onchange="toggleChecklistItem('${type}', ${idx})" style="width:18px; height:18px; accent-color: var(--accent-emerald); cursor:pointer;">
            <label for="chk-${type}-${idx}" style="font-size:0.9rem; cursor:pointer; user-select:none; color: ${item.checked ? 'var(--text-secondary)' : '#ffffff'}; text-decoration: ${item.checked ? 'line-through' : 'none'};">${item.text}</label>
        `;
        box.appendChild(div);
    });
}

function toggleChecklistItem(type, idx) {
    checklists[type][idx].checked = !checklists[type][idx].checked;
    loadChecklist(type);
}

function saveChecklistProgress() {
    localStorage.setItem("ar_tours_checklists", JSON.stringify(checklists));
    showToast("Inspection checklists successfully saved to disk! 💾");
}

// --- AR Tours Direct Business AI Agent Logic ---
function simulateAIResponse(promptText) {
    const text = promptText.toLowerCase();
    
    // Greeting
    if (text.includes("hello") || text.includes("hi ") || text.includes("hey")) {
        return "Hi there! Welcome to AR Tours Australia! We'd love to show you the magic of Victoria in our luxury private transport. How can we help you plan your bespoke journey today? G'day! For bookings, you can jump onto our website at www.theartours.com or ring us directly on 0400 044 004.";
    }
    
    // Pricing queries
    if (text.includes("price") || text.includes("cost") || text.includes("quote") || text.includes("how much")) {
        if (text.includes("ocean") || text.includes("road") || text.includes("gor")) {
            return `Our iconic Great Ocean Road Reverse Tour (14 hours of pure adventure!) is quoted starting from $149 per seat up to $4,500 for a fully bespoke private coach tour. Let's customize it exactly to your pace! To secure a spot, jump onto www.theartours.com or call AR Tours Direct on 0400 044 004.`;
        }
        if (text.includes("wine") || text.includes("yarra")) {
            return `For our premium Yarra Valley Wine Tour, private groups up to 12 guests enjoy a full 7-hour bespoke tour for $2,500. This includes gourmet lunch, gin/wine flights, and door-to-door transit. Hit us up at www.theartours.com or call 0400 044 004 to plan!`;
        }
        if (text.includes("penguin") || text.includes("phillip island")) {
            return `The Phillip Island Penguin Parade Tour is quoted based on booking size and ticket type (General vs premium viewing). It's a gorgeous 9-hour coastal journey! Call AR Tours Direct on 0400 044 004 or visit www.theartours.com for a direct booking estimate.`;
        }
        return `We carry private charters to Victoria's top sights! \n- Great Ocean Road Reverse (14hrs): $149-$4,500\n- Yarra Valley Wine Tour (7hrs): $2,500 (group up to 12)\n- Phillip Island Penguin Parade: Custom quotes. \nCall AR Tours Direct on 0400 044 004 or visit www.theartours.com to lock it in!`;
    }
    
    // CPV Regulations
    if (text.includes("cpv") || text.includes("regulation") || text.includes("accreditation") || text.includes("safe transport")) {
        return "Safe Transport Victoria (STV) CPV Rules checklist for Tour Operators:\n1. Tour Operator Accreditation is mandatory.\n2. Annual Roadworthy Certificates (RWC) required.\n3. Drivers must hold valid commercial Driver Accreditation (DA) cards and up-to-date commercial medicals. \nWe pride ourselves on 100% compliance!";
    }
    
    // Review responder
    if (text.includes("review") || text.includes("google") || text.includes("tripadvisor")) {
        return "You can use our 'Tripadvisor/GYG Review Responder' box to draft professional responses automatically. If a guest had a wonderful tour with us, I'd say: 'G'day! Thank you so much for the lovely words. It was an absolute pleasure showing you our magnificent coastlines. See Australia your way!'";
    }

    // Booking fallback
    return "No worries at all! For any custom routes or specific dates, it's best to call us directly on 0400 044 004 or visit our online booking portal at www.theartours.com. We'll get you sorted in no time! Cheers, AR Tours Direct.";
}

// --- Quick AI Panel Chat ---
function sendQuickChat() {
    const input = document.getElementById("ai-quick-input");
    const text = input.value.trim();
    if (!text) return;
    
    const chat = document.getElementById("ai-quick-chat");
    
    // Add User Message
    const userDiv = document.createElement("div");
    userDiv.className = "chat-message user";
    userDiv.innerText = text;
    chat.appendChild(userDiv);
    
    input.value = "";
    chat.scrollTop = chat.scrollHeight;
    
    // Add AI Response after delay
    setTimeout(() => {
        const responseText = simulateAIResponse(text);
        const aiDiv = document.createElement("div");
        aiDiv.className = "chat-message ai";
        aiDiv.innerText = responseText;
        chat.appendChild(aiDiv);
        chat.scrollTop = chat.scrollHeight;
    }, 800);
}

// --- Full AI tab Chat ---
function sendFullChat() {
    const input = document.getElementById("ai-full-input");
    const text = input.value.trim();
    if (!text) return;
    
    const chat = document.getElementById("ai-full-chat");
    
    // Add User Message
    const userDiv = document.createElement("div");
    userDiv.className = "chat-message user";
    userDiv.innerText = text;
    chat.appendChild(userDiv);
    
    input.value = "";
    chat.scrollTop = chat.scrollHeight;
    
    // Add AI Response after delay
    setTimeout(() => {
        const responseText = simulateAIResponse(text);
        const aiDiv = document.createElement("div");
        aiDiv.className = "chat-message ai";
        aiDiv.innerText = responseText;
        chat.appendChild(aiDiv);
        chat.scrollTop = chat.scrollHeight;
    }, 800);
}

// --- TripAdvisor/Google Review Reply Draft Generator ---
function generateReviewReply() {
    const review = document.getElementById("review-input").value.trim();
    if (!review) {
        showToast("Please paste a review first! 📝");
        return;
    }
    
    const replyBox = document.getElementById("review-reply-box");
    const replyText = document.getElementById("review-reply-text");
    
    showToast("AI Agent is drafting warm response... ✍️");
    
    setTimeout(() => {
        const draft = `G'day from AR Tours Direct!

Thank you so much for taking the time to share your feedback! It was an absolute pleasure hosting you and showing you the best of Victoria. We take immense pride in our warm hospitality, and we're thrilled to hear you had such an incredible time on our tour.

If you ever head back down under, we'd love to welcome you back for another unforgettable private tour. See Australia your way!

Warm regards,
AR Tours Direct
AR Tours Australia (www.theartours.com)
Direct Call: 0400 044 004`;

        replyText.innerText = draft;
        replyBox.style.display = "block";
        showToast("✨ Review response drafted successfully!");
    }, 1000);
}

function copyReplyText() {
    const text = document.getElementById("review-reply-text").innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Draft response copied to clipboard! 📋");
    });
}

// --- Toast helper ---
function showToast(msg) {
    const toast = document.getElementById("global-toast");
    toast.innerText = msg;
    toast.style.display = "block";
    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}
