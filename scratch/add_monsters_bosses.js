const fs = require('fs');
const path = require('path');

const rpgPath = path.join(__dirname, '../lib/rpg.js');
let code = fs.readFileSync(rpgPath, 'utf8');

// 1. Generate Monsters
let newMonsters = [];
let currentPower = 20000000; // 20 Million
const prefixes = ['Corrupted', 'Awakened', 'Abyssal', 'Cosmic', 'Transcendent', 'Ethereal', 'Phantom', 'Infernal', 'Celestial', 'Void', 'Chaos', 'Eternal', 'Primordial'];
const names = ['Beast', 'Dragon', 'Entity', 'Guardian', 'Titan', 'Reaper', 'Leviathan', 'Goliath', 'Specter', 'Warlord', 'Fiend', 'Monarch', 'Serpent'];

for (let i = 0; i < 150; i++) {
    let p = prefixes[Math.floor(Math.random() * prefixes.length)];
    let n = names[Math.floor(Math.random() * names.length)];
    let monName = p + ' ' + n + ' ' + (i+1);
    let key = monName.toLowerCase().replace(/\s+/g, '-');
    let mClass = 'boss';
    let dropChance = 0.35 + (i * 0.001);
    if (dropChance > 0.8) dropChance = 0.8;
    currentPower = Math.floor(currentPower * 1.15); // Increase by 15% each time
    
    newMonsters.push(`    '${key}': { name: '${monName}', powerReq: ${currentPower}, dropChance: ${dropChance.toFixed(3)}, class: '${mClass}' }`);
}

// 2. Generate Boss Raids
let newBosses = [];
let currentId = 124; // Since existing is 123
let currentBaseStat = 250000000; // 250M
let currentHp = 25000000000; // 25 Billion
let currentCost = 150000;
const bossColors = ['🔴', '🔵', '🟢', '🟡', '🟣', '⚫', '⚪', '🔮', '✨', '🔥', '⚡', '❄️'];

for (let i = 0; i < 100; i++) {
    let p = prefixes[Math.floor(Math.random() * prefixes.length)];
    let n = names[Math.floor(Math.random() * names.length)];
    let bName = p + ' ' + n + ' King';
    let bColor = bossColors[Math.floor(Math.random() * bossColors.length)];
    currentBaseStat = Math.floor(currentBaseStat * 1.1);
    currentHp = Math.floor(currentHp * 1.1);
    currentCost += 5000;
    
    let bStr = `    {
        "id": ${currentId},
        "name": "${bName}",
        "hp": ${currentHp},
        "cost": ${currentCost},
        "baseStat": ${currentBaseStat},
        "rarity": "Godly",
        "color": "${bColor}",
        "drops": {
            "helmet": "${bName}'s Crown",
            "armor": "${bName}'s Aegis",
            "legging": "${bName}'s Guards",
            "glove": "${bName}'s Fists",
            "weapon": "${bName}'s Destroyer",
            "shoe": "${bName}'s Treads"
        }
    }`;
    newBosses.push(bStr);
    currentId++;
}

// Inject into file
// Find MONSTERS end
let monstersInject = ',\n' + newMonsters.join(',\n') + '\n};';
code = code.replace(/};\s*\n\s*const RPG_SHOP = {/, monstersInject + '\n\nconst RPG_SHOP = {');

// Find RAID_BOSSES end
let bossesInject = ',\n' + newBosses.join(',\n') + '\n];';
code = code.replace(/}\s*\];\s*\n\s*function/g, '}' + bossesInject + '\n\nfunction');

// In case the Regex fails for Bosses because of EOF or different structure:
if (!code.includes(bossesInject)) {
   code = code.replace(/}\s*\];\s*module\.exports/g, '}' + bossesInject + '\nmodule.exports');
}

fs.writeFileSync(rpgPath, code, 'utf8');
console.log('Successfully injected monsters and bosses!');
