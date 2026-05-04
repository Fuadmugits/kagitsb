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
    'slime': { name: 'Slime', powerReq: 10, dropChance: 0.20, class: 'lemah' },
    'bat': { name: 'Bat', powerReq: 20, dropChance: 0.21, class: 'lemah' },
    'rat': { name: 'Rat', powerReq: 30, dropChance: 0.22, class: 'lemah' },
    'spider': { name: 'Spider', powerReq: 50, dropChance: 0.23, class: 'lemah' },
    'snake': { name: 'Snake', powerReq: 75, dropChance: 0.24, class: 'lemah' },
    'goblin': { name: 'Goblin', powerReq: 100, dropChance: 0.25, class: 'lemah' },
    'skeleton': { name: 'Skeleton', powerReq: 150, dropChance: 0.26, class: 'lemah' },
    'zombie': { name: 'Zombie', powerReq: 200, dropChance: 0.27, class: 'lemah' },
    'wolf': { name: 'Wolf', powerReq: 250, dropChance: 0.28, class: 'lemah' },
    'boar': { name: 'Boar', powerReq: 300, dropChance: 0.29, class: 'lemah' },
    'bear': { name: 'Bear', powerReq: 350, dropChance: 0.30, class: 'lemah' },
    'bandit': { name: 'Bandit', powerReq: 400, dropChance: 0.31, class: 'lemah' },
    'rogue': { name: 'Rogue', powerReq: 500, dropChance: 0.32, class: 'lemah' },
    'cultist': { name: 'Cultist', powerReq: 600, dropChance: 0.33, class: 'lemah' },
    'imp': { name: 'Imp', powerReq: 700, dropChance: 0.34, class: 'lemah' },
    'harpy': { name: 'Harpy', powerReq: 800, dropChance: 0.35, class: 'lemah' },
    'murloc': { name: 'Murloc', powerReq: 900, dropChance: 0.36, class: 'lemah' },
    'kobold': { name: 'Kobold', powerReq: 1000, dropChance: 0.37, class: 'lemah' },
    'gnome': { name: 'Gnome', powerReq: 1200, dropChance: 0.38, class: 'lemah' },
    'pixie': { name: 'Pixie', powerReq: 1500, dropChance: 0.39, class: 'lemah' },
    'orc': { name: 'Orc', powerReq: 2500, dropChance: 0.30, class: 'kuat' },
    'troll': { name: 'Troll', powerReq: 3000, dropChance: 0.32, class: 'kuat' },
    'ogre': { name: 'Ogre', powerReq: 4000, dropChance: 0.33, class: 'kuat' },
    'minotaur': { name: 'Minotaur', powerReq: 5000, dropChance: 0.34, class: 'kuat' },
    'cyclops': { name: 'Cyclops', powerReq: 7500, dropChance: 0.36, class: 'kuat' },
    'golem': { name: 'Golem', powerReq: 10000, dropChance: 0.38, class: 'kuat' },
    'gargoyle': { name: 'Gargoyle', powerReq: 15000, dropChance: 0.39, class: 'kuat' },
    'wraith': { name: 'Wraith', powerReq: 20000, dropChance: 0.40, class: 'kuat' },
    'banshee': { name: 'Banshee', powerReq: 25000, dropChance: 0.42, class: 'kuat' },
    'vampire': { name: 'Vampire', powerReq: 30000, dropChance: 0.43, class: 'kuat' },
    'werewolf': { name: 'Werewolf', powerReq: 40000, dropChance: 0.45, class: 'kuat' },
    'chimera': { name: 'Chimera', powerReq: 50000, dropChance: 0.46, class: 'kuat' },
    'manticore': { name: 'Manticore', powerReq: 60000, dropChance: 0.48, class: 'kuat' },
    'basilisk': { name: 'Basilisk', powerReq: 75000, dropChance: 0.49, class: 'kuat' },
    'hydra': { name: 'Hydra', powerReq: 90000, dropChance: 0.51, class: 'kuat' },
    'griffon': { name: 'Griffon', powerReq: 100000, dropChance: 0.52, class: 'kuat' },
    'wyvern': { name: 'Wyvern', powerReq: 120000, dropChance: 0.54, class: 'kuat' },
    'drake': { name: 'Drake', powerReq: 135000, dropChance: 0.55, class: 'kuat' },
    'dragon': { name: 'Dragon', powerReq: 150000, dropChance: 0.57, class: 'kuat' },
    'behemoth': { name: 'Behemoth', powerReq: 175000, dropChance: 0.58, class: 'kuat' },
    'leviathan': { name: 'Leviathan', powerReq: 200000, dropChance: 0.50, class: 'boss' },
    'kraken': { name: 'Kraken', powerReq: 250000, dropChance: 0.52, class: 'boss' },
    'cerberus': { name: 'Cerberus', powerReq: 300000, dropChance: 0.54, class: 'boss' },
    'fenrir': { name: 'Fenrir', powerReq: 400000, dropChance: 0.56, class: 'boss' },
    'jormungandr': { name: 'Jormungandr', powerReq: 500000, dropChance: 0.58, class: 'boss' },
    'titan': { name: 'Titan', powerReq: 750000, dropChance: 0.60, class: 'boss' },
    'colossus': { name: 'Colossus', powerReq: 1000000, dropChance: 0.62, class: 'boss' },
    'archdemon': { name: 'Archdemon', powerReq: 1250000, dropChance: 0.64, class: 'boss' },
    'archangel': { name: 'Archangel', powerReq: 1500000, dropChance: 0.66, class: 'boss' },
    'lich-king': { name: 'Lich King', powerReq: 1750000, dropChance: 0.68, class: 'boss' },
    'death-knight': { name: 'Death Knight', powerReq: 2000000, dropChance: 0.70, class: 'boss' },
    'chaos-elemental': { name: 'Chaos Elemental', powerReq: 2500000, dropChance: 0.72, class: 'boss' },
    'void-terror': { name: 'Void Terror', powerReq: 3000000, dropChance: 0.74, class: 'boss' },
    'star-spawn': { name: 'Star Spawn', powerReq: 3500000, dropChance: 0.76, class: 'boss' },
    'ancient-dragon': { name: 'Ancient Dragon', powerReq: 4000000, dropChance: 0.78, class: 'boss' },
    'primordial-behemoth': { name: 'Primordial Behemoth', powerReq: 4500000, dropChance: 0.80, class: 'boss' },
    'elder-god': { name: 'Elder God', powerReq: 5000000, dropChance: 0.82, class: 'boss' },
    'abyssal-lord': { name: 'Abyssal Lord', powerReq: 6000000, dropChance: 0.84, class: 'boss' },
    'cosmic-entity': { name: 'Cosmic Entity', powerReq: 8000000, dropChance: 0.86, class: 'boss' },
    'creator': { name: 'Creator', powerReq: 10000000, dropChance: 0.88, class: 'boss' }
};

const RPG_SHOP = {
    weapon: [
        { id: 'w1', name: 'Iron Sword', price: 100, rarity: 'Common', grade: 'C', stats: { power: 150, defense: 0, luck: 5 } },
        { id: 'w2', name: 'Steel Blade', price: 500, rarity: 'Uncommon', grade: 'B', stats: { power: 300, defense: 0, luck: 10 } },
        { id: 'w3', name: 'Mithril Greatsword', price: 2500, rarity: 'Rare', grade: 'A', stats: { power: 750, defense: 0, luck: 15 } }
    ],
    helmet: [
        { id: 'h1', name: 'Iron Helmet', price: 100, rarity: 'Common', grade: 'C', stats: { power: 15, defense: 45, luck: 22 } },
        { id: 'h2', name: 'Steel Helm', price: 500, rarity: 'Uncommon', grade: 'B', stats: { power: 30, defense: 90, luck: 45 } },
        { id: 'h3', name: 'Mithril Crown', price: 2500, rarity: 'Rare', grade: 'A', stats: { power: 75, defense: 225, luck: 112 } }
    ],
    armor: [
        { id: 'a1', name: 'Iron Chestplate', price: 100, rarity: 'Common', grade: 'C', stats: { power: 15, defense: 90, luck: 15 } },
        { id: 'a2', name: 'Steel Armor', price: 500, rarity: 'Uncommon', grade: 'B', stats: { power: 30, defense: 180, luck: 30 } },
        { id: 'a3', name: 'Mithril Plate', price: 2500, rarity: 'Rare', grade: 'A', stats: { power: 75, defense: 450, luck: 75 } }
    ],
    glove: [
        { id: 'g1', name: 'Iron Gloves', price: 100, rarity: 'Common', grade: 'C', stats: { power: 37, defense: 30, luck: 30 } },
        { id: 'g2', name: 'Steel Gauntlets', price: 500, rarity: 'Uncommon', grade: 'B', stats: { power: 75, defense: 60, luck: 60 } },
        { id: 'g3', name: 'Mithril Fists', price: 2500, rarity: 'Rare', grade: 'A', stats: { power: 187, defense: 150, luck: 150 } }
    ],
    legging: [
        { id: 'l1', name: 'Iron Leggings', price: 100, rarity: 'Common', grade: 'C', stats: { power: 15, defense: 60, luck: 15 } },
        { id: 'l2', name: 'Steel Greaves', price: 500, rarity: 'Uncommon', grade: 'B', stats: { power: 30, defense: 120, luck: 30 } },
        { id: 'l3', name: 'Mithril Guards', price: 2500, rarity: 'Rare', grade: 'A', stats: { power: 75, defense: 300, luck: 75 } }
    ],
    shoe: [
        { id: 's1', name: 'Iron Boots', price: 100, rarity: 'Common', grade: 'C', stats: { power: 7, defense: 30, luck: 45 } },
        { id: 's2', name: 'Steel Boots', price: 500, rarity: 'Uncommon', grade: 'B', stats: { power: 15, defense: 60, luck: 90 } },
        { id: 's3', name: 'Mithril Treads', price: 2500, rarity: 'Rare', grade: 'A', stats: { power: 37, defense: 150, luck: 225 } }
    ]
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

function generateItem(itemType, monsterClass = 'kuat') {
    if (!ITEM_TYPES.includes(itemType)) return null;
    
    let availableRarities = RARITIES;
    if (monsterClass === 'lemah') {
        availableRarities = RARITIES.filter(r => !['Legendary', 'Mythic', 'Secret'].includes(r.name));
    }
    
    const rarity = getRandomByChance(availableRarities);
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
    RPG_SHOP,
    generateItem,
    calculateTotalStats
};
