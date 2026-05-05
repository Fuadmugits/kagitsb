const { RPG } = require('../database');

const RARITIES = [
    { name: 'Common', chance: 0.50, mult: 1 },
    { name: 'Uncommon', chance: 0.25, mult: 1.2 },
    { name: 'Rare', chance: 0.12, mult: 1.5 },
    { name: 'Epic', chance: 0.08, mult: 2.0 },
    { name: 'Legendary', chance: 0.03, mult: 3.0 },
    { name: 'Mythic', chance: 0.015, mult: 5.0 },
    { name: 'Secret', chance: 0.005, mult: 8.0 }
];

const GRADES = [
    { name: 'E', chance: 0.35, mult: 0.5 },
    { name: 'D', chance: 0.25, mult: 0.8 },
    { name: 'C', chance: 0.20, mult: 1.0 },
    { name: 'B', chance: 0.10, mult: 1.2 },
    { name: 'A', chance: 0.06, mult: 1.5 },
    { name: 'S', chance: 0.025, mult: 2.0 },
    { name: 'SS', chance: 0.01, mult: 2.5 },
    { name: 'SSS+', chance: 0.005, mult: 3.0 }
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
        { id: 'w1', name: 'Iron Sword', price: 1000, rarity: 'Common', grade: 'C', stats: { power: 500, defense: 0, luck: 10 } },
        { id: 'w2', name: 'Steel Blade', price: 5000, rarity: 'Uncommon', grade: 'B', stats: { power: 1200, defense: 0, luck: 25 } },
        { id: 'w3', name: 'Mithril Greatsword', price: 25000, rarity: 'Rare', grade: 'A', stats: { power: 3000, defense: 0, luck: 50 } }
    ],
    helmet: [
        { id: 'h1', name: 'Iron Helmet', price: 1000, rarity: 'Common', grade: 'C', stats: { power: 50, defense: 150, luck: 50 } },
        { id: 'h2', name: 'Steel Helm', price: 5000, rarity: 'Uncommon', grade: 'B', stats: { power: 120, defense: 350, luck: 120 } },
        { id: 'h3', name: 'Mithril Crown', price: 25000, rarity: 'Rare', grade: 'A', stats: { power: 300, defense: 800, luck: 300 } }
    ],
    armor: [
        { id: 'a1', name: 'Iron Chestplate', price: 1000, rarity: 'Common', grade: 'C', stats: { power: 50, defense: 300, luck: 50 } },
        { id: 'a2', name: 'Steel Armor', price: 5000, rarity: 'Uncommon', grade: 'B', stats: { power: 120, defense: 700, luck: 120 } },
        { id: 'a3', name: 'Mithril Plate', price: 25000, rarity: 'Rare', grade: 'A', stats: { power: 300, defense: 1500, luck: 300 } }
    ],
    glove: [
        { id: 'g1', name: 'Iron Gloves', price: 1000, rarity: 'Common', grade: 'C', stats: { power: 120, defense: 100, luck: 100 } },
        { id: 'g2', name: 'Steel Gauntlets', price: 5000, rarity: 'Uncommon', grade: 'B', stats: { power: 300, defense: 250, luck: 250 } },
        { id: 'g3', name: 'Mithril Fists', price: 25000, rarity: 'Rare', grade: 'A', stats: { power: 750, defense: 600, luck: 600 } }
    ],
    legging: [
        { id: 'l1', name: 'Iron Leggings', price: 1000, rarity: 'Common', grade: 'C', stats: { power: 50, defense: 200, luck: 50 } },
        { id: 'l2', name: 'Steel Greaves', price: 5000, rarity: 'Uncommon', grade: 'B', stats: { power: 120, defense: 450, luck: 120 } },
        { id: 'l3', name: 'Mithril Guards', price: 25000, rarity: 'Rare', grade: 'A', stats: { power: 300, defense: 1000, luck: 300 } }
    ],
    shoe: [
        { id: 's1', name: 'Iron Boots', price: 1000, rarity: 'Common', grade: 'C', stats: { power: 25, defense: 100, luck: 150 } },
        { id: 's2', name: 'Steel Boots', price: 5000, rarity: 'Uncommon', grade: 'B', stats: { power: 60, defense: 250, luck: 350 } },
        { id: 's3', name: 'Mithril Treads', price: 25000, rarity: 'Rare', grade: 'A', stats: { power: 150, defense: 600, luck: 800 } }
    ],
    consumable: [
        { id: 'c1', name: 'Mystery Gacha Box', price: 500, rarity: 'Rare', grade: 'S', stats: { effect: 'gacha' }, desc: 'Dapatkan item random/koin/balance!' },
        { id: 'c2', name: 'Premium Ticket (3D)', price: 5000, rarity: 'Epic', grade: 'SS', stats: { effect: 'premium', days: 3 }, desc: 'Aktifkan status premium selama 3 hari.' },
        { id: 'c3', name: 'Wealth Voucher', price: 2000, rarity: 'Rare', grade: 'S', stats: { effect: 'balance', min: 100000, max: 500000 }, desc: 'Dapatkan 100k - 500k Balance secara acak.' }
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
        stats: {
            power: Math.floor(boss.baseStat * totalMult * (itemType === 'weapon' ? 1.5 : 0.8)),
            defense: Math.floor(boss.baseStat * totalMult * (itemType === 'weapon' ? 0.2 : 1.2)),
            luck: Math.floor(boss.baseStat * 0.1 * totalMult)
        }
    };
}

function calculateTotalStats(jid, chatJid = null) {
    const userRpg = RPG.getUser(jid);
    let totalStats = { power: 0, defense: 0, luck: 0 };
    const setCounts = {};
    
    for (const slot of ITEM_TYPES) {
        if (userRpg[slot]) {
            try {
                const item = JSON.parse(userRpg[slot]);
                if (item && item.stats) {
                    totalStats.power += item.stats.power || 0;
                    totalStats.defense += item.stats.defense || 0;
                    totalStats.luck += item.stats.luck || 0;
                    
                    if (item.set) {
                        setCounts[item.set] = (setCounts[item.set] || 0) + 1;
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
    
    const { Settings } = require('../database');
    const abuseVal = chatJid ? Settings.get('adminabuse_' + chatJid) : null;
    const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
    
    if (multiplier > 1) {
        totalStats.luck *= multiplier;
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
    }
};

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
