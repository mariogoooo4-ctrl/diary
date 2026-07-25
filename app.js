// --- APP STATE & LOCALSTORAGE LOGIC ---
const DEFAULT_STATE = {
    character: {
        name: "Безстрашен Герой",
        level: 1,
        xp: 0,
        nextLevelXp: 100,
        gold: 30,
        streak: 0,
        lastActiveDate: null, // YYYY-MM-DD
        avatarIndex: 0,
        stats: {
            strength: 10.0,
            intellect: 10.0,
            charisma: 10.0,
            willpower: 10.0
        }
    },
    lists: [
        { id: "default", name: "🛡️ Главни мисии" }
    ],
    activeListId: "default",
    quests: [
        { id: "q1", text: "Прочети 10 страници от книга", type: "daily", category: "intellect", difficulty: "medium", completed: false, dateCreated: new Date().toISOString(), listId: "default" },
        { id: "q2", text: "Направи 30 лицеви опори или тренировка", type: "daily", category: "strength", difficulty: "medium", completed: false, dateCreated: new Date().toISOString(), listId: "default" },
        { id: "q3", text: "Сготви здравословна храна", type: "quick", category: "willpower", difficulty: "easy", completed: false, dateCreated: new Date().toISOString(), listId: "default" }
    ],
    shop: [
        { id: "s1", text: "Гледане на 1 епизод от сериал", cost: 15, purchasedCount: 0, system: true },
        { id: "s2", text: "Хапване на нещо сладко / Junk food", cost: 25, purchasedCount: 0, system: true },
        { id: "s3", text: "1 час безцелно скролване в социални мрежи", cost: 20, purchasedCount: 0, system: true },
        { id: "s4", text: "Мързелив ден без гузна съвест", cost: 100, purchasedCount: 0, system: true }
    ],
    achievements: [
        { id: "a_first_step", title: "Първа стъпка", desc: "Завърши първата си мисия", icon: "fa-baby-carriage", unlocked: false, dateUnlocked: null },
        { id: "a_level_5", title: "Изгряваща звезда", desc: "Достигни 5-то ниво", icon: "fa-star", unlocked: false, dateUnlocked: null },
        { id: "a_streak_3", title: "Постоянство", desc: "Достигни 3 дни активна серия", icon: "fa-fire", unlocked: false, dateUnlocked: null },
        { id: "a_streak_7", title: "Легендарна серия", desc: "Достигни 7 дни активна серия", icon: "fa-meteor", unlocked: false, dateUnlocked: null },
        { id: "a_stat_15", title: "Специалист", desc: "Вдигни някоя характеристика до 15.0", icon: "fa-award", unlocked: false, dateUnlocked: null },
        { id: "a_gold_100", title: "Богаташ", desc: "Натрупай 100 или повече злато наведнъж", icon: "fa-vault", unlocked: false, dateUnlocked: null },
        { id: "a_shop_spender", title: "Грешник", desc: "Купи 5 неща от Магазина за награди", icon: "fa-bag-shopping", unlocked: false, dateUnlocked: null }
    ],
    history: [],
    settings: {
        soundOn: true
    }
};

let state = JSON.parse(localStorage.getItem("lifequest_state")) || DEFAULT_STATE;

// Compatibility check for state upgrades (incase keys are missing)
if (!state.settings) state.settings = { soundOn: true };
if (!state.character.stats) state.character.stats = { strength: 10, intellect: 10, charisma: 10, willpower: 10 };
if (!state.shop) state.shop = DEFAULT_STATE.shop;
if (!state.achievements) state.achievements = DEFAULT_STATE.achievements;
if (!state.history) state.history = [];
if (!state.lists || state.lists.length === 0) {
    state.lists = [{ id: "default", name: "🛡️ Главни мисии" }];
}
if (!state.activeListId) {
    state.activeListId = "default";
}
// Migrate existing quests to default list if listId is missing
state.quests.forEach(q => {
    if (!q.listId) {
        q.listId = "default";
    }
});

function saveState() {
    localStorage.setItem("lifequest_state", JSON.stringify(state));
}

// --- SVG AVATARS ---
const AVATARS = [
    // Warrior
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1a152c"/><circle cx="50" cy="45" r="22" fill="#ff3366"/><path d="M50 15 L60 30 L40 30 Z" fill="#ffb300"/><path d="M25 85 Q50 55 75 85 Z" fill="#ff3366"/><rect x="47" y="40" width="6" height="30" fill="#f5f2ff"/><rect x="40" y="47" width="20" height="6" fill="#f5f2ff"/></svg>`,
    // Mage
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1a152c"/><circle cx="50" cy="45" r="22" fill="#9f60ff"/><path d="M20 35 L50 5 L80 35 Q50 30 20 35 Z" fill="#00f0ff"/><path d="M25 85 Q50 55 75 85 Z" fill="#9f60ff"/><circle cx="50" cy="45" r="4" fill="#00f0ff"/></svg>`,
    // Rogue
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1a152c"/><circle cx="50" cy="45" r="22" fill="#00ff66"/><path d="M30 30 Q50 15 70 30 L50 55 Z" fill="#0d091c"/><path d="M25 85 Q50 55 75 85 Z" fill="#00ff66"/></svg>`,
    // Ranger
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1a152c"/><circle cx="50" cy="45" r="22" fill="#00f0ff"/><path d="M35 15 L50 35 L65 15 Z" fill="#ffb300"/><path d="M25 85 Q50 55 75 85 Z" fill="#00f0ff"/></svg>`,
    // Cleric
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1a152c"/><circle cx="50" cy="45" r="22" fill="#ffb300"/><path d="M25 85 Q50 55 75 85 Z" fill="#ffb300"/><path d="M45 25 H55 V65 H45 Z" fill="#f5f2ff"/><path d="M35 35 H65 V45 H35 Z" fill="#f5f2ff"/></svg>`,
    // Alchemist
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1a152c"/><circle cx="50" cy="45" r="22" fill="#e25c80"/><path d="M45 20 H55 V35 H45 Z" fill="#7928ca"/><path d="M30 65 Q50 40 70 65 Z" fill="#9f60ff"/><path d="M25 85 Q50 55 75 85 Z" fill="#e25c80"/></svg>`
];

// --- RETRO SOUND SYNTHESISER (Web Audio API) ---
class SoundEngine {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    play(type) {
        if (!state.settings.soundOn) return;
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;

        if (type === 'click') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            
            osc.start(now);
            osc.stop(now + 0.05);
        } 
        else if (type === 'success') {
            // High-pitch double retro chirp
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
            
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            
            osc.start(now);
            osc.stop(now + 0.35);
        } 
        else if (type === 'levelup') {
            // Classic triumphant rising arcade melody
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
            const duration = 0.08;
            
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, now + idx * duration);
                
                gain.gain.setValueAtTime(0.08, now + idx * duration);
                gain.gain.exponentialRampToValueAtTime(0.005, now + idx * duration + duration * 1.5);
                
                osc.start(now + idx * duration);
                osc.stop(now + idx * duration + duration * 1.5);
            });
        } 
        else if (type === 'buy') {
            // Classic Mario coin sound
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            const gain2 = this.ctx.createGain();
            
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            
            osc1.type = 'sine';
            osc2.type = 'sine';
            
            // Two rapid high notes
            osc1.frequency.setValueAtTime(987.77, now); // B5
            osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6
            gain1.gain.setValueAtTime(0.08, now);
            gain1.gain.setValueAtTime(0.08, now + 0.08);
            gain1.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
            
            osc1.start(now);
            osc1.stop(now + 0.35);
        }
    }
}
const soundEngine = new SoundEngine();


// --- CANVAS CONFETTI & PARTICLES ENGINE ---
const canvas = document.getElementById("confetti-canvas");
const ctx = canvas.getContext("2d");

let particles = [];
let animationFrameId = null;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

class ConfettiParticle {
    constructor(x, y, isBig = false) {
        this.x = x;
        this.y = y;
        this.size = isBig ? Math.random() * 12 + 10 : Math.random() * 6 + 4;
        this.color = ["#9f60ff", "#00f0ff", "#ffb300", "#00ff66", "#ff3366"][Math.floor(Math.random() * 5)];
        this.vx = (Math.random() - 0.5) * (isBig ? 15 : 10);
        this.vy = (Math.random() - 0.7) * (isBig ? 25 : 15);
        this.gravity = 0.4;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 10;
        this.opacity = 1.0;
        this.decay = Math.random() * 0.015 + 0.01;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotationSpeed;
        this.opacity -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        
        // Random shapes: squares, circles, triangles
        if (this.size > 10) {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }
        
        ctx.restore();
    }
}

function triggerBurst(x, y, count = 30, isBig = false) {
    for (let i = 0; i < count; i++) {
        particles.push(new ConfettiParticle(x, y, isBig));
    }
    if (!animationFrameId) {
        tick();
    }
}

function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles = particles.filter(p => p.opacity > 0);
    
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    if (particles.length > 0) {
        animationFrameId = requestAnimationFrame(tick);
    } else {
        animationFrameId = null;
    }
}


// --- CORE GAME MECHANICS & CALCULATION ---

// Streaks and Date Check
function checkStreakOnLoad() {
    const todayStr = getTodayString();
    const lastActive = state.character.lastActiveDate;

    if (!lastActive) {
        state.character.streak = 0;
        return;
    }

    const diffDays = getDaysDifference(lastActive, todayStr);
    
    if (diffDays > 1) {
        // Broke streak
        logToHistory(`За съжаление пропусна дни. Серията ти от ${state.character.streak} дни бе нулирана.`, "willpower", 0, 0);
        state.character.streak = 0;
    }
    
    // Auto reset Daily quests if we have transitioned to a new day
    if (diffDays >= 1) {
        state.quests.forEach(q => {
            if (q.type === 'daily') {
                q.completed = false;
            }
        });
        logToHistory(`Нов ден започна! Ежедневните ти мисии бяха обновени.`, "willpower", 0, 0);
    }
    
    saveState();
}

function getTodayString() {
    const d = new Date();
    // format YYYY-MM-DD
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
}

function getDaysDifference(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    // Remove time components
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);
    const diffTime = d2 - d1;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Reward Constants based on difficulty
const DIFF_REWARDS = {
    easy: { xp: 5, gold: 3, stat: 0.1 },
    medium: { xp: 15, gold: 8, stat: 0.3 },
    hard: { xp: 35, gold: 20, stat: 0.8 },
    epic: { xp: 80, gold: 50, stat: 2.0 }
};

// Complete a Quest
function completeQuest(id, isChecked) {
    const quest = state.quests.find(q => q.id === id);
    if (!quest) return;

    if (isChecked) {
        quest.completed = true;
        const reward = DIFF_REWARDS[quest.difficulty];
        
        // Add Rewards
        state.character.xp += reward.xp;
        state.character.gold += reward.gold;
        state.character.stats[quest.category] = parseFloat((state.character.stats[quest.category] + reward.stat).toFixed(1));

        // History Log
        logToHistory(`Завършена мисия: "${quest.text}"`, quest.category, reward.xp, reward.gold);

        // Sound & Confetti
        soundEngine.play('success');
        
        // Streak Logic: If we complete first quest of a new day
        const todayStr = getTodayString();
        if (state.character.lastActiveDate !== todayStr) {
            state.character.streak += 1;
            state.character.lastActiveDate = todayStr;
            triggerBurst(window.innerWidth / 2, window.innerHeight * 0.3, 40); // center burst
        }

        // Check for Level Up
        checkLevelUp();
    } else {
        // Undo complete (reduce XP, gold and stat)
        quest.completed = false;
        const reward = DIFF_REWARDS[quest.difficulty];
        
        state.character.xp = Math.max(0, state.character.xp - reward.xp);
        state.character.gold = Math.max(0, state.character.gold - reward.gold);
        state.character.stats[quest.category] = parseFloat(Math.max(10, state.character.stats[quest.category] - reward.stat).toFixed(1));
        
        logToHistory(`Отменено изпълнение на: "${quest.text}"`, quest.category, -reward.xp, -reward.gold);
        soundEngine.play('click');
    }

    checkAchievements();
    saveState();
    updateUI();
}

function checkLevelUp() {
    let leveledUp = false;
    let oldLevel = state.character.level;

    while (state.character.xp >= state.character.nextLevelXp) {
        state.character.xp -= state.character.nextLevelXp;
        state.character.level += 1;
        state.character.nextLevelXp = state.character.level * 100;
        state.character.gold += 15; // level up gold bonus
        
        // Bump all stats slightly
        Object.keys(state.character.stats).forEach(stat => {
            state.character.stats[stat] = parseFloat((state.character.stats[stat] + 0.5).toFixed(1));
        });

        leveledUp = true;
    }

    if (leveledUp) {
        logToHistory(`LEVEL UP! Достигна ниво ${state.character.level}!`, "willpower", 0, 15);
        showLevelUpModal(oldLevel, state.character.level);
        soundEngine.play('levelup');
        // Huge screen burst
        triggerBurst(window.innerWidth / 2, window.innerHeight / 2, 100, true);
    }
}

// Log actions
function logToHistory(text, category, xpGained, goldGained) {
    const entry = {
        id: "hist_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toLocaleString('bg-BG'),
        text,
        category,
        xpGained,
        goldGained
    };
    state.history.unshift(entry); // add to top
    // cap history at 100 logs
    if (state.history.length > 100) state.history.pop();
}

// Buy Shop Reward
function buyReward(id) {
    const item = state.shop.find(s => s.id === id);
    if (!item) return;

    if (state.character.gold >= item.cost) {
        state.character.gold -= item.cost;
        item.purchasedCount = (item.purchasedCount || 0) + 1;
        
        logToHistory(`Купена награда: "${item.text}"`, "willpower", 0, -item.cost);
        soundEngine.play('buy');
        
        // Tiny splash of gold particles
        triggerBurst(window.innerWidth / 2, window.innerHeight * 0.8, 15);
        
        checkAchievements();
        saveState();
        updateUI();
    } else {
        alert("Нямаш достатъчно Злато! Изпълни още мисии.");
    }
}

// Check Achievements Unlocking
function checkAchievements() {
    let newlyUnlocked = false;

    state.achievements.forEach(ach => {
        if (ach.unlocked) return;

        let conditionMet = false;

        switch (ach.id) {
            case "a_first_step":
                // Finished at least one quest
                const completedCount = state.quests.filter(q => q.completed).length;
                const historyCount = state.history.filter(h => h.text.startsWith("Завършена мисия")).length;
                if (completedCount > 0 || historyCount > 0) conditionMet = true;
                break;
            case "a_level_5":
                if (state.character.level >= 5) conditionMet = true;
                break;
            case "a_streak_3":
                if (state.character.streak >= 3) conditionMet = true;
                break;
            case "a_streak_7":
                if (state.character.streak >= 7) conditionMet = true;
                break;
            case "a_stat_15":
                const maxStatVal = Math.max(...Object.values(state.character.stats));
                if (maxStatVal >= 15.0) conditionMet = true;
                break;
            case "a_gold_100":
                if (state.character.gold >= 100) conditionMet = true;
                break;
            case "a_shop_spender":
                const totalPurchased = state.shop.reduce((acc, curr) => acc + (curr.purchasedCount || 0), 0);
                if (totalPurchased >= 5) conditionMet = true;
                break;
        }

        if (conditionMet) {
            ach.unlocked = true;
            ach.dateUnlocked = new Date().toLocaleDateString('bg-BG');
            newlyUnlocked = true;
            
            // Log it
            logToHistory(`ОТКЛЮЧЕНО ПОСТИЖЕНИЕ: "${ach.title}"`, "charisma", 20, 0);
            // Reward extra XP!
            state.character.xp += 20;
            
            // Visual notification banner could go here or trigger a burst
            triggerBurst(window.innerWidth / 2, window.innerHeight * 0.2, 25);
        }
    });

    if (newlyUnlocked) {
        checkLevelUp();
    }
}


// --- UI RENDERING & BINDINGS ---

// DOM Elements
const elCharName = document.getElementById("char-name");
const elCharLevel = document.getElementById("char-level");
const elXpText = document.getElementById("xp-text");
const elXpFill = document.getElementById("xp-fill");
const elCharGold = document.getElementById("char-gold");
const elCharStreak = document.getElementById("char-streak");
const elAvatar = document.getElementById("char-avatar");

// Stats Elements
const elStatStrength = document.getElementById("stat-strength");
const elStatIntellect = document.getElementById("stat-intellect");
const elStatCharisma = document.getElementById("stat-charisma");
const elStatWillpower = document.getElementById("stat-willpower");

// Main UI Update
function updateUI() {
    // 1. Sidebar Profile
    elCharName.innerText = state.character.name;
    elCharLevel.innerText = state.character.level;
    elXpText.innerText = `${state.character.xp} / ${state.character.nextLevelXp}`;
    
    const xpPercent = Math.min(100, (state.character.xp / state.character.nextLevelXp) * 100);
    elXpFill.style.width = `${xpPercent}%`;
    
    elCharGold.innerText = state.character.gold;
    elCharStreak.innerText = state.character.streak;
    
    const avIndex = state.character.avatarIndex || 0;
    elAvatar.src = "data:image/svg+xml;utf8," + encodeURIComponent(AVATARS[avIndex]);

    // 2. Stats
    elStatStrength.innerText = state.character.stats.strength.toFixed(1);
    elStatIntellect.innerText = state.character.stats.intellect.toFixed(1);
    elStatCharisma.innerText = state.character.stats.charisma.toFixed(1);
    elStatWillpower.innerText = state.character.stats.willpower.toFixed(1);

    // 3. Render Tabs
    renderLists();
    renderQuests();
    renderShop();
    renderAchievements();
    renderHistory();
}

// Render Quests List
const questsListEl = document.getElementById("quests-list");
const emptyQuestsEl = document.getElementById("empty-quests");
let currentFilter = "all";

function renderQuests() {
    questsListEl.innerHTML = "";
    
    const filtered = state.quests.filter(q => {
        if (q.listId !== state.activeListId) return false;
        if (currentFilter === "all") return true;
        return q.type === currentFilter;
    });

    if (filtered.length === 0) {
        emptyQuestsEl.classList.remove("hidden");
    } else {
        emptyQuestsEl.classList.add("hidden");
        
        filtered.forEach(q => {
            const li = document.createElement("li");
            li.className = `quest-item ${q.completed ? 'completed' : ''}`;
            
            const categoryLabels = {
                strength: "💪 Сила",
                intellect: "📚 Интелект",
                charisma: "💬 Харизма",
                willpower: "🛡️ Воля"
            };

            const difficultyLabels = {
                easy: "Лесна",
                medium: "Средна",
                hard: "Трудна",
                epic: "Епична"
            };

            li.innerHTML = `
                <div class="quest-item-left">
                    <label class="quest-checkbox-wrapper" onclick="event.stopPropagation();">
                        <input type="checkbox" ${q.completed ? 'checked' : ''} onchange="completeQuest('${q.id}', this.checked)">
                        <span class="checkmark">
                            <i class="fa-solid fa-check"></i>
                        </span>
                    </label>
                    <div class="quest-text-details">
                        <span class="quest-title">${escapeHTML(q.text)}</span>
                        <div class="quest-badges">
                            <span class="badge badge-type">${q.type === 'daily' ? 'Ежедневна' : q.type === 'epic' ? 'Епична' : 'Еднократна'}</span>
                            <span class="badge badge-category">${categoryLabels[q.category]}</span>
                            <span class="badge badge-difficulty badge-${q.difficulty}">${difficultyLabels[q.difficulty]}</span>
                        </div>
                    </div>
                </div>
                <div class="quest-item-actions">
                    <button class="btn-delete-quest" onclick="deleteQuest('${q.id}')" title="Изтрий мисия"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            questsListEl.appendChild(li);
        });
    }
}

// Delete Quest
window.deleteQuest = function(id) {
    if (confirm("Сигурен ли си, че искаш да изтриеш тази мисия?")) {
        state.quests = state.quests.filter(q => q.id !== id);
        saveState();
        updateUI();
        soundEngine.play('click');
    }
};

// Render Shop
const shopGridEl = document.getElementById("shop-grid");
function renderShop() {
    shopGridEl.innerHTML = "";
    
    state.shop.forEach(item => {
        const div = document.createElement("div");
        div.className = "shop-card";
        
        const count = item.purchasedCount || 0;
        const purchaseText = count > 0 ? `<span class="purchased-badge">Купено: ${count} пъти</span>` : ``;

        div.innerHTML = `
            <div class="shop-card-top">
                <h4>${escapeHTML(item.text)}</h4>
                ${purchaseText}
            </div>
            <div class="shop-card-bottom">
                <div class="reward-cost-tag">
                    <i class="fa-solid fa-coins"></i> ${item.cost}
                </div>
                <button class="btn btn-gold btn-sm ${state.character.gold < item.cost ? 'disabled' : ''}" onclick="buyReward('${item.id}')">
                    <i class="fa-solid fa-cart-shopping"></i> Купи
                </button>
            </div>
        `;
        shopGridEl.appendChild(div);
    });
}

// Render Achievements
const achievementsGridEl = document.getElementById("achievements-grid");
function renderAchievements() {
    achievementsGridEl.innerHTML = "";
    
    state.achievements.forEach(ach => {
        const div = document.createElement("div");
        div.className = `achievement-card ${ach.unlocked ? 'unlocked' : ''}`;
        
        div.innerHTML = `
            <div class="achievement-icon-box">
                <i class="fa-solid ${ach.icon}"></i>
            </div>
            <div class="achievement-details">
                <h4>${escapeHTML(ach.title)}</h4>
                <p>${escapeHTML(ach.desc)}</p>
                ${ach.unlocked ? `<span class="achievement-date"><i class="fa-solid fa-circle-check"></i> ${ach.dateUnlocked}</span>` : ''}
            </div>
        `;
        achievementsGridEl.appendChild(div);
    });
}

// Render History Log
const historyListEl = document.getElementById("history-list");
const emptyHistoryEl = document.getElementById("empty-history");
function renderHistory() {
    historyListEl.innerHTML = "";
    
    if (state.history.length === 0) {
        emptyHistoryEl.classList.remove("hidden");
    } else {
        emptyHistoryEl.classList.add("hidden");
        
        state.history.forEach(entry => {
            const tr = document.createElement("tr");
            
            const categoryLabels = {
                strength: "💪 Сила",
                intellect: "📚 Интелект",
                charisma: "💬 Харизма",
                willpower: "🛡️ Воля"
            };

            let xpTag = "";
            if (entry.xpGained > 0) xpTag = `<span class="history-xp-gained">+${entry.xpGained} XP</span>`;
            else if (entry.xpGained < 0) xpTag = `<span class="history-xp-gained" style="color: var(--clr-red)">${entry.xpGained} XP</span>`;

            let goldTag = "";
            if (entry.goldGained > 0) goldTag = `<span class="history-gold-gained">+${entry.goldGained} Gold</span>`;
            else if (entry.goldGained < 0) goldTag = `<span class="history-gold-gained" style="color: var(--clr-red)">${entry.goldGained} Gold</span>`;

            const separator = (xpTag && goldTag) ? " / " : "";

            tr.innerHTML = `
                <td><small>${entry.timestamp}</small></td>
                <td><strong>${escapeHTML(entry.text)}</strong></td>
                <td><span class="badge badge-category">${categoryLabels[entry.category] || "Няма"}</span></td>
                <td>${xpTag}${separator}${goldTag}</td>
            `;
            historyListEl.appendChild(tr);
        });
    }
}

// Helper to escape HTML characters
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}


// --- DOM INTERACTIVE ACTIONS ---

// Sound Toggle
const soundToggleBtn = document.getElementById("sound-toggle");
const soundIcon = document.getElementById("sound-icon");

soundToggleBtn.addEventListener("click", () => {
    state.settings.soundOn = !state.settings.soundOn;
    saveState();
    updateSoundIcon();
    soundEngine.play('click');
});

function updateSoundIcon() {
    if (state.settings.soundOn) {
        soundIcon.className = "fa-solid fa-volume-high";
    } else {
        soundIcon.className = "fa-solid fa-volume-xmark";
    }
}

// Reset Data
const resetDataBtn = document.getElementById("reset-data");
resetDataBtn.addEventListener("click", () => {
    if (confirm("ВНИМАНИЕ! Сигурен ли си, че искаш да изтриеш целия си прогрес? Това е необратимо!")) {
        localStorage.removeItem("lifequest_state");
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        saveState();
        updateUI();
        soundEngine.play('click');
        alert("Данните са нулирани успешно.");
    }
});

// Edit Profile Name
elCharName.addEventListener("click", () => {
    const newName = prompt("Въведи име на своя Герой:", state.character.name);
    if (newName && newName.trim() !== "") {
        state.character.name = newName.trim();
        saveState();
        updateUI();
        soundEngine.play('click');
    }
});

// Tab Switching
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        
        tabBtns.forEach(b => b.classList.remove("active"));
        tabPanels.forEach(p => p.classList.remove("active"));
        
        btn.classList.add("active");
        document.getElementById(`tab-${tabId}`).classList.add("active");
        
        soundEngine.play('click');
    });
});

// Quest Filters Clicking
const filterBtns = document.querySelectorAll(".filter-btn");
filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.getAttribute("data-filter");
        renderQuests();
        soundEngine.play('click');
    });
});

// Collapsible Add Quest Form
const btnToggleAddQuest = document.getElementById("btn-toggle-add-quest");
const addQuestForm = document.getElementById("add-quest-form");

btnToggleAddQuest.addEventListener("click", () => {
    addQuestForm.classList.toggle("hidden");
    soundEngine.play('click');
    if (!addQuestForm.classList.contains("hidden")) {
        document.getElementById("quest-text").focus();
    }
});

// Submit Add Quest
addQuestForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const text = document.getElementById("quest-text").value.trim();
    const type = document.getElementById("quest-type").value;
    const category = document.getElementById("quest-category").value;
    const difficulty = document.getElementById("quest-difficulty").value;
    
    if (text === "") return;

    const newQuest = {
        id: "q_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        text,
        type,
        category,
        difficulty,
        completed: false,
        dateCreated: new Date().toISOString(),
        listId: state.activeListId
    };

    state.quests.push(newQuest);
    saveState();
    
    // reset form inputs
    document.getElementById("quest-text").value = "";
    addQuestForm.classList.add("hidden");
    
    updateUI();
    soundEngine.play('click');
});

// Collapsible Add Reward Form
const btnToggleAddReward = document.getElementById("btn-toggle-add-reward");
const addRewardForm = document.getElementById("add-reward-form");

btnToggleAddReward.addEventListener("click", () => {
    addRewardForm.classList.toggle("hidden");
    soundEngine.play('click');
    if (!addRewardForm.classList.contains("hidden")) {
        document.getElementById("reward-text").focus();
    }
});

// Submit Add Reward
addRewardForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const text = document.getElementById("reward-text").value.trim();
    const cost = parseInt(document.getElementById("reward-cost").value);
    
    if (text === "" || isNaN(cost) || cost <= 0) return;

    const newReward = {
        id: "s_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        text,
        cost,
        purchasedCount: 0,
        system: false
    };

    state.shop.push(newReward);
    saveState();
    
    // reset form
    document.getElementById("reward-text").value = "";
    document.getElementById("reward-cost").value = "15";
    addRewardForm.classList.add("hidden");
    
    updateUI();
    soundEngine.play('click');
});

// Clear History Log
const btnClearHistory = document.getElementById("clear-history");
btnClearHistory.addEventListener("click", () => {
    if (confirm("Искаш ли да изтриеш цялата си история?")) {
        state.history = [];
        saveState();
        updateUI();
        soundEngine.play('click');
    }
});

// Level Up Modal Close
const levelupModal = document.getElementById("levelup-modal");
const btnCloseLevelup = document.getElementById("btn-close-levelup");
const modalOldLevel = document.getElementById("modal-old-level");
const modalNewLevel = document.getElementById("modal-new-level");

function showLevelUpModal(oldLvl, newLvl) {
    modalOldLevel.innerText = oldLvl;
    modalNewLevel.innerText = newLvl;
    levelupModal.classList.remove("hidden");
}

btnCloseLevelup.addEventListener("click", () => {
    levelupModal.classList.add("hidden");
    soundEngine.play('click');
});

// Avatar Change Modals
const avatarModal = document.getElementById("avatar-modal");
const btnChangeAvatar = document.getElementById("change-avatar");
const btnCloseAvatar = document.getElementById("btn-close-avatar");
const avatarOptionsGrid = document.getElementById("avatar-options-grid");

btnChangeAvatar.addEventListener("click", () => {
    // Populate avatars grid
    avatarOptionsGrid.innerHTML = "";
    AVATARS.forEach((svgStr, idx) => {
        const div = document.createElement("div");
        div.className = `avatar-option-btn ${state.character.avatarIndex === idx ? 'selected' : ''}`;
        div.innerHTML = svgStr;
        div.addEventListener("click", () => {
            state.character.avatarIndex = idx;
            saveState();
            updateUI();
            soundEngine.play('click');
            avatarModal.classList.add("hidden");
        });
        avatarOptionsGrid.appendChild(div);
    });
    avatarModal.classList.remove("hidden");
    soundEngine.play('click');
});

btnCloseAvatar.addEventListener("click", () => {
    avatarModal.classList.add("hidden");
    soundEngine.play('click');
});

// Render Custom Task Lists Tabs
const listTabsEl = document.getElementById("list-tabs");

function renderLists() {
    listTabsEl.innerHTML = "";
    
    state.lists.forEach(list => {
        const div = document.createElement("div");
        div.className = `list-tab-btn ${state.activeListId === list.id ? 'active' : ''}`;
        div.onclick = () => selectList(list.id);
        
        let deleteBtnHtml = "";
        if (list.id !== "default") {
            deleteBtnHtml = `
                <button class="btn-delete-list" onclick="event.stopPropagation(); deleteList('${list.id}')" title="Изтрий списък">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        }
        
        div.innerHTML = `
            <span>${escapeHTML(list.name)}</span>
            ${deleteBtnHtml}
        `;
        listTabsEl.appendChild(div);
    });
}

// Select a List
window.selectList = function(id) {
    state.activeListId = id;
    saveState();
    updateUI();
    soundEngine.play('click');
};

// Create a New List
window.createList = function(name) {
    if (!name || name.trim() === "") return;
    
    const newList = {
        id: "list_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        name: name.trim()
    };
    
    state.lists.push(newList);
    state.activeListId = newList.id;
    
    logToHistory(`Създаден нов списък: "${newList.name}"`, "charisma", 0, 0);
    saveState();
    updateUI();
    soundEngine.play('success');
};

// Delete a List
window.deleteList = function(id) {
    if (id === "default") return;
    
    const list = state.lists.find(l => l.id === id);
    if (!list) return;
    
    if (confirm(`Сигурен ли си, че искаш да изтриеш списъка "${list.name}" и ВСИЧКИ задачи в него?`)) {
        state.lists = state.lists.filter(l => l.id !== id);
        state.quests = state.quests.filter(q => q.listId !== id);
        
        if (state.activeListId === id) {
            state.activeListId = "default";
        }
        
        logToHistory(`Изтрит списък: "${list.name}"`, "willpower", 0, 0);
        saveState();
        updateUI();
        soundEngine.play('click');
    }
};

// Add List Button Click listener
const btnAddList = document.getElementById("btn-add-list");
btnAddList.addEventListener("click", () => {
    const listName = prompt("Въведи име за новия списък със задачи:");
    if (listName && listName.trim() !== "") {
        createList(listName);
    }
});

// Global functions exposed for event listeners in elements
window.completeQuest = completeQuest;
window.buyReward = buyReward;
window.deleteList = deleteList;

// Initialize app
function initApp() {
    checkStreakOnLoad();
    updateSoundIcon();
    updateUI();
}

initApp();
