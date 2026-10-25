// Game Variables
let points = 0;
let pointsPerClick = 1;
let pointsPerSecond = 0;
let toastTimer;
let hp = 100;
let ox = 100;
let temp = 100;

function saveGame() {
    const gameData = {
        points: points,
        hasSuit: hasSuit,
        planetLevel: planetLevel,
        hp: hp,
        ox: ox,
        temp: temp,
        tanksUsed: tanksUsed,

        // Save the number of each building purchased
        buildings: {}
    };

    for (const key in buildings) {
        gameData.buildings[key] = buildings[key].count;
    }

    localStorage.setItem("spaceClickerSave", JSON.stringify(gameData));
}


function loadGame() {
    const savedData = localStorage.getItem("spaceClickerSave");

    if (!savedData) {
        return;
    }

    try {
        const gameData = JSON.parse(savedData);

        points = gameData.points ?? 0;
        hasSuit = gameData.hasSuit ?? false;
        planetLevel = gameData.planetLevel ?? 0;
        hp = gameData.hp ?? 100;
        ox = gameData.ox ?? 100;
        temp = gameData.temp ?? 100;
        tanksUsed = gameData.tanksUsed ?? 0;

        // Restore purchased buildings
        if (gameData.buildings) {
            for (const key in buildings) {
                buildings[key].count = gameData.buildings[key] ?? 0;
            }
        }

        // Recalculate click power and passive earnings
        recalcStats();

        // Restore the correct planet and character image
        setScene();

        console.log("Game loaded successfully!");

    } catch (error) {
        console.error("Could not load saved game:", error);
    }
}


// Format large numbers using scientific notation
function formatNumber(number) {
    if (number >= 1_000_000) {
        return number.toExponential(2);
    }

    return Math.floor(number).toLocaleString("en-US");
}

// Space Prog
const suitCost = 5000;
const ascentCost = 10000;
let hasSuit = false;
let planetLevel = 0;
const planets = [
    { name: "Earth", img: "assets/earth.png", multiplier: 1 },
    { name: "Moon", img: "assets/moon.png", multiplier: 2 },
    { name: "Mars", img: "assets/mars.png", multiplier: 5 }
];

// Buildings 
const buildings = {
    chomp: { name: "Chomp Upgrade", baseCost: 10, click: 1, rate: 0, count: 0, costId: "upgradeCost", lvlId: "level1" },
    football: { name: "Hungry Football Team", baseCost: 100, click: 0, rate: 1, count: 0, costId: "upgradeCost2", lvlId: "level2" },
    union: { name: "Union Rush Hour", baseCost: 1000, click: 0, rate: 10, count: 0, costId: "upgradeCost3", lvlId: "level3" }
};

function getCost(b) {
    return Math.ceil(b.baseCost * Math.pow(1.25, b.count));   // +45% per purchase
}

function recalcStats() {
const multiplier = planets[planetLevel].multiplier;

pointsPerClick = 1*multiplier;
pointsPerSecond = 0;



for (const key in buildings) {
    const b = buildings[key];

    pointsPerClick += b.count * b.click * multiplier;
    pointsPerSecond += b.count * b.rate * multiplier;
}

console.log(pointsPerClick);
console.log(pointsPerSecond);

}

function buyBuilding(key) {
    const b = buildings[key];
    const cost = getCost(b);
    if (points >= cost) {
        points -= cost;
        b.count++;
        recalcStats();
       updateDisplay();
        saveGame();
    const gain = b.click
    ? "+" + b.click + " per click"
    : "+" + b.rate + " per second";
    showToast(b.name + " purchased! " + gain, "success");
    } else {
        showToast("Not enough points!", "error");
    }
}

// Scene (planet and tiger images)
function setScene() {
    const planetImg = document.getElementById("planetImg");
    planetImg.src = planets[planetLevel].img;
    planetImg.alt = planets[planetLevel].name;
    document.getElementById("tigerImg").src = hasSuit ? "assets/space-helmet.png" : "assets/tiger.png";
}

// Suit purchase
function buySuit() {
    if (hasSuit) {
        showToast("You already have a space suit!", "error");
        return;
    }
    if (points >= suitCost) {
        points -= suitCost;
       hasSuit = true;
    setScene();
    updateDisplay();
    saveGame();
    showToast("Space Suit purchased! You can now survive in space.", "success");
    } else {
        showToast("Not enough points for Space Suit!", "error");
    }
}

// Change the planet
function planetChange() {
    if (planetLevel >= planets.length - 1) {
        showToast("No more planets available!", "error");
        return;
    }
    if (points < ascentCost) {
        showToast("Not enough points for Ascent!", "error");
        return;
    }
    if (!hasSuit) {
        resetGame("You died without a space suit! Game reset.", "error", 2500);
        return;
    }
    points -= ascentCost;
    planetLevel++;
    hp = 100;
    ox = 100;
    temp = 100;

    recalcStats();
    setScene();
    updateDisplay();
    saveGame();
    showToast("Ascent successful! Welcome to " + planets[planetLevel].name + ".", "success", 2000);
}

// Survivability values
const oxygenDrain = 1; // Oxygen depletion per second on the moonn
const oxygenThrreshold = 30; // Oxygen b4 health starts depleting
const suffocateDmg = 5; // Health depletion per second when oxygen is 0
const tempThreshold = 20; //Temp b4 health starts depleteing
const freezeDmg = 3; //Temp depletion per second when temp = 0
const tempDrain = 3;


function survivalTick() {
    if (planetLevel <= 0) {
        ox = 100;
        temp = 100;
        return;
    }

    // Oxygen (Moon and Mars)
    const before = ox;
    ox = Math.max(0, ox - oxygenDrain);
    if (before >= oxygenThrreshold && ox < oxygenThrreshold) {
        showToast("Oxygen is low!", "error", 2000);
    }
    if (ox < oxygenThrreshold) {
        hp = Math.max(0, hp - suffocateDmg);
    }

    // Temperature (Mars only)
    if (planetLevel === 2) {
        temp = Math.max(0, temp - tempDrain);
        if (temp < tempThreshold) {
            hp = Math.max(0, hp - freezeDmg);
        }
    } else {
        temp = 100;
    }

    // Death for both
    if (hp === 0) {
        const msg = ox < oxygenThrreshold
            ? "You died from suffocation! Game reset."
            : "You died from freezing! Game reset.";
        resetGame(msg, "error", 2500);
    }
}


// Main game loop
setInterval(function () {
    points += pointsPerSecond;

    survivalTick();

    updateDisplay();
}, 1000);


// Automatically save every 5 seconds
setInterval(function () {
    saveGame();
}, 5000);

function updateDisplay() {
    document.getElementById("points").textContent = formatNumber(points);
    document.getElementById("perSecond").textContent = formatNumber(pointsPerSecond);
    document.getElementById("health").value = hp;
    document.getElementById("oxygen").value = ox;
    document.getElementById("temp").value = temp;
    document.getElementById("upgradeCost4").textContent = oxygenCost;
    document.getElementById("level4").textContent = tanksUsed;

    for (const key in buildings) {
        const b = buildings[key];
        document.getElementById(b.costId).textContent = getCost(b);
        document.getElementById(b.lvlId).textContent = b.count;
    }
}


// Toast
function showToast(message, type, duration = 1000) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast " + type + " show";

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
}

// Points per click
function earnPoints(e) {
    points += pointsPerClick;
    updateDisplay();
    saveGame();
    spawnPop(e.clientX, e.clientY, "+" + formatNumber(pointsPerClick));
}

function spawnPop(x, y, text) {
    const pop = document.createElement("span");
    pop.className = "pop";
    pop.textContent = text;
    pop.style.left = (x + (Math.random() * 30 - 15)) + "px";
    pop.style.top = (y - 10) + "px";
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 800);
}

// Placeholders so unfinished buttons don't throw errors
function constantEarner1() { showToast("Coming soon!", "error"); }

const oxygenCost = 500;
let tanksUsed = 0;

// Oxygen tank
function buyOxygen() {
    if (planetLevel === 0) {
        showToast("Oxygen tanks are not needed on Earth!", "error");
        return;
    }
    if (ox >= 100) {
        showToast("Oxygen is already full!", "error");
        return;
    }
    if (points < oxygenCost) {
        showToast("Not enough points for Oxygen Tank!", "error");
        return;
    }
    points -= oxygenCost;
    ox = 100;
    tanksUsed++;
    updateDisplay();
    saveGame();
    showToast("Oxygen Tank used! Oxygen restored to 100.", "success");
}

function resetGame(message = "Game reset!", type = "success", duration = 2500) {
    // Reset all game variables
    points = 0;
    hp = 100;
    ox = 100;
    temp = 100;

    hasSuit = false;
    tanksUsed = 0;
    planetLevel = 0;

    // Reset all purchased buildings
    for (const key in buildings) {
        buildings[key].count = 0;
    }

    // Recalculate statistics
    recalcStats();

    // Restore Earth and the original character image
    setScene();

    // Update the interface
    updateDisplay();

    // Delete the previous save
    localStorage.removeItem("spaceClickerSave");

    showToast(message, type, duration);
}

function backPlanet() {
    if (planetLevel <= 0) {
        showToast("You are already on Earth!", "error");
        return;
    }
    planetLevel--;
    recalcStats();
    setScene();
    updateDisplay();
    showToast("Returned back! Welcome to " + planets[planetLevel].name + ".", "success", 2000);

}
loadGame();
updateDisplay();