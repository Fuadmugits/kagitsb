const fs = require('fs');

const weak = ['Slime', 'Bat', 'Rat', 'Spider', 'Snake', 'Goblin', 'Skeleton', 'Zombie', 'Wolf', 'Boar', 'Bear', 'Bandit', 'Rogue', 'Cultist', 'Imp', 'Harpy', 'Murloc', 'Kobold', 'Gnome', 'Pixie'];
const weakPower = [10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 350, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500];

const strong = ['Orc', 'Troll', 'Ogre', 'Minotaur', 'Cyclops', 'Golem', 'Gargoyle', 'Wraith', 'Banshee', 'Vampire', 'Werewolf', 'Chimera', 'Manticore', 'Basilisk', 'Hydra', 'Griffon', 'Wyvern', 'Drake', 'Dragon', 'Behemoth'];
const strongPower = [2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 75000, 90000, 100000, 120000, 135000, 150000, 175000];

const boss = ['Leviathan', 'Kraken', 'Cerberus', 'Fenrir', 'Jormungandr', 'Titan', 'Colossus', 'Archdemon', 'Archangel', 'Lich King', 'Death Knight', 'Chaos Elemental', 'Void Terror', 'Star Spawn', 'Ancient Dragon', 'Primordial Behemoth', 'Elder God', 'Abyssal Lord', 'Cosmic Entity', 'Creator'];
const bossPower = [200000, 250000, 300000, 400000, 500000, 750000, 1000000, 1250000, 1500000, 1750000, 2000000, 2500000, 3000000, 3500000, 4000000, 4500000, 5000000, 6000000, 8000000, 10000000];

let out = 'const MONSTERS = {\n';
for(let i=0; i<20; i++){
  let p = weakPower[i];
  let dc = (0.2 + (i*0.01)).toFixed(2);
  let id = weak[i].toLowerCase().replace(/ /g, '-');
  out += `    '${id}': { name: '${weak[i]}', powerReq: ${p}, dropChance: ${dc}, class: 'lemah' },\n`;
}
for(let i=0; i<20; i++){
  let p = strongPower[i];
  let dc = (0.3 + (i*0.015)).toFixed(2);
  let id = strong[i].toLowerCase().replace(/ /g, '-');
  out += `    '${id}': { name: '${strong[i]}', powerReq: ${p}, dropChance: ${dc}, class: 'kuat' },\n`;
}
for(let i=0; i<20; i++){
  let p = bossPower[i];
  let dc = (0.5 + (i*0.02)).toFixed(2);
  let id = boss[i].toLowerCase().replace(/ /g, '-');
  out += `    '${id}': { name: '${boss[i]}', powerReq: ${p}, dropChance: ${dc}, class: 'boss' },\n`;
}
out += '};\n';
fs.writeFileSync('monsters_temp.js', out);
