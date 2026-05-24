const { RPG } = require('../database');
const { RPG_TITLES } = require('./titles');

const RARITIES = [
    { name: 'Common', chance: 0.50, mult: 1 },
    { name: 'Uncommon', chance: 0.25, mult: 1.2 },
    { name: 'Rare', chance: 0.12, mult: 1.5 },
    { name: 'Epic', chance: 0.08, mult: 2.0 },
    { name: 'Legendary', chance: 0.03, mult: 3.0 },
    { name: 'Mythic', chance: 0.015, mult: 5.0 },
    { name: 'Secret', chance: 0.005, mult: 8.0 },
    { name: 'Divine', chance: 0.002, mult: 15.0 },
    { name: 'Celestial', chance: 0.001, mult: 30.0 },
    { name: 'Void', chance: 0.0005, mult: 60.0 },
    { name: 'Cosmic', chance: 0.0002, mult: 120.0 },
    { name: 'Transcendent', chance: 0.0001, mult: 250.0 },
    { name: 'Godly', chance: 0.00005, mult: 600.0 },
    { name: 'Z', chance: 0.00001, mult: 2000.0 },
    { name: 'ZZ', chance: 0.000001, mult: 10000.0 },
    { name: 'ZZZ', chance: 0.0000001, mult: 50000.0 },
    { name: 'ZZZ+', chance: 0.0000000075, mult: 250000.0 }
];

const GRADES = [
    { name: 'E', chance: 0.35, mult: 0.5 },
    { name: 'D', chance: 0.25, mult: 0.8 },
    { name: 'C', chance: 0.20, mult: 1.0 },
    { name: 'B', chance: 0.10, mult: 1.2 },
    { name: 'A', chance: 0.06, mult: 1.5 },
    { name: 'S', chance: 0.025, mult: 2.0 },
    { name: 'SS', chance: 0.01, mult: 2.5 },
    { name: 'SSS+', chance: 0.005, mult: 3.0 },
    { name: 'Z', chance: 0.001, mult: 10.0 },
    { name: 'ZZ', chance: 0.0005, mult: 50.0 },
    { name: 'ZZZ', chance: 0.0001, mult: 200.0 },
    { name: 'ZZZ+', chance: 0.00001, mult: 1000.0 }
];

const ITEM_TYPES = ['weapon', 'helmet', 'armor', 'glove', 'legging', 'shoe'];

const PREFIXES = ['Celestial', 'Abyssal', 'Infernal', 'Phantom', 'Crystal', 'Dragon', 'Titan', 'Shadow', 'Holy', 'Demonic'];
const SUFFIXES = ['Rupture', 'Guard', 'Strike', 'Soul', 'Wrath', 'Aura', 'Grace', 'Edge', 'Scale', 'Core'];

const BASE_STATS = {
    weapon: { power: 50, defense: 0, luck: 5 },
    helmet: { power: 5, defense: 25, luck: 10 },
    armor: { power: 5, defense: 50, luck: 5 },
    glove: { power: 15, defense: 15, luck: 15 },
    legging: { power: 5, defense: 30, luck: 5 },
    shoe: { power: 2, defense: 15, luck: 20 }
};

const MONSTERS = {
    'slime': { name: 'Slime', powerReq: 10, dropChance: 0.08, class: 'lemah' },
    'bat': { name: 'Bat', powerReq: 20, dropChance: 0.08, class: 'lemah' },
    'rat': { name: 'Rat', powerReq: 30, dropChance: 0.09, class: 'lemah' },
    'spider': { name: 'Spider', powerReq: 50, dropChance: 0.09, class: 'lemah' },
    'snake': { name: 'Snake', powerReq: 75, dropChance: 0.10, class: 'lemah' },
    'goblin': { name: 'Goblin', powerReq: 100, dropChance: 0.10, class: 'lemah' },
    'skeleton': { name: 'Skeleton', powerReq: 150, dropChance: 0.10, class: 'lemah' },
    'zombie': { name: 'Zombie', powerReq: 200, dropChance: 0.11, class: 'lemah' },
    'wolf': { name: 'Wolf', powerReq: 250, dropChance: 0.11, class: 'lemah' },
    'boar': { name: 'Boar', powerReq: 300, dropChance: 0.12, class: 'lemah' },
    'bear': { name: 'Bear', powerReq: 350, dropChance: 0.12, class: 'lemah' },
    'bandit': { name: 'Bandit', powerReq: 400, dropChance: 0.12, class: 'lemah' },
    'rogue': { name: 'Rogue', powerReq: 500, dropChance: 0.13, class: 'lemah' },
    'cultist': { name: 'Cultist', powerReq: 600, dropChance: 0.13, class: 'lemah' },
    'imp': { name: 'Imp', powerReq: 700, dropChance: 0.14, class: 'lemah' },
    'harpy': { name: 'Harpy', powerReq: 800, dropChance: 0.14, class: 'lemah' },
    'murloc': { name: 'Murloc', powerReq: 900, dropChance: 0.14, class: 'lemah' },
    'kobold': { name: 'Kobold', powerReq: 1000, dropChance: 0.15, class: 'lemah' },
    'gnome': { name: 'Gnome', powerReq: 1200, dropChance: 0.15, class: 'lemah' },
    'pixie': { name: 'Pixie', powerReq: 1500, dropChance: 0.16, class: 'lemah' },
    'orc': { name: 'Orc', powerReq: 2500, dropChance: 0.12, class: 'kuat' },
    'troll': { name: 'Troll', powerReq: 3000, dropChance: 0.13, class: 'kuat' },
    'ogre': { name: 'Ogre', powerReq: 4000, dropChance: 0.13, class: 'kuat' },
    'minotaur': { name: 'Minotaur', powerReq: 5000, dropChance: 0.14, class: 'kuat' },
    'cyclops': { name: 'Cyclops', powerReq: 7500, dropChance: 0.14, class: 'kuat' },
    'golem': { name: 'Golem', powerReq: 10000, dropChance: 0.15, class: 'kuat' },
    'gargoyle': { name: 'Gargoyle', powerReq: 15000, dropChance: 0.16, class: 'kuat' },
    'wraith': { name: 'Wraith', powerReq: 20000, dropChance: 0.16, class: 'kuat' },
    'banshee': { name: 'Banshee', powerReq: 25000, dropChance: 0.17, class: 'kuat' },
    'vampire': { name: 'Vampire', powerReq: 30000, dropChance: 0.17, class: 'kuat' },
    'werewolf': { name: 'Werewolf', powerReq: 40000, dropChance: 0.18, class: 'kuat' },
    'chimera': { name: 'Chimera', powerReq: 50000, dropChance: 0.18, class: 'kuat' },
    'manticore': { name: 'Manticore', powerReq: 60000, dropChance: 0.19, class: 'kuat' },
    'basilisk': { name: 'Basilisk', powerReq: 75000, dropChance: 0.20, class: 'kuat' },
    'hydra': { name: 'Hydra', powerReq: 90000, dropChance: 0.20, class: 'kuat' },
    'griffon': { name: 'Griffon', powerReq: 100000, dropChance: 0.21, class: 'kuat' },
    'wyvern': { name: 'Wyvern', powerReq: 120000, dropChance: 0.22, class: 'kuat' },
    'drake': { name: 'Drake', powerReq: 135000, dropChance: 0.22, class: 'kuat' },
    'dragon': { name: 'Dragon', powerReq: 150000, dropChance: 0.23, class: 'kuat' },
    'behemoth': { name: 'Behemoth', powerReq: 175000, dropChance: 0.23, class: 'kuat' },
    'leviathan': { name: 'Leviathan', powerReq: 200000, dropChance: 0.20, class: 'boss' },
    'kraken': { name: 'Kraken', powerReq: 250000, dropChance: 0.21, class: 'boss' },
    'cerberus': { name: 'Cerberus', powerReq: 300000, dropChance: 0.22, class: 'boss' },
    'fenrir': { name: 'Fenrir', powerReq: 400000, dropChance: 0.22, class: 'boss' },
    'jormungandr': { name: 'Jormungandr', powerReq: 500000, dropChance: 0.23, class: 'boss' },
    'titan': { name: 'Titan', powerReq: 750000, dropChance: 0.24, class: 'boss' },
    'colossus': { name: 'Colossus', powerReq: 1000000, dropChance: 0.25, class: 'boss' },
    'archdemon': { name: 'Archdemon', powerReq: 1250000, dropChance: 0.26, class: 'boss' },
    'archangel': { name: 'Archangel', powerReq: 1500000, dropChance: 0.26, class: 'boss' },
    'lich-king': { name: 'Lich King', powerReq: 1750000, dropChance: 0.27, class: 'boss' },
    'death-knight': { name: 'Death Knight', powerReq: 2000000, dropChance: 0.28, class: 'boss' },
    'chaos-elemental': { name: 'Chaos Elemental', powerReq: 2500000, dropChance: 0.29, class: 'boss' },
    'void-terror': { name: 'Void Terror', powerReq: 3000000, dropChance: 0.30, class: 'boss' },
    'star-spawn': { name: 'Star Spawn', powerReq: 3500000, dropChance: 0.30, class: 'boss' },
    'ancient-dragon': { name: 'Ancient Dragon', powerReq: 4000000, dropChance: 0.31, class: 'boss' },
    'primordial-behemoth': { name: 'Primordial Behemoth', powerReq: 4500000, dropChance: 0.32, class: 'boss' },
    'elder-god': { name: 'Elder God', powerReq: 5000000, dropChance: 0.33, class: 'boss' },
    'abyssal-lord': { name: 'Abyssal Lord', powerReq: 6000000, dropChance: 0.34, class: 'boss' },
    'cosmic-entity': { name: 'Cosmic Entity', powerReq: 8000000, dropChance: 0.34, class: 'boss' },
    'creator': { name: 'Creator', powerReq: 10000000, dropChance: 0.35, class: 'boss' }
};

const RPG_SHOP = {
    weapon: [
        { id: 'w1', name: 'Iron Sword', price: 5000000, rarity: 'Common', grade: 'C', stats: { power: 500, defense: 0, luck: 10 } },
        { id: 'w2', name: 'Steel Blade', price: 25000000, rarity: 'Uncommon', grade: 'B', stats: { power: 1200, defense: 0, luck: 25 } },
        { id: 'w3', name: 'Mithril Greatsword', price: 125000000, rarity: 'Rare', grade: 'A', stats: { power: 3000, defense: 0, luck: 50 } }
    ],
    helmet: [
        { id: 'h1', name: 'Iron Helmet', price: 5000000, rarity: 'Common', grade: 'C', stats: { power: 50, defense: 150, luck: 50 } },
        { id: 'h2', name: 'Steel Helm', price: 25000000, rarity: 'Uncommon', grade: 'B', stats: { power: 120, defense: 350, luck: 120 } },
        { id: 'h3', name: 'Mithril Crown', price: 125000000, rarity: 'Rare', grade: 'A', stats: { power: 300, defense: 800, luck: 300 } }
    ],
    armor: [
        { id: 'a1', name: 'Iron Chestplate', price: 5000000, rarity: 'Common', grade: 'C', stats: { power: 50, defense: 300, luck: 50 } },
        { id: 'a2', name: 'Steel Armor', price: 25000000, rarity: 'Uncommon', grade: 'B', stats: { power: 120, defense: 700, luck: 120 } },
        { id: 'a3', name: 'Mithril Plate', price: 125000000, rarity: 'Rare', grade: 'A', stats: { power: 300, defense: 1500, luck: 300 } }
    ],
    glove: [
        { id: 'g1', name: 'Iron Gloves', price: 5000000, rarity: 'Common', grade: 'C', stats: { power: 120, defense: 100, luck: 100 } },
        { id: 'g2', name: 'Steel Gauntlets', price: 25000000, rarity: 'Uncommon', grade: 'B', stats: { power: 300, defense: 250, luck: 250 } },
        { id: 'g3', name: 'Mithril Fists', price: 125000000, rarity: 'Rare', grade: 'A', stats: { power: 750, defense: 600, luck: 600 } }
    ],
    legging: [
        { id: 'l1', name: 'Iron Leggings', price: 5000000, rarity: 'Common', grade: 'C', stats: { power: 50, defense: 200, luck: 50 } },
        { id: 'l2', name: 'Steel Greaves', price: 25000000, rarity: 'Uncommon', grade: 'B', stats: { power: 120, defense: 450, luck: 120 } },
        { id: 'l3', name: 'Mithril Guards', price: 125000000, rarity: 'Rare', grade: 'A', stats: { power: 300, defense: 1000, luck: 300 } }
    ],
    shoe: [
        { id: 's1', name: 'Iron Boots', price: 5000000, rarity: 'Common', grade: 'C', stats: { power: 25, defense: 100, luck: 150 } },
        { id: 's2', name: 'Steel Boots', price: 25000000, rarity: 'Uncommon', grade: 'B', stats: { power: 60, defense: 250, luck: 350 } },
        { id: 's3', name: 'Mithril Treads', price: 125000000, rarity: 'Rare', grade: 'A', stats: { power: 150, defense: 600, luck: 800 } }
    ],
    consumable: [
        { id: 'c1', name: 'Mystery Gacha Box', price: 2500000, rarity: 'Rare', grade: 'S', stats: { effect: 'gacha' }, desc: 'Dapatkan item random/koin/balance!' },
        { id: 'c3', name: 'Wealth Voucher', price: 12500000, rarity: 'Rare', grade: 'S', stats: { effect: 'balance', min: 100000, max: 500000 }, desc: 'Dapatkan 100k - 500k Balance secara acak.' }
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
        durability: 100,
        stats: {
            power: Math.floor(base.power * totalMult),
            defense: Math.floor(base.defense * totalMult),
            luck: Math.floor(base.luck * totalMult)
        }
    };
}

function createCustomItem(itemType, rarityName, gradeName) {
    if (!ITEM_TYPES.includes(itemType)) return null;
    
    const rarity = RARITIES.find(r => r.name.toLowerCase() === rarityName.toLowerCase()) || RARITIES[0];
    const grade = GRADES.find(g => g.name.toLowerCase() === gradeName.toLowerCase()) || GRADES[0];
    
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
        durability: 100,
        stats: {
            power: Math.floor(base.power * totalMult),
            defense: Math.floor(base.defense * totalMult),
            luck: Math.floor(base.luck * totalMult)
        }
    };
}

function createSpecificRaidItem(bossId, itemType, gradeName) {
    const boss = RAID_BOSSES.find(b => b.id === bossId);
    if (!boss || !boss.drops[itemType]) return null;
    
    const itemName = boss.drops[itemType];
    const grade = GRADES.find(g => g.name.toLowerCase() === gradeName.toLowerCase()) || GRADES[0];
    const totalMult = grade.mult;
    
    return {
        type: itemType,
        name: itemName,
        rarity: boss.rarity,
        grade: grade.name,
        set: boss.name,
        durability: 100,
        stats: {
            power: Math.floor(boss.baseStat * totalMult * (itemType === 'weapon' ? 1.5 : 0.8)),
            defense: Math.floor(boss.baseStat * totalMult * (itemType === 'weapon' ? 0.2 : 1.2)),
            luck: Math.floor(boss.baseStat * 0.1 * totalMult)
        }
    };
}

function generateRaidItem(bossId, itemType) {
    const boss = RAID_BOSSES.find(b => b.id === bossId);
    if (!boss || !boss.drops[itemType]) return null;
    
    const itemName = boss.drops[itemType];
    const grade = getRandomByChance(GRADES);
    const totalMult = grade.mult; // Boss raid items use base stats + grade mult
    
    return {
        type: itemType,
        name: itemName,
        rarity: boss.rarity,
        grade: grade.name,
        set: boss.name, // The boss name is the set name
        durability: 100,
        stats: {
            power: Math.floor(boss.baseStat * totalMult * (itemType === 'weapon' ? 1.5 : 0.8)),
            defense: Math.floor(boss.baseStat * totalMult * (itemType === 'weapon' ? 0.2 : 1.2)),
            luck: Math.floor(boss.baseStat * 0.1 * totalMult)
        }
    };
}

function calculateTotalStats(jid, chatJid = null) {
    const userRpg = RPG.getUser(jid);
    let totalStats = { power: 0, defense: 0, luck: 0, expMult: 1.0 };
    const setCounts = {};
    
    for (const slot of ITEM_TYPES) {
        if (userRpg[slot]) {
            try {
                const item = JSON.parse(userRpg[slot]);
                if (item && item.stats) {
                    const dur = item.durability ?? 100;
                    if (dur > 0) {
                        totalStats.power += item.stats.power || 0;
                        totalStats.defense += item.stats.defense || 0;
                        totalStats.luck += item.stats.luck || 0;
                        
                        if (item.set) {
                            setCounts[item.set] = (setCounts[item.set] || 0) + 1;
                        }
                    }
                }
            } catch (e) {}
        }
    }
    
    // Set Bonus Calculation
    for (const setName in setCounts) {
        const count = setCounts[setName];
        if (count >= 5) {
            totalStats.power = Math.floor(totalStats.power * 1.25);
            totalStats.defense = Math.floor(totalStats.defense * 1.25);
        } else if (count >= 3) {
            totalStats.power = Math.floor(totalStats.power * 1.10);
            totalStats.defense = Math.floor(totalStats.defense * 1.10);
        }
    }
    
    // Add base human stats
    totalStats.power += userRpg.base_power || 10;
    totalStats.defense += userRpg.base_defense || 10;
    totalStats.luck += userRpg.base_luck || 0;
    
    // Ascension Bonus (Permanent Multiplier)
    const ascPowerMult = 1 + ((userRpg.asc_power || 0) * 0.1);
    const ascDefMult = 1 + ((userRpg.asc_defense || 0) * 0.1);
    const ascLuckMult = 1 + ((userRpg.asc_luck || 0) * 0.05); // Nerfed from 0.1 to 0.05
    
    totalStats.power = Math.floor(totalStats.power * ascPowerMult);
    totalStats.defense = Math.floor(totalStats.defense * ascDefMult);
    totalStats.luck = Math.floor(totalStats.luck * ascLuckMult);
    
    const { Settings } = require('../database');
    const abuseVal = chatJid ? Settings.get('adminabuse_' + chatJid) : null;
    const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
    
    if (multiplier > 1) {
        totalStats.luck *= multiplier;
    }
    
    // Apply Role Modifiers
    const role = userRpg.rpg_role || 'Beginner';
    if (role === 'Warrior') {
        totalStats.power = Math.floor(totalStats.power * 1.20);
        totalStats.luck = Math.floor(totalStats.luck * 0.90);
    } else if (role === 'Tank') {
        totalStats.defense = Math.floor(totalStats.defense * 1.30);
        totalStats.power = Math.floor(totalStats.power * 0.90);
    } else if (role === 'Assassin') {
        totalStats.luck = Math.floor(totalStats.luck * 1.30);
        totalStats.power = Math.floor(totalStats.power * 1.10);
        totalStats.defense = Math.floor(totalStats.defense * 0.80);
    } else if (role === 'Mage') {
        totalStats.power = Math.floor(totalStats.power * 1.15);
        totalStats.luck = Math.floor(totalStats.luck * 1.15);
        totalStats.defense = Math.floor(totalStats.defense * 0.80);
    }
    
    // Aura Bonus (Multiplies total final stats)
    if (userRpg.equipped_aura) {
        const aura = RPG_TITLES.find(t => t.id === userRpg.equipped_aura);
        if (aura && aura.stats) {
            totalStats.power = Math.floor(totalStats.power * (aura.stats.power || 1));
            totalStats.defense = Math.floor(totalStats.defense * (aura.stats.defense || 1));
            totalStats.luck = Math.floor(totalStats.luck * (aura.stats.luck || 1));
            totalStats.expMult = aura.stats.exp || 1.0;
        }
    }
    
    return totalStats;
}

const RAID_BOSSES = [
    { 
        id: 1, 
        name: 'Aethelgard', 
        hp: 50000, 
        cost: 2000, 
        baseStat: 5000, 
        rarity: 'Mythic', 
        color: '👻',
        drops: {
            helmet: 'Visor of the Fallen King',
            armor: 'Specter’s Cuirass',
            legging: 'Phantom Legguards',
            glove: 'Commander’s Grip',
            weapon: 'Honorable Soul-Reaper',
            shoe: 'Ethereal Sabatons'
        }
    },
    { 
        id: 2, 
        name: 'Ignis Draconis', 
        hp: 75000, 
        cost: 2500, 
        baseStat: 8000, 
        rarity: 'Mythic', 
        color: '🔥',
        drops: {
            helmet: 'Great-Horned Draconic Helm',
            armor: 'Obsidian Heartplate',
            legging: 'Lava-Forged Striders',
            glove: 'Cinder-Claw Gauntlets',
            weapon: 'Magma Pillar Greatsword',
            shoe: 'Dragon-Scale Boots'
        }
    },
    { 
        id: 3, 
        name: 'Skar’Vath', 
        hp: 100000, 
        cost: 3000, 
        baseStat: 12000, 
        rarity: 'Secret', 
        color: '🌌',
        drops: {
            helmet: 'Crown of Distortion',
            armor: 'Void-Carved Hauberk',
            legging: 'Spacewalker Greaves',
            glove: 'Touch of the Abyss',
            weapon: 'Dimensional Edge',
            shoe: 'Singularity Walkers'
        }
    },
    {
        "id": 4,
        "name": "Gorgos the Destroyer",
        "hp": 750000,
        "cost": 3500,
        "baseStat": 18000,
        "rarity": "Secret",
        "color": "👹",
        "drops": {
            "helmet": "Gorgos's Vision",
            "armor": "Gorgos's Bulwark",
            "legging": "Gorgos's Stride",
            "glove": "Gorgos's Grip",
            "weapon": "Gorgos's Bane",
            "shoe": "Gorgos's Step"
        }
    },
    {
        "id": 5,
        "name": "Valerius the Sun-Eater",
        "hp": 1125000,
        "cost": 4500,
        "baseStat": 25200,
        "rarity": "Secret",
        "color": "☀️",
        "drops": {
            "helmet": "Valerius's Vision",
            "armor": "Valerius's Bulwark",
            "legging": "Valerius's Stride",
            "glove": "Valerius's Grip",
            "weapon": "Valerius's Bane",
            "shoe": "Valerius's Step"
        }
    },
    {
        "id": 6,
        "name": "Xalthar of the Deep",
        "hp": 1687500,
        "cost": 5500,
        "baseStat": 35280,
        "rarity": "Divine",
        "color": "🐙",
        "drops": {
            "helmet": "Xalthar's Vision",
            "armor": "Xalthar's Bulwark",
            "legging": "Xalthar's Stride",
            "glove": "Xalthar's Grip",
            "weapon": "Xalthar's Bane",
            "shoe": "Xalthar's Step"
        }
    },
    {
        "id": 7,
        "name": "Uldor the Frost-Giant",
        "hp": 2531250,
        "cost": 6500,
        "baseStat": 49392,
        "rarity": "Divine",
        "color": "❄️",
        "drops": {
            "helmet": "Uldor's Vision",
            "armor": "Uldor's Bulwark",
            "legging": "Uldor's Stride",
            "glove": "Uldor's Grip",
            "weapon": "Uldor's Bane",
            "shoe": "Uldor's Step"
        }
    },
    {
        "id": 8,
        "name": "Nyxshadow Queen",
        "hp": 3796875,
        "cost": 7500,
        "baseStat": 69148,
        "rarity": "Divine",
        "color": "🕷️",
        "drops": {
            "helmet": "Nyxshadow's Vision",
            "armor": "Nyxshadow's Bulwark",
            "legging": "Nyxshadow's Stride",
            "glove": "Nyxshadow's Grip",
            "weapon": "Nyxshadow's Bane",
            "shoe": "Nyxshadow's Step"
        }
    },
    {
        "id": 9,
        "name": "Thalric the Storm-Lord",
        "hp": 5695310,
        "cost": 8500,
        "baseStat": 96807,
        "rarity": "Celestial",
        "color": "⚡",
        "drops": {
            "helmet": "Thalric's Vision",
            "armor": "Thalric's Bulwark",
            "legging": "Thalric's Stride",
            "glove": "Thalric's Grip",
            "weapon": "Thalric's Bane",
            "shoe": "Thalric's Step"
        }
    },
    {
        "id": 10,
        "name": "Malphas the Gatekeeper",
        "hp": 8542965,
        "cost": 9500,
        "baseStat": 135529,
        "rarity": "Celestial",
        "color": "🏰",
        "drops": {
            "helmet": "Malphas's Vision",
            "armor": "Malphas's Bulwark",
            "legging": "Malphas's Stride",
            "glove": "Malphas's Grip",
            "weapon": "Malphas's Bane",
            "shoe": "Malphas's Step"
        }
    },
    {
        "id": 11,
        "name": "Azazel the Fallen Seraph",
        "hp": 12814445,
        "cost": 10500,
        "baseStat": 189740,
        "rarity": "Celestial",
        "color": "👼",
        "drops": {
            "helmet": "Azazel's Vision",
            "armor": "Azazel's Bulwark",
            "legging": "Azazel's Stride",
            "glove": "Azazel's Grip",
            "weapon": "Azazel's Bane",
            "shoe": "Azazel's Step"
        }
    },
    {
        "id": 12,
        "name": "Belial the Lord of Lies",
        "hp": 19221665,
        "cost": 11500,
        "baseStat": 265636,
        "rarity": "Void",
        "color": "😈",
        "drops": {
            "helmet": "Belial's Vision",
            "armor": "Belial's Bulwark",
            "legging": "Belial's Stride",
            "glove": "Belial's Grip",
            "weapon": "Belial's Bane",
            "shoe": "Belial's Step"
        }
    },
    {
        "id": 13,
        "name": "Chronos the Time-Weaver",
        "hp": 28832495,
        "cost": 12500,
        "baseStat": 371890,
        "rarity": "Void",
        "color": "⏳",
        "drops": {
            "helmet": "Chronos's Vision",
            "armor": "Chronos's Bulwark",
            "legging": "Chronos's Stride",
            "glove": "Chronos's Grip",
            "weapon": "Chronos's Bane",
            "shoe": "Chronos's Step"
        }
    },
    {
        "id": 14,
        "name": "Aetherion the Star-Born",
        "hp": 43248740,
        "cost": 13500,
        "baseStat": 520646,
        "rarity": "Void",
        "color": "✨",
        "drops": {
            "helmet": "Aetherion's Vision",
            "armor": "Aetherion's Bulwark",
            "legging": "Aetherion's Stride",
            "glove": "Aetherion's Grip",
            "weapon": "Aetherion's Bane",
            "shoe": "Aetherion's Step"
        }
    },
    {
        "id": 15,
        "name": "Vespera the Twilight Maiden",
        "hp": 64873110,
        "cost": 14500,
        "baseStat": 728904,
        "rarity": "Cosmic",
        "color": "🌆",
        "drops": {
            "helmet": "Vespera's Vision",
            "armor": "Vespera's Bulwark",
            "legging": "Vespera's Stride",
            "glove": "Vespera's Grip",
            "weapon": "Vespera's Bane",
            "shoe": "Vespera's Step"
        }
    },
    {
        "id": 16,
        "name": "Erebus the Primordial Dark",
        "hp": 97309665,
        "cost": 15500,
        "baseStat": 1020465,
        "rarity": "Cosmic",
        "color": "🌑",
        "drops": {
            "helmet": "Erebus's Vision",
            "armor": "Erebus's Bulwark",
            "legging": "Erebus's Stride",
            "glove": "Erebus's Grip",
            "weapon": "Erebus's Bane",
            "shoe": "Erebus's Step"
        }
    },
    {
        "id": 17,
        "name": "Ouroboros the Eternal Serpent",
        "hp": 145964495,
        "cost": 16500,
        "baseStat": 1428651,
        "rarity": "Cosmic",
        "color": "🐉",
        "drops": {
            "helmet": "Ouroboros's Vision",
            "armor": "Ouroboros's Bulwark",
            "legging": "Ouroboros's Stride",
            "glove": "Ouroboros's Grip",
            "weapon": "Ouroboros's Bane",
            "shoe": "Ouroboros's Step"
        }
    },
    {
        "id": 18,
        "name": "Yggdrasil Guardian",
        "hp": 218946740,
        "cost": 17500,
        "baseStat": 2000111,
        "rarity": "Transcendent",
        "color": "🌳",
        "drops": {
            "helmet": "Yggdrasil's Vision",
            "armor": "Yggdrasil's Bulwark",
            "legging": "Yggdrasil's Stride",
            "glove": "Yggdrasil's Grip",
            "weapon": "Yggdrasil's Bane",
            "shoe": "Yggdrasil's Step"
        }
    },
    {
        "id": 19,
        "name": "Bahamut the Dragon King",
        "hp": 328420110,
        "cost": 18500,
        "baseStat": 2800155,
        "rarity": "Transcendent",
        "color": "🐲",
        "drops": {
            "helmet": "Bahamut's Vision",
            "armor": "Bahamut's Bulwark",
            "legging": "Bahamut's Stride",
            "glove": "Bahamut's Grip",
            "weapon": "Bahamut's Bane",
            "shoe": "Bahamut's Step"
        }
    },
    {
        "id": 20,
        "name": "Tiamat the Mother of Dragons",
        "hp": 492630165,
        "cost": 19500,
        "baseStat": 3920217,
        "rarity": "Transcendent",
        "color": "🌋",
        "drops": {
            "helmet": "Tiamat's Vision",
            "armor": "Tiamat's Bulwark",
            "legging": "Tiamat's Stride",
            "glove": "Tiamat's Grip",
            "weapon": "Tiamat's Bane",
            "shoe": "Tiamat's Step"
        }
    },
    {
        "id": 21,
        "name": "Azathoth the Blind Idiot God",
        "hp": 738945245,
        "cost": 20500,
        "baseStat": 5488303,
        "rarity": "Godly",
        "color": "👁️",
        "drops": {
            "helmet": "Azathoth's Vision",
            "armor": "Azathoth's Bulwark",
            "legging": "Azathoth's Stride",
            "glove": "Azathoth's Grip",
            "weapon": "Azathoth's Bane",
            "shoe": "Azathoth's Step"
        }
    },
    {
        "id": 22,
        "name": "Yog-Sothoth the Key and the Gate",
        "hp": 1108417865,
        "cost": 21500,
        "baseStat": 7683612,
        "rarity": "Godly",
        "color": "🌌",
        "drops": {
            "helmet": "YogSothoth's Vision",
            "armor": "YogSothoth's Bulwark",
            "legging": "YogSothoth's Stride",
            "glove": "YogSothoth's Grip",
            "weapon": "YogSothoth's Bane",
            "shoe": "YogSothoth's Step"
        }
    },
    {
        "id": 23,
        "name": "Cthulhu the Great Old One",
        "hp": 1662626795,
        "cost": 22500,
        "baseStat": 10757056,
        "rarity": "Godly",
        "color": "🐙",
        "drops": {
            "helmet": "Cthulhu's Vision",
            "armor": "Cthulhu's Bulwark",
            "legging": "Cthulhu's Stride",
            "glove": "Cthulhu's Grip",
            "weapon": "Cthulhu's Bane",
            "shoe": "Cthulhu's Step"
        }
    },
    {
            "id": 24,
            "name": "Baldur the Destroyer",
            "hp": 2244546173,
            "cost": 27500,
            "baseStat": 13446320,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Baldur's Visage",
                    "armor": "Baldur's Plate",
                    "legging": "Baldur's Greaves",
                    "glove": "Baldur's Gauntlets",
                    "weapon": "Baldur's Artifact",
                    "shoe": "Baldur's Boots"
            }
    },
    {
            "id": 25,
            "name": "Frigg the Destroyer",
            "hp": 3030137333,
            "cost": 32500,
            "baseStat": 16807900,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Frigg's Visage",
                    "armor": "Frigg's Plate",
                    "legging": "Frigg's Greaves",
                    "glove": "Frigg's Gauntlets",
                    "weapon": "Frigg's Artifact",
                    "shoe": "Frigg's Boots"
            }
    },
    {
            "id": 26,
            "name": "Hel the Destroyer",
            "hp": 4090685399,
            "cost": 37500,
            "baseStat": 21009875,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Hel's Visage",
                    "armor": "Hel's Plate",
                    "legging": "Hel's Greaves",
                    "glove": "Hel's Gauntlets",
                    "weapon": "Hel's Artifact",
                    "shoe": "Hel's Boots"
            }
    },
    {
            "id": 27,
            "name": "Zeus the Destroyer",
            "hp": 5522425288,
            "cost": 42500,
            "baseStat": 26262343,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Zeus's Visage",
                    "armor": "Zeus's Plate",
                    "legging": "Zeus's Greaves",
                    "glove": "Zeus's Gauntlets",
                    "weapon": "Zeus's Artifact",
                    "shoe": "Zeus's Boots"
            }
    },
    {
            "id": 28,
            "name": "Hera the Destroyer",
            "hp": 7455274138,
            "cost": 47500,
            "baseStat": 32827928,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Hera's Visage",
                    "armor": "Hera's Plate",
                    "legging": "Hera's Greaves",
                    "glove": "Hera's Gauntlets",
                    "weapon": "Hera's Artifact",
                    "shoe": "Hera's Boots"
            }
    },
    {
            "id": 29,
            "name": "Poseidon the Destroyer",
            "hp": 10064620086,
            "cost": 52500,
            "baseStat": 41034910,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Poseidon's Visage",
                    "armor": "Poseidon's Plate",
                    "legging": "Poseidon's Greaves",
                    "glove": "Poseidon's Gauntlets",
                    "weapon": "Poseidon's Artifact",
                    "shoe": "Poseidon's Boots"
            }
    },
    {
            "id": 30,
            "name": "Demeter the Destroyer",
            "hp": 13587237116,
            "cost": 57500,
            "baseStat": 51293637,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Demeter's Visage",
                    "armor": "Demeter's Plate",
                    "legging": "Demeter's Greaves",
                    "glove": "Demeter's Gauntlets",
                    "weapon": "Demeter's Artifact",
                    "shoe": "Demeter's Boots"
            }
    },
    {
            "id": 31,
            "name": "Athena the Destroyer",
            "hp": 18342770106,
            "cost": 62500,
            "baseStat": 64117046,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Athena's Visage",
                    "armor": "Athena's Plate",
                    "legging": "Athena's Greaves",
                    "glove": "Athena's Gauntlets",
                    "weapon": "Athena's Artifact",
                    "shoe": "Athena's Boots"
            }
    },
    {
            "id": 32,
            "name": "Apollo the Destroyer",
            "hp": 24762739643,
            "cost": 67500,
            "baseStat": 80146307,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Apollo's Visage",
                    "armor": "Apollo's Plate",
                    "legging": "Apollo's Greaves",
                    "glove": "Apollo's Gauntlets",
                    "weapon": "Apollo's Artifact",
                    "shoe": "Apollo's Boots"
            }
    },
    {
            "id": 33,
            "name": "Artemis the Destroyer",
            "hp": 33429698518,
            "cost": 72500,
            "baseStat": 100182883,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Artemis's Visage",
                    "armor": "Artemis's Plate",
                    "legging": "Artemis's Greaves",
                    "glove": "Artemis's Gauntlets",
                    "weapon": "Artemis's Artifact",
                    "shoe": "Artemis's Boots"
            }
    },
    {
            "id": 34,
            "name": "Ares the Destroyer",
            "hp": 45130092999,
            "cost": 77500,
            "baseStat": 125228603,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Ares's Visage",
                    "armor": "Ares's Plate",
                    "legging": "Ares's Greaves",
                    "glove": "Ares's Gauntlets",
                    "weapon": "Ares's Artifact",
                    "shoe": "Ares's Boots"
            }
    },
    {
            "id": 35,
            "name": "Aphrodite the Destroyer",
            "hp": 60925625548,
            "cost": 82500,
            "baseStat": 156535753,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Aphrodite's Visage",
                    "armor": "Aphrodite's Plate",
                    "legging": "Aphrodite's Greaves",
                    "glove": "Aphrodite's Gauntlets",
                    "weapon": "Aphrodite's Artifact",
                    "shoe": "Aphrodite's Boots"
            }
    },
    {
            "id": 36,
            "name": "Hephaestus the Destroyer",
            "hp": 82249594489,
            "cost": 87500,
            "baseStat": 195669691,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Hephaestus's Visage",
                    "armor": "Hephaestus's Plate",
                    "legging": "Hephaestus's Greaves",
                    "glove": "Hephaestus's Gauntlets",
                    "weapon": "Hephaestus's Artifact",
                    "shoe": "Hephaestus's Boots"
            }
    },
    {
            "id": 37,
            "name": "Hermes the Destroyer",
            "hp": 111036952560,
            "cost": 92500,
            "baseStat": 244587113,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Hermes's Visage",
                    "armor": "Hermes's Plate",
                    "legging": "Hermes's Greaves",
                    "glove": "Hermes's Gauntlets",
                    "weapon": "Hermes's Artifact",
                    "shoe": "Hermes's Boots"
            }
    },
    {
            "id": 38,
            "name": "Dionysus the Destroyer",
            "hp": 149899885956,
            "cost": 97500,
            "baseStat": 305733891,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Dionysus's Visage",
                    "armor": "Dionysus's Plate",
                    "legging": "Dionysus's Greaves",
                    "glove": "Dionysus's Gauntlets",
                    "weapon": "Dionysus's Artifact",
                    "shoe": "Dionysus's Boots"
            }
    },
    {
            "id": 39,
            "name": "Izanagi the Destroyer",
            "hp": 202364846040,
            "cost": 102500,
            "baseStat": 382167363,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Izanagi's Visage",
                    "armor": "Izanagi's Plate",
                    "legging": "Izanagi's Greaves",
                    "glove": "Izanagi's Gauntlets",
                    "weapon": "Izanagi's Artifact",
                    "shoe": "Izanagi's Boots"
            }
    },
    {
            "id": 40,
            "name": "Izanami the Destroyer",
            "hp": 273192542154,
            "cost": 107500,
            "baseStat": 477709203,
            "rarity": "Godly",
            "color": "🌌",
            "drops": {
                    "helmet": "Izanami's Visage",
                    "armor": "Izanami's Plate",
                    "legging": "Izanami's Greaves",
                    "glove": "Izanami's Gauntlets",
                    "weapon": "Izanami's Artifact",
                    "shoe": "Izanami's Boots"
            }
    },
    {
            "id": 41,
            "name": "Amaterasu the Destroyer",
            "hp": 368809931907,
            "cost": 112500,
            "baseStat": 597136503,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Amaterasu's Visage",
                    "armor": "Amaterasu's Plate",
                    "legging": "Amaterasu's Greaves",
                    "glove": "Amaterasu's Gauntlets",
                    "weapon": "Amaterasu's Artifact",
                    "shoe": "Amaterasu's Boots"
            }
    },
    {
            "id": 42,
            "name": "Susanoo the Destroyer",
            "hp": 497893408074,
            "cost": 117500,
            "baseStat": 746420628,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Susanoo's Visage",
                    "armor": "Susanoo's Plate",
                    "legging": "Susanoo's Greaves",
                    "glove": "Susanoo's Gauntlets",
                    "weapon": "Susanoo's Artifact",
                    "shoe": "Susanoo's Boots"
            }
    },
    {
            "id": 43,
            "name": "Tsukuyomi the Destroyer",
            "hp": 672156100899,
            "cost": 122500,
            "baseStat": 933025785,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Tsukuyomi's Visage",
                    "armor": "Tsukuyomi's Plate",
                    "legging": "Tsukuyomi's Greaves",
                    "glove": "Tsukuyomi's Gauntlets",
                    "weapon": "Tsukuyomi's Artifact",
                    "shoe": "Tsukuyomi's Boots"
            }
    },
    {
            "id": 44,
            "name": "Inari the Destroyer",
            "hp": 907410736213,
            "cost": 127500,
            "baseStat": 1166282231,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Inari's Visage",
                    "armor": "Inari's Plate",
                    "legging": "Inari's Greaves",
                    "glove": "Inari's Gauntlets",
                    "weapon": "Inari's Artifact",
                    "shoe": "Inari's Boots"
            }
    },
    {
            "id": 45,
            "name": "Raijin the Destroyer",
            "hp": 1225004493887,
            "cost": 132500,
            "baseStat": 1457852788,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Raijin's Visage",
                    "armor": "Raijin's Plate",
                    "legging": "Raijin's Greaves",
                    "glove": "Raijin's Gauntlets",
                    "weapon": "Raijin's Artifact",
                    "shoe": "Raijin's Boots"
            }
    },
    {
            "id": 46,
            "name": "Fujin the Destroyer",
            "hp": 1653756066747,
            "cost": 137500,
            "baseStat": 1822315985,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Fujin's Visage",
                    "armor": "Fujin's Plate",
                    "legging": "Fujin's Greaves",
                    "glove": "Fujin's Gauntlets",
                    "weapon": "Fujin's Artifact",
                    "shoe": "Fujin's Boots"
            }
    },
    {
            "id": 47,
            "name": "Brahma the Destroyer",
            "hp": 2232570690108,
            "cost": 142500,
            "baseStat": 2277894981,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Brahma's Visage",
                    "armor": "Brahma's Plate",
                    "legging": "Brahma's Greaves",
                    "glove": "Brahma's Gauntlets",
                    "weapon": "Brahma's Artifact",
                    "shoe": "Brahma's Boots"
            }
    },
    {
            "id": 48,
            "name": "Vishnu the Destroyer",
            "hp": 3013970431645,
            "cost": 147500,
            "baseStat": 2847368726,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Vishnu's Visage",
                    "armor": "Vishnu's Plate",
                    "legging": "Vishnu's Greaves",
                    "glove": "Vishnu's Gauntlets",
                    "weapon": "Vishnu's Artifact",
                    "shoe": "Vishnu's Boots"
            }
    },
    {
            "id": 49,
            "name": "Shiva the Destroyer",
            "hp": 4068860082720,
            "cost": 152500,
            "baseStat": 3559210907,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Shiva's Visage",
                    "armor": "Shiva's Plate",
                    "legging": "Shiva's Greaves",
                    "glove": "Shiva's Gauntlets",
                    "weapon": "Shiva's Artifact",
                    "shoe": "Shiva's Boots"
            }
    },
    {
            "id": 50,
            "name": "Indra the Destroyer",
            "hp": 5492961111672,
            "cost": 157500,
            "baseStat": 4449013633,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Indra's Visage",
                    "armor": "Indra's Plate",
                    "legging": "Indra's Greaves",
                    "glove": "Indra's Gauntlets",
                    "weapon": "Indra's Artifact",
                    "shoe": "Indra's Boots"
            }
    },
    {
            "id": 51,
            "name": "Agni the Destroyer",
            "hp": 7415497500757,
            "cost": 162500,
            "baseStat": 5561267041,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Agni's Visage",
                    "armor": "Agni's Plate",
                    "legging": "Agni's Greaves",
                    "glove": "Agni's Gauntlets",
                    "weapon": "Agni's Artifact",
                    "shoe": "Agni's Boots"
            }
    },
    {
            "id": 52,
            "name": "Varuna the Destroyer",
            "hp": 10010921626021,
            "cost": 167500,
            "baseStat": 6951583801,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Varuna's Visage",
                    "armor": "Varuna's Plate",
                    "legging": "Varuna's Greaves",
                    "glove": "Varuna's Gauntlets",
                    "weapon": "Varuna's Artifact",
                    "shoe": "Varuna's Boots"
            }
    },
    {
            "id": 53,
            "name": "Yama the Destroyer",
            "hp": 13514744195128,
            "cost": 172500,
            "baseStat": 8689479751,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Yama's Visage",
                    "armor": "Yama's Plate",
                    "legging": "Yama's Greaves",
                    "glove": "Yama's Gauntlets",
                    "weapon": "Yama's Artifact",
                    "shoe": "Yama's Boots"
            }
    },
    {
            "id": 54,
            "name": "Kali the Destroyer",
            "hp": 18244904663422,
            "cost": 177500,
            "baseStat": 10861849688,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Kali's Visage",
                    "armor": "Kali's Plate",
                    "legging": "Kali's Greaves",
                    "glove": "Kali's Gauntlets",
                    "weapon": "Kali's Artifact",
                    "shoe": "Kali's Boots"
            }
    },
    {
            "id": 55,
            "name": "Durga the Destroyer",
            "hp": 24630621295619,
            "cost": 182500,
            "baseStat": 13577312110,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Durga's Visage",
                    "armor": "Durga's Plate",
                    "legging": "Durga's Greaves",
                    "glove": "Durga's Gauntlets",
                    "weapon": "Durga's Artifact",
                    "shoe": "Durga's Boots"
            }
    },
    {
            "id": 56,
            "name": "Gilgamesh the Destroyer",
            "hp": 33251338749085,
            "cost": 187500,
            "baseStat": 16971640137,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Gilgamesh's Visage",
                    "armor": "Gilgamesh's Plate",
                    "legging": "Gilgamesh's Greaves",
                    "glove": "Gilgamesh's Gauntlets",
                    "weapon": "Gilgamesh's Artifact",
                    "shoe": "Gilgamesh's Boots"
            }
    },
    {
            "id": 57,
            "name": "Enkidu the Destroyer",
            "hp": 44889307311264,
            "cost": 192500,
            "baseStat": 21214550171,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Enkidu's Visage",
                    "armor": "Enkidu's Plate",
                    "legging": "Enkidu's Greaves",
                    "glove": "Enkidu's Gauntlets",
                    "weapon": "Enkidu's Artifact",
                    "shoe": "Enkidu's Boots"
            }
    },
    {
            "id": 58,
            "name": "Ishtar the Destroyer",
            "hp": 60600564870206,
            "cost": 197500,
            "baseStat": 26518187713,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Ishtar's Visage",
                    "armor": "Ishtar's Plate",
                    "legging": "Ishtar's Greaves",
                    "glove": "Ishtar's Gauntlets",
                    "weapon": "Ishtar's Artifact",
                    "shoe": "Ishtar's Boots"
            }
    },
    {
            "id": 59,
            "name": "Marduk the Destroyer",
            "hp": 81810762574778,
            "cost": 202500,
            "baseStat": 33147734641,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Marduk's Visage",
                    "armor": "Marduk's Plate",
                    "legging": "Marduk's Greaves",
                    "glove": "Marduk's Gauntlets",
                    "weapon": "Marduk's Artifact",
                    "shoe": "Marduk's Boots"
            }
    },
    {
            "id": 60,
            "name": "Tiamat the Destroyer",
            "hp": 110444529475950,
            "cost": 207500,
            "baseStat": 41434668301,
            "rarity": "Mythic",
            "color": "🌌",
            "drops": {
                    "helmet": "Tiamat's Visage",
                    "armor": "Tiamat's Plate",
                    "legging": "Tiamat's Greaves",
                    "glove": "Tiamat's Gauntlets",
                    "weapon": "Tiamat's Artifact",
                    "shoe": "Tiamat's Boots"
            }
    },
    {
            "id": 61,
            "name": "Enlil the Destroyer",
            "hp": 149100114792532,
            "cost": 212500,
            "baseStat": 51793335376,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Enlil's Visage",
                    "armor": "Enlil's Plate",
                    "legging": "Enlil's Greaves",
                    "glove": "Enlil's Gauntlets",
                    "weapon": "Enlil's Artifact",
                    "shoe": "Enlil's Boots"
            }
    },
    {
            "id": 62,
            "name": "Anu the Destroyer",
            "hp": 201285154969918,
            "cost": 217500,
            "baseStat": 64741669220,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Anu's Visage",
                    "armor": "Anu's Plate",
                    "legging": "Anu's Greaves",
                    "glove": "Anu's Gauntlets",
                    "weapon": "Anu's Artifact",
                    "shoe": "Anu's Boots"
            }
    },
    {
            "id": 63,
            "name": "Quetzalcoatl the Destroyer",
            "hp": 271734959209389,
            "cost": 222500,
            "baseStat": 80927086525,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Quetzalcoatl's Visage",
                    "armor": "Quetzalcoatl's Plate",
                    "legging": "Quetzalcoatl's Greaves",
                    "glove": "Quetzalcoatl's Gauntlets",
                    "weapon": "Quetzalcoatl's Artifact",
                    "shoe": "Quetzalcoatl's Boots"
            }
    },
    {
            "id": 64,
            "name": "Huitzilopochtli the Destroyer",
            "hp": 366842194932675,
            "cost": 227500,
            "baseStat": 101158858156,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Huitzilopochtli's Visage",
                    "armor": "Huitzilopochtli's Plate",
                    "legging": "Huitzilopochtli's Greaves",
                    "glove": "Huitzilopochtli's Gauntlets",
                    "weapon": "Huitzilopochtli's Artifact",
                    "shoe": "Huitzilopochtli's Boots"
            }
    },
    {
            "id": 65,
            "name": "Tezcatlipoca the Destroyer",
            "hp": 495236963159111,
            "cost": 232500,
            "baseStat": 126448572695,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Tezcatlipoca's Visage",
                    "armor": "Tezcatlipoca's Plate",
                    "legging": "Tezcatlipoca's Greaves",
                    "glove": "Tezcatlipoca's Gauntlets",
                    "weapon": "Tezcatlipoca's Artifact",
                    "shoe": "Tezcatlipoca's Boots"
            }
    },
    {
            "id": 66,
            "name": "Tlaloc the Destroyer",
            "hp": 668569900264799,
            "cost": 237500,
            "baseStat": 158060715868,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Tlaloc's Visage",
                    "armor": "Tlaloc's Plate",
                    "legging": "Tlaloc's Greaves",
                    "glove": "Tlaloc's Gauntlets",
                    "weapon": "Tlaloc's Artifact",
                    "shoe": "Tlaloc's Boots"
            }
    },
    {
            "id": 67,
            "name": "Xipe Totec the Destroyer",
            "hp": 902569365357478,
            "cost": 242500,
            "baseStat": 197575894835,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Xipe's Visage",
                    "armor": "Xipe's Plate",
                    "legging": "Xipe's Greaves",
                    "glove": "Xipe's Gauntlets",
                    "weapon": "Xipe's Artifact",
                    "shoe": "Xipe's Boots"
            }
    },
    {
            "id": 68,
            "name": "Viracocha the Destroyer",
            "hp": 1218468643232595,
            "cost": 247500,
            "baseStat": 246969868543,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Viracocha's Visage",
                    "armor": "Viracocha's Plate",
                    "legging": "Viracocha's Greaves",
                    "glove": "Viracocha's Gauntlets",
                    "weapon": "Viracocha's Artifact",
                    "shoe": "Viracocha's Boots"
            }
    },
    {
            "id": 69,
            "name": "Inti the Destroyer",
            "hp": 1644932668364003,
            "cost": 252500,
            "baseStat": 308712335678,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Inti's Visage",
                    "armor": "Inti's Plate",
                    "legging": "Inti's Greaves",
                    "glove": "Inti's Gauntlets",
                    "weapon": "Inti's Artifact",
                    "shoe": "Inti's Boots"
            }
    },
    {
            "id": 70,
            "name": "Mama Quilla the Destroyer",
            "hp": 2220659102291404,
            "cost": 257500,
            "baseStat": 385890419597,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Mama's Visage",
                    "armor": "Mama's Plate",
                    "legging": "Mama's Greaves",
                    "glove": "Mama's Gauntlets",
                    "weapon": "Mama's Artifact",
                    "shoe": "Mama's Boots"
            }
    },
    {
            "id": 71,
            "name": "Pachamama the Destroyer",
            "hp": 2997889788093395,
            "cost": 262500,
            "baseStat": 482363024496,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Pachamama's Visage",
                    "armor": "Pachamama's Plate",
                    "legging": "Pachamama's Greaves",
                    "glove": "Pachamama's Gauntlets",
                    "weapon": "Pachamama's Artifact",
                    "shoe": "Pachamama's Boots"
            }
    },
    {
            "id": 72,
            "name": "Azathoth the Destroyer",
            "hp": 4047151213926083,
            "cost": 267500,
            "baseStat": 602953780620,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Azathoth's Visage",
                    "armor": "Azathoth's Plate",
                    "legging": "Azathoth's Greaves",
                    "glove": "Azathoth's Gauntlets",
                    "weapon": "Azathoth's Artifact",
                    "shoe": "Azathoth's Boots"
            }
    },
    {
            "id": 73,
            "name": "Yog-Sothoth the Destroyer",
            "hp": 5463654138800212,
            "cost": 272500,
            "baseStat": 753692225775,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Yog-Sothoth's Visage",
                    "armor": "Yog-Sothoth's Plate",
                    "legging": "Yog-Sothoth's Greaves",
                    "glove": "Yog-Sothoth's Gauntlets",
                    "weapon": "Yog-Sothoth's Artifact",
                    "shoe": "Yog-Sothoth's Boots"
            }
    },
    {
            "id": 74,
            "name": "Nyarlathotep the Destroyer",
            "hp": 7375933087380287,
            "cost": 277500,
            "baseStat": 942115282218,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Nyarlathotep's Visage",
                    "armor": "Nyarlathotep's Plate",
                    "legging": "Nyarlathotep's Greaves",
                    "glove": "Nyarlathotep's Gauntlets",
                    "weapon": "Nyarlathotep's Artifact",
                    "shoe": "Nyarlathotep's Boots"
            }
    },
    {
            "id": 75,
            "name": "Shub-Niggurath the Destroyer",
            "hp": 9957509667963388,
            "cost": 282500,
            "baseStat": 1177644102772,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Shub-Niggurath's Visage",
                    "armor": "Shub-Niggurath's Plate",
                    "legging": "Shub-Niggurath's Greaves",
                    "glove": "Shub-Niggurath's Gauntlets",
                    "weapon": "Shub-Niggurath's Artifact",
                    "shoe": "Shub-Niggurath's Boots"
            }
    },
    {
            "id": 76,
            "name": "Cthulhu the Destroyer",
            "hp": 13442638051750574,
            "cost": 287500,
            "baseStat": 1472055128465,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Cthulhu's Visage",
                    "armor": "Cthulhu's Plate",
                    "legging": "Cthulhu's Greaves",
                    "glove": "Cthulhu's Gauntlets",
                    "weapon": "Cthulhu's Artifact",
                    "shoe": "Cthulhu's Boots"
            }
    },
    {
            "id": 77,
            "name": "Hastur the Destroyer",
            "hp": 18147561369863276,
            "cost": 292500,
            "baseStat": 1840068910581,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Hastur's Visage",
                    "armor": "Hastur's Plate",
                    "legging": "Hastur's Greaves",
                    "glove": "Hastur's Gauntlets",
                    "weapon": "Hastur's Artifact",
                    "shoe": "Hastur's Boots"
            }
    },
    {
            "id": 78,
            "name": "Yig the Destroyer",
            "hp": 24499207849315424,
            "cost": 297500,
            "baseStat": 2300086138226,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Yig's Visage",
                    "armor": "Yig's Plate",
                    "legging": "Yig's Greaves",
                    "glove": "Yig's Gauntlets",
                    "weapon": "Yig's Artifact",
                    "shoe": "Yig's Boots"
            }
    },
    {
            "id": 79,
            "name": "Bahamut the Destroyer",
            "hp": 33073930596575824,
            "cost": 302500,
            "baseStat": 2875107672782,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Bahamut's Visage",
                    "armor": "Bahamut's Plate",
                    "legging": "Bahamut's Greaves",
                    "glove": "Bahamut's Gauntlets",
                    "weapon": "Bahamut's Artifact",
                    "shoe": "Bahamut's Boots"
            }
    },
    {
            "id": 80,
            "name": "Tiamat the Destroyer",
            "hp": 44649806305377370,
            "cost": 307500,
            "baseStat": 3593884590977,
            "rarity": "Ancient",
            "color": "🌌",
            "drops": {
                    "helmet": "Tiamat's Visage",
                    "armor": "Tiamat's Plate",
                    "legging": "Tiamat's Greaves",
                    "glove": "Tiamat's Gauntlets",
                    "weapon": "Tiamat's Artifact",
                    "shoe": "Tiamat's Boots"
            }
    },
    {
            "id": 81,
            "name": "Leviathan the Destroyer",
            "hp": 60277238512259450,
            "cost": 312500,
            "baseStat": 4492355738721,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Leviathan's Visage",
                    "armor": "Leviathan's Plate",
                    "legging": "Leviathan's Greaves",
                    "glove": "Leviathan's Gauntlets",
                    "weapon": "Leviathan's Artifact",
                    "shoe": "Leviathan's Boots"
            }
    },
    {
            "id": 82,
            "name": "Behemoth the Destroyer",
            "hp": 81374271991550260,
            "cost": 317500,
            "baseStat": 5615444673401,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Behemoth's Visage",
                    "armor": "Behemoth's Plate",
                    "legging": "Behemoth's Greaves",
                    "glove": "Behemoth's Gauntlets",
                    "weapon": "Behemoth's Artifact",
                    "shoe": "Behemoth's Boots"
            }
    },
    {
            "id": 83,
            "name": "Ziz the Destroyer",
            "hp": 109855267188592850,
            "cost": 322500,
            "baseStat": 7019305841751,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Ziz's Visage",
                    "armor": "Ziz's Plate",
                    "legging": "Ziz's Greaves",
                    "glove": "Ziz's Gauntlets",
                    "weapon": "Ziz's Artifact",
                    "shoe": "Ziz's Boots"
            }
    },
    {
            "id": 84,
            "name": "Simurgh the Destroyer",
            "hp": 148304610704600350,
            "cost": 327500,
            "baseStat": 8774132302188,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Simurgh's Visage",
                    "armor": "Simurgh's Plate",
                    "legging": "Simurgh's Greaves",
                    "glove": "Simurgh's Gauntlets",
                    "weapon": "Simurgh's Artifact",
                    "shoe": "Simurgh's Boots"
            }
    },
    {
            "id": 85,
            "name": "Phoenix the Destroyer",
            "hp": 200211224451210500,
            "cost": 332500,
            "baseStat": 10967665377735,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Phoenix's Visage",
                    "armor": "Phoenix's Plate",
                    "legging": "Phoenix's Greaves",
                    "glove": "Phoenix's Gauntlets",
                    "weapon": "Phoenix's Artifact",
                    "shoe": "Phoenix's Boots"
            }
    },
    {
            "id": 86,
            "name": "Ragnarok the Destroyer",
            "hp": 270285153009134180,
            "cost": 337500,
            "baseStat": 13709581722168,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Ragnarok's Visage",
                    "armor": "Ragnarok's Plate",
                    "legging": "Ragnarok's Greaves",
                    "glove": "Ragnarok's Gauntlets",
                    "weapon": "Ragnarok's Artifact",
                    "shoe": "Ragnarok's Boots"
            }
    },
    {
            "id": 87,
            "name": "Apocalypse the Destroyer",
            "hp": 364884956562331140,
            "cost": 342500,
            "baseStat": 17136977152710,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Apocalypse's Visage",
                    "armor": "Apocalypse's Plate",
                    "legging": "Apocalypse's Greaves",
                    "glove": "Apocalypse's Gauntlets",
                    "weapon": "Apocalypse's Artifact",
                    "shoe": "Apocalypse's Boots"
            }
    },
    {
            "id": 88,
            "name": "Armageddon the Destroyer",
            "hp": 492594691359147100,
            "cost": 347500,
            "baseStat": 21421221440887,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Armageddon's Visage",
                    "armor": "Armageddon's Plate",
                    "legging": "Armageddon's Greaves",
                    "glove": "Armageddon's Gauntlets",
                    "weapon": "Armageddon's Artifact",
                    "shoe": "Armageddon's Boots"
            }
    },
    {
            "id": 89,
            "name": "Oblivion the Destroyer",
            "hp": 665002833334848600,
            "cost": 352500,
            "baseStat": 26776526801108,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Oblivion's Visage",
                    "armor": "Oblivion's Plate",
                    "legging": "Oblivion's Greaves",
                    "glove": "Oblivion's Gauntlets",
                    "weapon": "Oblivion's Artifact",
                    "shoe": "Oblivion's Boots"
            }
    },
    {
            "id": 90,
            "name": "Eternity the Destroyer",
            "hp": 897753825002045700,
            "cost": 357500,
            "baseStat": 33470658501385,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Eternity's Visage",
                    "armor": "Eternity's Plate",
                    "legging": "Eternity's Greaves",
                    "glove": "Eternity's Gauntlets",
                    "weapon": "Eternity's Artifact",
                    "shoe": "Eternity's Boots"
            }
    },
    {
            "id": 91,
            "name": "Infinity the Destroyer",
            "hp": 1211967663752761900,
            "cost": 362500,
            "baseStat": 41838323126731,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Infinity's Visage",
                    "armor": "Infinity's Plate",
                    "legging": "Infinity's Greaves",
                    "glove": "Infinity's Gauntlets",
                    "weapon": "Infinity's Artifact",
                    "shoe": "Infinity's Boots"
            }
    },
    {
            "id": 92,
            "name": "Void the Destroyer",
            "hp": 1636156346066228700,
            "cost": 367500,
            "baseStat": 52297903908413,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Void's Visage",
                    "armor": "Void's Plate",
                    "legging": "Void's Greaves",
                    "glove": "Void's Gauntlets",
                    "weapon": "Void's Artifact",
                    "shoe": "Void's Boots"
            }
    },
    {
            "id": 93,
            "name": "Singularity the Destroyer",
            "hp": 2208811067189409000,
            "cost": 372500,
            "baseStat": 65372379885516,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Singularity's Visage",
                    "armor": "Singularity's Plate",
                    "legging": "Singularity's Greaves",
                    "glove": "Singularity's Gauntlets",
                    "weapon": "Singularity's Artifact",
                    "shoe": "Singularity's Boots"
            }
    },
    {
            "id": 94,
            "name": "Nexus the Destroyer",
            "hp": 2981894940705702400,
            "cost": 377500,
            "baseStat": 81715474856895,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Nexus's Visage",
                    "armor": "Nexus's Plate",
                    "legging": "Nexus's Greaves",
                    "glove": "Nexus's Gauntlets",
                    "weapon": "Nexus's Artifact",
                    "shoe": "Nexus's Boots"
            }
    },
    {
            "id": 95,
            "name": "Zenith the Destroyer",
            "hp": 4025558169952698400,
            "cost": 382500,
            "baseStat": 102144343571118,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Zenith's Visage",
                    "armor": "Zenith's Plate",
                    "legging": "Zenith's Greaves",
                    "glove": "Zenith's Gauntlets",
                    "weapon": "Zenith's Artifact",
                    "shoe": "Zenith's Boots"
            }
    },
    {
            "id": 96,
            "name": "Nadira the Destroyer",
            "hp": 5434503529436144000,
            "cost": 387500,
            "baseStat": 127680429463897,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Nadira's Visage",
                    "armor": "Nadira's Plate",
                    "legging": "Nadira's Greaves",
                    "glove": "Nadira's Gauntlets",
                    "weapon": "Nadira's Artifact",
                    "shoe": "Nadira's Boots"
            }
    },
    {
            "id": 97,
            "name": "Apex the Destroyer",
            "hp": 7336579764738794000,
            "cost": 392500,
            "baseStat": 159600536829871,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Apex's Visage",
                    "armor": "Apex's Plate",
                    "legging": "Apex's Greaves",
                    "glove": "Apex's Gauntlets",
                    "weapon": "Apex's Artifact",
                    "shoe": "Apex's Boots"
            }
    },
    {
            "id": 98,
            "name": "Omnipotence the Destroyer",
            "hp": 9904382682397372000,
            "cost": 397500,
            "baseStat": 199500671037338,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Omnipotence's Visage",
                    "armor": "Omnipotence's Plate",
                    "legging": "Omnipotence's Greaves",
                    "glove": "Omnipotence's Gauntlets",
                    "weapon": "Omnipotence's Artifact",
                    "shoe": "Omnipotence's Boots"
            }
    },
    {
            "id": 99,
            "name": "Aether the Eternal",
            "hp": 13370916621236453000,
            "cost": 402500,
            "baseStat": 249375838796672,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Aether's Visage",
                    "armor": "Aether's Plate",
                    "legging": "Aether's Greaves",
                    "glove": "Aether's Gauntlets",
                    "weapon": "Aether's Artifact",
                    "shoe": "Aether's Boots"
            }
    },
    {
            "id": 100,
            "name": "Chaos the Eternal",
            "hp": 18050737438669214000,
            "cost": 407500,
            "baseStat": 311719798495840,
            "rarity": "Primordial",
            "color": "🌌",
            "drops": {
                    "helmet": "Chaos's Visage",
                    "armor": "Chaos's Plate",
                    "legging": "Chaos's Greaves",
                    "glove": "Chaos's Gauntlets",
                    "weapon": "Chaos's Artifact",
                    "shoe": "Chaos's Boots"
            }
    },
    {
            "id": 101,
            "name": "Chronos the Eternal",
            "hp": 24368495542203440000,
            "cost": 412500,
            "baseStat": 389649748119800,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Chronos's Visage",
                    "armor": "Chronos's Plate",
                    "legging": "Chronos's Greaves",
                    "glove": "Chronos's Gauntlets",
                    "weapon": "Chronos's Artifact",
                    "shoe": "Chronos's Boots"
            }
    },
    {
            "id": 102,
            "name": "Erebus the Eternal",
            "hp": 32897468981974647000,
            "cost": 417500,
            "baseStat": 487062185149750,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Erebus's Visage",
                    "armor": "Erebus's Plate",
                    "legging": "Erebus's Greaves",
                    "glove": "Erebus's Gauntlets",
                    "weapon": "Erebus's Artifact",
                    "shoe": "Erebus's Boots"
            }
    },
    {
            "id": 103,
            "name": "Gaia the Eternal",
            "hp": 44411583125665776000,
            "cost": 422500,
            "baseStat": 608827731437187,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Gaia's Visage",
                    "armor": "Gaia's Plate",
                    "legging": "Gaia's Greaves",
                    "glove": "Gaia's Gauntlets",
                    "weapon": "Gaia's Artifact",
                    "shoe": "Gaia's Boots"
            }
    },
    {
            "id": 104,
            "name": "Hemera the Eternal",
            "hp": 59955637219648800000,
            "cost": 427500,
            "baseStat": 761034664296483,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Hemera's Visage",
                    "armor": "Hemera's Plate",
                    "legging": "Hemera's Greaves",
                    "glove": "Hemera's Gauntlets",
                    "weapon": "Hemera's Artifact",
                    "shoe": "Hemera's Boots"
            }
    },
    {
            "id": 105,
            "name": "Nyx the Eternal",
            "hp": 80940110246525880000,
            "cost": 432500,
            "baseStat": 951293330370603,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Nyx's Visage",
                    "armor": "Nyx's Plate",
                    "legging": "Nyx's Greaves",
                    "glove": "Nyx's Gauntlets",
                    "weapon": "Nyx's Artifact",
                    "shoe": "Nyx's Boots"
            }
    },
    {
            "id": 106,
            "name": "Tartarus the Eternal",
            "hp": 109269148832809940000,
            "cost": 437500,
            "baseStat": 1189116662963253,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Tartarus's Visage",
                    "armor": "Tartarus's Plate",
                    "legging": "Tartarus's Greaves",
                    "glove": "Tartarus's Gauntlets",
                    "weapon": "Tartarus's Artifact",
                    "shoe": "Tartarus's Boots"
            }
    },
    {
            "id": 107,
            "name": "Uranus the Eternal",
            "hp": 147513350924293440000,
            "cost": 442500,
            "baseStat": 1486395828704066,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Uranus's Visage",
                    "armor": "Uranus's Plate",
                    "legging": "Uranus's Greaves",
                    "glove": "Uranus's Gauntlets",
                    "weapon": "Uranus's Artifact",
                    "shoe": "Uranus's Boots"
            }
    },
    {
            "id": 108,
            "name": "Amun the Eternal",
            "hp": 199143023747796140000,
            "cost": 447500,
            "baseStat": 1857994785880082,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Amun's Visage",
                    "armor": "Amun's Plate",
                    "legging": "Amun's Greaves",
                    "glove": "Amun's Gauntlets",
                    "weapon": "Amun's Artifact",
                    "shoe": "Amun's Boots"
            }
    },
    {
            "id": 109,
            "name": "Anubis the Eternal",
            "hp": 268843082059524800000,
            "cost": 452500,
            "baseStat": 2322493482350102,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Anubis's Visage",
                    "armor": "Anubis's Plate",
                    "legging": "Anubis's Greaves",
                    "glove": "Anubis's Gauntlets",
                    "weapon": "Anubis's Artifact",
                    "shoe": "Anubis's Boots"
            }
    },
    {
            "id": 110,
            "name": "Bastet the Eternal",
            "hp": 362938160780358500000,
            "cost": 457500,
            "baseStat": 2903116852937627,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Bastet's Visage",
                    "armor": "Bastet's Plate",
                    "legging": "Bastet's Greaves",
                    "glove": "Bastet's Gauntlets",
                    "weapon": "Bastet's Artifact",
                    "shoe": "Bastet's Boots"
            }
    },
    {
            "id": 111,
            "name": "Horus the Eternal",
            "hp": 489966517053484040000,
            "cost": 462500,
            "baseStat": 3628896066172034,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Horus's Visage",
                    "armor": "Horus's Plate",
                    "legging": "Horus's Greaves",
                    "glove": "Horus's Gauntlets",
                    "weapon": "Horus's Artifact",
                    "shoe": "Horus's Boots"
            }
    },
    {
            "id": 112,
            "name": "Isis the Eternal",
            "hp": 661454798022203500000,
            "cost": 467500,
            "baseStat": 4536120082715042,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Isis's Visage",
                    "armor": "Isis's Plate",
                    "legging": "Isis's Greaves",
                    "glove": "Isis's Gauntlets",
                    "weapon": "Isis's Artifact",
                    "shoe": "Isis's Boots"
            }
    },
    {
            "id": 113,
            "name": "Osiris the Eternal",
            "hp": 892963977329974800000,
            "cost": 472500,
            "baseStat": 5670150103393802,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Osiris's Visage",
                    "armor": "Osiris's Plate",
                    "legging": "Osiris's Greaves",
                    "glove": "Osiris's Gauntlets",
                    "weapon": "Osiris's Artifact",
                    "shoe": "Osiris's Boots"
            }
    },
    {
            "id": 114,
            "name": "Ra the Eternal",
            "hp": 1.2055013693954662e+21,
            "cost": 477500,
            "baseStat": 7087687629242252,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Ra's Visage",
                    "armor": "Ra's Plate",
                    "legging": "Ra's Greaves",
                    "glove": "Ra's Gauntlets",
                    "weapon": "Ra's Artifact",
                    "shoe": "Ra's Boots"
            }
    },
    {
            "id": 115,
            "name": "Set the Eternal",
            "hp": 1.6274268486838796e+21,
            "cost": 482500,
            "baseStat": 8859609536552815,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Set's Visage",
                    "armor": "Set's Plate",
                    "legging": "Set's Greaves",
                    "glove": "Set's Gauntlets",
                    "weapon": "Set's Artifact",
                    "shoe": "Set's Boots"
            }
    },
    {
            "id": 116,
            "name": "Thoth the Eternal",
            "hp": 2.1970262457232376e+21,
            "cost": 487500,
            "baseStat": 11074511920691018,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Thoth's Visage",
                    "armor": "Thoth's Plate",
                    "legging": "Thoth's Greaves",
                    "glove": "Thoth's Gauntlets",
                    "weapon": "Thoth's Artifact",
                    "shoe": "Thoth's Boots"
            }
    },
    {
            "id": 117,
            "name": "Odin the Eternal",
            "hp": 2.965985431726371e+21,
            "cost": 492500,
            "baseStat": 13843139900863772,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Odin's Visage",
                    "armor": "Odin's Plate",
                    "legging": "Odin's Greaves",
                    "glove": "Odin's Gauntlets",
                    "weapon": "Odin's Artifact",
                    "shoe": "Odin's Boots"
            }
    },
    {
            "id": 118,
            "name": "Thor the Eternal",
            "hp": 4.004080332830601e+21,
            "cost": 497500,
            "baseStat": 17303924876079716,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Thor's Visage",
                    "armor": "Thor's Plate",
                    "legging": "Thor's Greaves",
                    "glove": "Thor's Gauntlets",
                    "weapon": "Thor's Artifact",
                    "shoe": "Thor's Boots"
            }
    },
    {
            "id": 119,
            "name": "Loki the Eternal",
            "hp": 5.405508449321312e+21,
            "cost": 502500,
            "baseStat": 21629906095099644,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Loki's Visage",
                    "armor": "Loki's Plate",
                    "legging": "Loki's Greaves",
                    "glove": "Loki's Gauntlets",
                    "weapon": "Loki's Artifact",
                    "shoe": "Loki's Boots"
            }
    },
    {
            "id": 120,
            "name": "Freya the Eternal",
            "hp": 7.297436406583772e+21,
            "cost": 507500,
            "baseStat": 27037382618874556,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Freya's Visage",
                    "armor": "Freya's Plate",
                    "legging": "Freya's Greaves",
                    "glove": "Freya's Gauntlets",
                    "weapon": "Freya's Artifact",
                    "shoe": "Freya's Boots"
            }
    },
    {
            "id": 121,
            "name": "Heimdall the Eternal",
            "hp": 9.851539148888093e+21,
            "cost": 512500,
            "baseStat": 33796728273593196,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Heimdall's Visage",
                    "armor": "Heimdall's Plate",
                    "legging": "Heimdall's Greaves",
                    "glove": "Heimdall's Gauntlets",
                    "weapon": "Heimdall's Artifact",
                    "shoe": "Heimdall's Boots"
            }
    },
    {
            "id": 122,
            "name": "Tyr the Eternal",
            "hp": 1.3299577850998926e+22,
            "cost": 517500,
            "baseStat": 42245910341991496,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Tyr's Visage",
                    "armor": "Tyr's Plate",
                    "legging": "Tyr's Greaves",
                    "glove": "Tyr's Gauntlets",
                    "weapon": "Tyr's Artifact",
                    "shoe": "Tyr's Boots"
            }
    },
    {
            "id": 123,
            "name": "Baldur the Eternal",
            "hp": 1.7954430098848552e+22,
            "cost": 522500,
            "baseStat": 52807387927489370,
            "rarity": "Omnipotent",
            "color": "👑",
            "drops": {
                    "helmet": "Baldur's Visage",
                    "armor": "Baldur's Plate",
                    "legging": "Baldur's Greaves",
                    "glove": "Baldur's Gauntlets",
                    "weapon": "Baldur's Artifact",
                    "shoe": "Baldur's Boots"
            }
    }
];

const ACTIVE_RAIDS = {}; // Key: chatJid -> { boss, currentHp, participants: { jid: damage }, summonedBy }

const Raid = {
    summon(chatJid, userJid, level) {
        if (ACTIVE_RAIDS[chatJid]) return { status: 'active', raid: ACTIVE_RAIDS[chatJid] };
        
        const bossTemplate = RAID_BOSSES.find(b => b.id === level);
        if (!bossTemplate) return { status: 'not_found' };

        const newRaid = {
            id: bossTemplate.id,
            boss: bossTemplate.name,
            maxHp: bossTemplate.hp,
            currentHp: bossTemplate.hp,
            color: bossTemplate.color,
            baseStat: bossTemplate.baseStat,
            rarity: bossTemplate.rarity,
            drops: bossTemplate.drops,
            summonedBy: userJid,
            participants: {},
            startTime: Date.now()
        };
        
        ACTIVE_RAIDS[chatJid] = newRaid;
        return { status: 'success', raid: newRaid };
    },
    
    attack(chatJid, userJid, damage) {
        const raid = ACTIVE_RAIDS[chatJid];
        if (!raid) return null;
        
        const actualDamage = Math.min(damage, raid.currentHp);
        raid.currentHp -= actualDamage;
        raid.participants[userJid] = (raid.participants[userJid] || 0) + actualDamage;
        
        const isDead = raid.currentHp <= 0;
        if (isDead) {
            const finalRaid = { ...raid };
            delete ACTIVE_RAIDS[chatJid];
            return { status: 'dead', raid: finalRaid };
        }
        
        return { status: 'hit', damage: actualDamage, raid };
    },
    
    getStatus(chatJid) {
        return ACTIVE_RAIDS[chatJid] || null;
    },
    
    stop(chatJid) {
        delete ACTIVE_RAIDS[chatJid];
        return true;
    }
};

RAID_BOSSES.forEach(b => { if (b.cost) b.cost *= 5; });

module.exports = {
    RARITIES,
    GRADES,
    ITEM_TYPES,
    MONSTERS,
    RPG_SHOP,
    Raid,
    RAID_BOSSES,
    generateItem,
    generateRaidItem,
    createCustomItem,
    createSpecificRaidItem,
    calculateTotalStats
};
