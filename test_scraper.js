const axios = require('axios');
const cheerio = require('cheerio');

async function searchWeb(query) {
    try {
        const res = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        const results = [];
        $('.result__snippet').each((i, e) => {
            if (i < 5) results.push($(e).text().trim());
        });
        console.log("=== RESULTS FOR:", query, "===");
        console.log(results);
    } catch (e) {
        console.log("Error:", e.message);
    }
}

async function test() {
    await searchWeb("Sailor Piece Roblox Codes");
    await searchWeb("Sailor Piece Roblox Tier List");
}
test();
