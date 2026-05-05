const fs = require('fs');

let content = fs.readFileSync('lib/rpg.js', 'utf-8');

// 1. Update RARITIES
const newRarities = `const RARITIES = [
    { name: 'Common', chance: 0.50, mult: 1 },
    { name: 'Uncommon', chance: 0.25, mult: 1.2 },
    { name: 'Rare', chance: 0.12, mult: 1.5 },
    { name: 'Epic', chance: 0.08, mult: 2.0 },
    { name: 'Legendary', chance: 0.03, mult: 3.0 },
    { name: 'Mythic', chance: 0.015, mult: 5.0 },
    { name: 'Secret', chance: 0.005, mult: 8.0 }
];`;
content = content.replace(/const RARITIES = \[[\s\S]*?\];/, newRarities);

// 2. Update GRADES
const newGrades = `const GRADES = [
    { name: 'E', chance: 0.35, mult: 0.5 },
    { name: 'D', chance: 0.25, mult: 0.8 },
    { name: 'C', chance: 0.20, mult: 1.0 },
    { name: 'B', chance: 0.10, mult: 1.2 },
    { name: 'A', chance: 0.06, mult: 1.5 },
    { name: 'S', chance: 0.025, mult: 2.0 },
    { name: 'SS', chance: 0.01, mult: 2.5 },
    { name: 'SSS+', chance: 0.005, mult: 3.0 }
];`;
content = content.replace(/const GRADES = \[[\s\S]*?\];/, newGrades);

// 3. Update BASE_STATS
const newBaseStats = `const BASE_STATS = {
    weapon: { power: 20, defense: 0, luck: 2 },
    helmet: { power: 2, defense: 10, luck: 3 },
    armor: { power: 2, defense: 20, luck: 2 },
    glove: { power: 5, defense: 5, luck: 5 },
    legging: { power: 2, defense: 12, luck: 2 },
    shoe: { power: 1, defense: 5, luck: 8 }
};`;
content = content.replace(/const BASE_STATS = \{[\s\S]*?\};/, newBaseStats);

// 4. Update RPG_SHOP (prices * 10)
content = content.replace(/price: (\d+)/g, (match, p1) => `price: ${parseInt(p1) * 10}`);

// 5. Update MONSTERS dropChance
content = content.replace(/dropChance: (0\.\d+)/g, (match, p1) => {
    let dc = parseFloat(p1);
    // Reduce drop chance by dividing it or subtracting
    // Lemah was 0.2-0.39 -> now 0.05-0.15
    // Kuat was 0.3-0.58 -> now 0.1-0.25
    // Boss was 0.5-0.88 -> now 0.15-0.40
    let newDc = dc * 0.4; 
    return `dropChance: ${newDc.toFixed(2)}`;
});

fs.writeFileSync('lib/rpg.js', content);
