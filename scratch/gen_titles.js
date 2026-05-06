const fs = require('fs');
const path = require('path');

const titles = [];
let idCounter = 1;

function addTitle(name, req, mults) {
    titles.push({
        id: 'T' + idCounter++,
        name,
        requirement: req,
        stats: mults || null // null means cosmetic only
    });
}

// 1. Cosmetic Titles (Easy to get, no stats) - 50 titles
const cosmeticPrefixes = ['The', 'Novice', 'Amateur', 'Beginner', 'Casual', 'Lazy', 'Sleepy', 'Happy', 'Sad', 'Angry'];
const cosmeticSuffixes = ['Adventurer', 'Fighter', 'Explorer', 'Player', 'Walker', 'Talker', 'Observer', 'Collector', 'Sleeper', 'Eater'];
for(let p of cosmeticPrefixes) {
    for(let s of cosmeticSuffixes) {
        if(titles.length >= 50) break;
        addTitle(`${p} ${s}`, `Tersedia untuk semua player`, null);
    }
}

// 2. Beginner Stat Titles (Slight buffs) - 40 titles
const begStats = [
    { pwr: 1.1, def: 1.0, luck: 1.0, exp: 1.1 },
    { pwr: 1.0, def: 1.2, luck: 1.0, exp: 1.0 },
    { pwr: 1.0, def: 1.0, luck: 1.5, exp: 1.0 },
    { pwr: 1.2, def: 1.2, luck: 1.0, exp: 1.2 },
];
const begNames = ['Trainee', 'Squire', 'Apprentice', 'Militia', 'Scout', 'Mercenary', 'Brawler', 'Thief', 'Acolyte', 'Hunter'];
const begAdjs = ['Brave', 'Swift', 'Sturdy', 'Lucky', 'Eager', 'Wild', 'Silent', 'Bold', 'Clever', 'Tough'];
for(let n of begNames) {
    for(let a of begAdjs) {
        if(titles.length >= 90) break;
        const st = begStats[Math.floor(Math.random()*begStats.length)];
        addTitle(`${a} ${n}`, `Selesaikan 10 pertarungan`, { power: st.pwr, defense: st.def, luck: st.luck, exp: st.exp });
    }
}

// 3. Intermediate Titles (Medium buffs) - 50 titles
const intStats = [
    { pwr: 1.5, def: 1.5, luck: 1.2, exp: 1.5 },
    { pwr: 2.0, def: 1.0, luck: 1.0, exp: 1.5 },
    { pwr: 1.0, def: 2.0, luck: 1.0, exp: 1.5 },
    { pwr: 1.0, def: 1.0, luck: 3.0, exp: 2.0 },
];
const intNames = ['Knight', 'Warrior', 'Mage', 'Ranger', 'Paladin', 'Assassin', 'Berserker', 'Sorcerer', 'Druid', 'Cleric'];
const intAdjs = ['Elite', 'Veteran', 'Fierce', 'Shadow', 'Light', 'Iron', 'Blood', 'Frost', 'Flame', 'Storm'];
for(let n of intNames) {
    for(let a of intAdjs) {
        if(titles.length >= 140) break;
        const st = intStats[Math.floor(Math.random()*intStats.length)];
        addTitle(`${a} ${n}`, `Kalahkan monster tier Kuat 50 kali`, { power: st.pwr, defense: st.def, luck: st.luck, exp: st.exp });
    }
}

// 4. Advanced Titles (High buffs) - 40 titles
const advStats = [
    { pwr: 3.0, def: 3.0, luck: 2.0, exp: 2.5 },
    { pwr: 4.0, def: 2.0, luck: 2.0, exp: 2.5 },
    { pwr: 2.0, def: 4.0, luck: 2.0, exp: 2.5 },
    { pwr: 2.0, def: 2.0, luck: 5.0, exp: 3.0 },
];
const advNames = ['Warlord', 'Grandmaster', 'Archmage', 'Sniper', 'Templar', 'Ninja', 'Behemoth', 'Warlock', 'Shaman', 'Bishop'];
const advAdjs = ['Mythic', 'Legendary', 'Divine', 'Abyssal', 'Celestial', 'Demonic', 'Radiant', 'Corrupted', 'Astral', 'Ethereal'];
for(let n of advNames) {
    for(let a of advAdjs) {
        if(titles.length >= 180) break;
        const st = advStats[Math.floor(Math.random()*advStats.length)];
        addTitle(`${a} ${n}`, `Kalahkan Boss Raid 10 kali`, { power: st.pwr, defense: st.def, luck: st.luck, exp: st.exp });
    }
}

// 5. God Tier / Special Titles (Massive buffs) - 20 titles
const godStats = [
    { pwr: 10.0, def: 10.0, luck: 10.0, exp: 3.5 },
    { pwr: 15.0, def: 5.0, luck: 5.0, exp: 4.0 },
    { pwr: 5.0, def: 15.0, luck: 5.0, exp: 4.0 },
    { pwr: 8.0, def: 8.0, luck: 15.0, exp: 5.0 },
    { pwr: 20.0, def: 20.0, luck: 20.0, exp: 10.0 }, // The ultimate
];
const godNames = [
    'THE CURSED', 'THE BLESSED', 'GOD OF WAR', 'LORD OF ABYSS', 'STAR EATER',
    'WORLD BREAKER', 'IMMORTAL SOUL', 'TIME WEAVER', 'VOID EMPEROR', 'CHAOS BRINGER',
    'LIGHT BRINGER', 'SHADOW MONARCH', 'DRAGON SOVEREIGN', 'DEMON KING', 'ANGELIC SAVIOR',
    'REALITY BENDER', 'INFINITE BEING', 'DEATH INCARNATE', 'LIFE GIVER', 'THE ONE TRUE GOD'
];
for(let n of godNames) {
    if(titles.length >= 200) break;
    const st = n === 'THE ONE TRUE GOD' ? godStats[4] : godStats[Math.floor(Math.random()*4)];
    addTitle(n, `Gelar Eksklusif (Hanya dari event / gacha langka)`, { power: st.pwr, defense: st.def, luck: st.luck, exp: st.exp });
}

// Force exact values for the user's specific request
const cursedIndex = titles.findIndex(t => t.name === 'THE CURSED');
if(cursedIndex !== -1) {
    titles[cursedIndex].stats = { power: 10.0, defense: 10.0, luck: 10.0, exp: 3.5 };
}

const fileContent = `const RPG_TITLES = ${JSON.stringify(titles, null, 4)};\n\nmodule.exports = { RPG_TITLES };\n`;

fs.writeFileSync(path.join(__dirname, '../lib/titles.js'), fileContent);
console.log('Successfully generated 200 titles in lib/titles.js');
