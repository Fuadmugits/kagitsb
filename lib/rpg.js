const { RPG } = require('../database');

const RARITIES = [
    { name: 'Common', chance: 0.40, mult: 1 },
    { name: 'Uncommon', chance: 0.25, mult: 1.5 },
    { name: 'Rare', chance: 0.15, mult: 2.5 },
    { name: 'Epic', chance: 0.10, mult: 5 },
    { name: 'Legendary', chance: 0.06, mult: 10 },
    { name: 'Mythic', chance: 0.03, mult: 25 },
    { name: 'Secret', chance: 0.01, mult: 100 }
];

const GRADES = [
    { name: 'E', chance: 0.30, mult: 1 },
    { name: 'D', chance: 0.25, mult: 1.2 },
    { name: 'C', chance: 0.20, mult: 1.5 },
    { name: 'B', chance: 0.12, mult: 2 },
    { name: 'A', chance: 0.08, mult: 3 },
    { name: 'S', chance: 0.03, mult: 5 },
    { name: 'SS', chance: 0.015, mult: 8 },
    { name: 'SSS+', chance: 0.005, mult: 15 }
];

const ITEM_TYPES = ['weapon', 'helmet', 'armor', 'glove', 'legging', 'shoe'];

const PREFIXES = ['Celestial', 'Abyssal', 'Infernal', 'Phantom', 'Crystal', 'Dragon', 'Titan', 'Shadow', 'Holy', 'Demonic'];
const SUFFIXES = ['Rupture', 'Guard', 'Strike', 'Soul', 'Wrath', 'Aura', 'Grace', 'Edge', 'Scale', 'Core'];

const BASE_STATS = {
    weapon: { power: 100, defense: 0, luck: 5 },
    helmet: { power: 10, defense: 30, luck: 15 },
    armor: { power: 10, defense: 60, luck: 10 },
    glove: { power: 25, defense: 20, luck: 20 },
    legging: { power: 10, defense: 40, luck: 10 },
    shoe: { power: 5, defense: 20, luck: 30 }
};

const MONSTERS = {
    slime: { name: 'Slime', powerReq: 10, dropChance: 0.3 },
    goblin: { name: 'Goblin', powerReq: 100, dropChance: 0.4 },
    orc: { name: 'Orc', powerReq: 500, dropChance: 0.5 },
    demon: { name: 'Demon', powerReq: 2500, dropChance: 0.6 },
    dragon: { name: 'Dragon', powerReq: 10000, dropChance: 0.7 },
    leviathan: { name: 'Leviathan', powerReq: 50000, dropChance: 0.8 },
    'ancient-god': { name: 'Ancient God', powerReq: 200000, dropChance: 1.0 }
};

function getRandomByChance(array) {
    const totalChance = array.reduce((sum, item) => sum + item.chance, 0);
    let random = Math.random() * totalChance;
    for (const item of array) {
        if (random < item.chance) return item;
        random -= item.chance;
    }
    return array[array.length - 1]; // Fallback
}

function generateItem(itemType) {
    if (!ITEM_TYPES.includes(itemType)) return null;
    
    const rarity = getRandomByChance(RARITIES);
    const grade = getRandomByChance(GRADES);
    
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    const itemName = `${prefix} ${suffix} ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`;
    
    const base = BASE_STATS[itemType];
    const totalMult = rarity.mult * grade.mult;
    
    return {
        type: itemType,
        name: itemName,
        rarity: rarity.name,
        grade: grade.name,
        stats: {
            power: Math.floor(base.power * totalMult),
            defense: Math.floor(base.defense * totalMult),
            luck: Math.floor(base.luck * totalMult)
        }
    };
}

function calculateTotalStats(jid) {
    const userRpg = RPG.getUser(jid);
    let totalStats = { power: 0, defense: 0, luck: 0 };
    
    for (const slot of ITEM_TYPES) {
        if (userRpg[slot]) {
            try {
                const item = JSON.parse(userRpg[slot]);
                if (item && item.stats) {
                    totalStats.power += item.stats.power || 0;
                    totalStats.defense += item.stats.defense || 0;
                    totalStats.luck += item.stats.luck || 0;
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
    }
    
    // Add base human stats
    totalStats.power += userRpg.base_power || 10;
    totalStats.defense += userRpg.base_defense || 10;
    totalStats.luck += userRpg.base_luck || 0;
    
    return totalStats;
}

module.exports = {
    RARITIES,
    GRADES,
    ITEM_TYPES,
    MONSTERS,
    generateItem,
    calculateTotalStats
};
