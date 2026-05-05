const fs = require('fs');
const path = 'lib/rpg.js';
let content = fs.readFileSync(path, 'utf8');

// Update HP for all RAID_BOSSES
// "hp": 150000
content = content.replace(/"hp":\s*(\d+)/g, (match, hp) => {
    return `"hp": ${parseInt(hp) * 5}`;
});

fs.writeFileSync(path, content);
console.log('Successfully buffed all boss HP by 5x');
