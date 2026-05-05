const fs = require('fs');
const path = 'lib/rpg.js';
let content = fs.readFileSync(path, 'utf8');

const lastBossId = 23;
const count = 100;

const mythNames = [
    "Aether", "Chaos", "Chronos", "Erebus", "Gaia", "Hemera", "Nyx", "Tartarus", "Uranus",
    "Amun", "Anubis", "Bastet", "Horus", "Isis", "Osiris", "Ra", "Set", "Thoth",
    "Odin", "Thor", "Loki", "Freya", "Heimdall", "Tyr", "Baldur", "Frigg", "Hel",
    "Zeus", "Hera", "Poseidon", "Demeter", "Athena", "Apollo", "Artemis", "Ares", "Aphrodite", "Hephaestus", "Hermes", "Dionysus",
    "Izanagi", "Izanami", "Amaterasu", "Susanoo", "Tsukuyomi", "Inari", "Raijin", "Fujin",
    "Brahma", "Vishnu", "Shiva", "Indra", "Agni", "Varuna", "Yama", "Kali", "Durga",
    "Gilgamesh", "Enkidu", "Ishtar", "Marduk", "Tiamat", "Enlil", "Anu",
    "Quetzalcoatl", "Huitzilopochtli", "Tezcatlipoca", "Tlaloc", "Xipe Totec",
    "Viracocha", "Inti", "Mama Quilla", "Pachamama",
    "Azathoth", "Yog-Sothoth", "Nyarlathotep", "Shub-Niggurath", "Cthulhu", "Hastur", "Yig",
    "Bahamut", "Tiamat", "Leviathan", "Behemoth", "Ziz", "Simurgh", "Phoenix",
    "Ragnarok", "Apocalypse", "Armageddon", "Oblivion", "Eternity", "Infinity", "Void", "Singularity", "Nexus", "Zenith", "Nadira", "Apex", "Omnipotence"
];

function getBossName(id) {
    const base = mythNames[id % mythNames.length];
    const suffixes = ["the Destroyer", "the Eternal", "the Unbound", "the Sovereign", "the Ancient", "the Cosmic", "the Void-Walker", "the Star-Eater", "the World-Shaper", "the End-Bringer", "the All-Seeing", "the Primordial"];
    const suffix = suffixes[Math.floor(id / mythNames.length) % suffixes.length];
    return `${base} ${suffix}`;
}

let bosses = [];
let currentHp = 1662626795; // Boss 23 HP
let currentCost = 22500;
let currentBaseStat = 10757056;

for (let i = 1; i <= count; i++) {
    const id = lastBossId + i;
    currentHp = Math.floor(currentHp * 1.35); // 35% increase per level
    currentCost += 5000;
    currentBaseStat = Math.floor(currentBaseStat * 1.25); // 25% power increase
    
    const name = getBossName(id);
    const setPrefix = name.split(' ')[0];
    
    bosses.push({
        id: id,
        name: name,
        hp: currentHp,
        cost: currentCost,
        baseStat: currentBaseStat,
        rarity: id > 100 ? "Omnipotent" : (id > 80 ? "Primordial" : (id > 60 ? "Ancient" : (id > 40 ? "Mythic" : "Godly"))),
        color: id > 100 ? "👑" : "🌌",
        drops: {
            helmet: `${setPrefix}'s Visage`,
            armor: `${setPrefix}'s Plate`,
            legging: `${setPrefix}'s Greaves`,
            glove: `${setPrefix}'s Gauntlets`,
            weapon: `${setPrefix}'s Artifact`,
            shoe: `${setPrefix}'s Boots`
        }
    });
}

// Find the position to insert.
// We'll replace the ending ]; of RAID_BOSSES
const insertMarker = '    }\n];'; // End of boss 23
const newBossesString = bosses.map(b => `    ${JSON.stringify(b, null, 8).replace(/\n/g, '\n    ')}`).join(',\n');

content = content.replace(insertMarker, `    },\n${newBossesString}\n];`);

fs.writeFileSync(path, content);
console.log('Successfully added 100 more bosses!');
