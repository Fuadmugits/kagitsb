const names = [
    "Gorgos the Destroyer", "Valerius the Sun-Eater", "Xalthar of the Deep", 
    "Uldor the Frost-Giant", "Nyxshadow Queen", "Thalric the Storm-Lord", 
    "Malphas the Gatekeeper", "Azazel the Fallen Seraph", "Belial the Lord of Lies", 
    "Chronos the Time-Weaver", "Aetherion the Star-Born", "Vespera the Twilight Maiden", 
    "Erebus the Primordial Dark", "Ouroboros the Eternal Serpent", "Yggdrasil Guardian", 
    "Bahamut the Dragon King", "Tiamat the Mother of Dragons", "Azathoth the Blind Idiot God", 
    "Yog-Sothoth the Key and the Gate", "Cthulhu the Great Old One"
];

const emojis = ["👹", "☀️", "🐙", "❄️", "🕷️", "⚡", "🏰", "👼", "😈", "⏳", "✨", "🌆", "🌑", "🐉", "🌳", "🐲", "🌋", "👁️", "🌌", "🐙"];
const rarities = ["Secret", "Secret", "Divine", "Divine", "Divine", "Celestial", "Celestial", "Celestial", "Void", "Void", "Void", "Cosmic", "Cosmic", "Cosmic", "Transcendent", "Transcendent", "Transcendent", "Godly", "Godly", "Godly"];

let bosses = [];
let hp = 150000;
let cost = 3500;
let baseStat = 18000;

for (let i = 0; i < names.length; i++) {
    const id = i + 4;
    const name = names[i];
    const shortName = name.split(' ')[0].replace(/[^a-zA-Z]/g, '');
    
    bosses.push({
        id: id,
        name: name,
        hp: hp,
        cost: cost,
        baseStat: baseStat,
        rarity: rarities[i] || "Godly",
        color: emojis[i] || "💀",
        drops: {
            helmet: `${shortName}'s Vision`,
            armor: `${shortName}'s Bulwark`,
            legging: `${shortName}'s Stride`,
            glove: `${shortName}'s Grip`,
            weapon: `${shortName}'s Bane`,
            shoe: `${shortName}'s Step`
        }
    });
    
    hp = Math.floor(hp * 1.5);
    cost += 1000;
    baseStat = Math.floor(baseStat * 1.4);
}

console.log(JSON.stringify(bosses, null, 4));
