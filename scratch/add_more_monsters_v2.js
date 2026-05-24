const fs = require('fs');
const path = require('path');

const rpgPath = path.join(__dirname, '../lib/rpg.js');
let code = fs.readFileSync(rpgPath, 'utf8');

// Generate Monsters
let newMonsters = [];

// 100 Lemah Monsters (Power 10 to 5000)
for (let i = 0; i < 100; i++) {
    let monName = 'Lesser Spirit ' + (i+1);
    let key = monName.toLowerCase().replace(/\s+/g, '-');
    let pwr = 10 + (i * 50);
    newMonsters.push(`    '${key}': { name: '${monName}', powerReq: ${pwr}, dropChance: 0.10, class: 'lemah' }`);
}

// 100 Kuat Monsters (Power 5000 to 200,000)
for (let i = 0; i < 100; i++) {
    let monName = 'Elite Warrior ' + (i+1);
    let key = monName.toLowerCase().replace(/\s+/g, '-');
    let pwr = 5000 + (i * 1950);
    newMonsters.push(`    '${key}': { name: '${monName}', powerReq: ${pwr}, dropChance: 0.15, class: 'kuat' }`);
}

// 100 Boss Monsters (Power 200,000 to 5,000,000)
for (let i = 0; i < 100; i++) {
    let monName = 'Demon Lord ' + (i+1);
    let key = monName.toLowerCase().replace(/\s+/g, '-');
    let pwr = 200000 + (i * 48000);
    newMonsters.push(`    '${key}': { name: '${monName}', powerReq: ${pwr}, dropChance: 0.25, class: 'boss' }`);
}

let monstersInject = ',\n' + newMonsters.join(',\n') + '\n};';
code = code.replace(/};\s*\n\s*const RPG_SHOP = {/, monstersInject + '\n\nconst RPG_SHOP = {');

fs.writeFileSync(rpgPath, code, 'utf8');
console.log('Successfully injected 300 more monsters!');
