const fs = require('fs');
const path = 'lib/rpg.js';
let content = fs.readFileSync(path, 'utf8');

// Update prices in RPG_SHOP by 10x
content = content.replace(/"price":\s*(\d+)/g, (match, p) => {
    return `"price": ${parseInt(p) * 10}`;
});

fs.writeFileSync(path, content);
console.log('Successfully increased shop prices by 10x');
