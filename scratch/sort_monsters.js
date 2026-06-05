const fs = require('fs');
const path = require('path');

const rpgPath = path.join(__dirname, '../lib/rpg.js');
let code = fs.readFileSync(rpgPath, 'utf8');

// We need to parse the monsters out. 
// Since requiring it might be easier to get the object, let's do that.
const { MONSTERS } = require('../lib/rpg.js');

const sortedEntries = Object.entries(MONSTERS).sort((a, b) => a[1].powerReq - b[1].powerReq);

let newMonstersBlock = 'const MONSTERS = {\n';
sortedEntries.forEach(([key, val], index) => {
    let line = `    '${key}': { name: '${val.name}', powerReq: ${val.powerReq}, dropChance: ${val.dropChance}, class: '${val.class}' }`;
    if (index < sortedEntries.length - 1) {
        line += ',';
    }
    newMonstersBlock += line + '\n';
});
newMonstersBlock += '};';

// Now replace it in the code string.
// We'll use a regex to replace everything from "const MONSTERS = {" to "};\n\nconst RPG_SHOP"
// Wait, the regex might be tricky if there are multiple "};".
// Let's split by "const MONSTERS = {" and "const RPG_SHOP = {"

const parts1 = code.split('const MONSTERS = {');
const beforeMonsters = parts1[0];

const parts2 = parts1[1].split('const RPG_SHOP = {');
const afterMonsters = 'const RPG_SHOP = {' + parts2.slice(1).join('const RPG_SHOP = {');

const newCode = beforeMonsters + newMonstersBlock + '\n\n' + afterMonsters;

fs.writeFileSync(rpgPath, newCode, 'utf8');
console.log('Monsters successfully sorted by powerReq!');
