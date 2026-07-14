import { Octokit } from "https://esm.sh/octokit";

// Application state parameters
let state = {
  simulationMode: 'single', // 'single' or 'tournament'
  characters: [],
  battles: [],
  selectedFighter1: null,
  selectedFighter2: null,
  
  // Active Bracket Tournament parameters
  tournament: {
    size: 8,
    seeds: [], // Array of string names
    rounds: [], // Array of arrays of matches
    currentRoundIndex: 0,
    currentMatchIndex: 0,
    active: false,
    resolutionLog: []
  },

  settings: {
    geminiApiKey: "",
    githubPat: "",
    githubOwner: "crunchycodes",
    githubRepo: "Battle-Lab",
    githubBranch: "main",
    githubPath: "roster.json"
  }
};

// Prepopulated seed dataset containing rich parameters
const initialSeedCharacters = [
  {
    id: "sonic-hedgehog",
    weight: "77 lbs",
    name: "Sonic the Hedgehog",
    realName: "Sonic",
    mediaSource: "Sonic Franchise",
    variant: "Default",
    powers: ["Super Speed (Mach 5)", "Homing Attack", "Spin Dash", "Chaos Energy Channeling"],
    imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=300",
    bio: "The fastest thing alive. Sonic is an easygoing, adventure-loving speedster from the planet Mobius who fights tirelessly for freedom and friends against Dr. Eggman.",
    personality: "Cocky, quick-witted, kindhearted, and completely relentless when his friends are threatened."
  },
  {
    id: "shadow-hedgehog",
    weight: "77 lbs",
    name: "Shadow the Hedgehog",
    realName: "Shadow",
    mediaSource: "Sonic Franchise",
    variant: "Chaos Control",
    powers: ["Chaos Control", "Chaos Spear", "Superhuman Speed", "Incredible Durability"],
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=300",
    bio: "The Ultimate Life Form. Created aboard the Space Colony Ark by Professor Gerald Robotnik, Shadow wields chaos energy directly with deadly combative precision.",
    personality: "Brooding, quiet, intensely focused, and possesses a zero-nonsense combative attitude."
  },
  {
    id: "kirby-nintendo",
    weight: "1 lb",
    name: "Kirby",
    realName: "Kirby",
    mediaSource: "Nintendo",
    variant: "Default",
    powers: ["Inhale & Copy", "Infinite Pocket Dimension", "Warp Star Flight", "Ultra Sword"],
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=300",
    bio: "A round, pink hero from Dream Land who possesses the legendary power to inhale opponents, copy their abilities, and conquer cosmos-level threats.",
    personality: "Cheerful, innocent, loves food and sleep, but becomes an unstoppable defender of the universe when triggered."
  },
  {
    id: "samus-aran",
    weight: "198 lbs",
    name: "Samus Aran",
    realName: "Samus Aran",
    mediaSource: "Metroid",
    variant: "Varia Suit",
    powers: ["Arm Cannon Beam Grid", "Morph Ball & Bombs", "Screw Attack", "Grapple Beam"],
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300",
    bio: "The premier intergalactic bounty hunter. Orphaned at a young age, she was raised by the mysterious Chozo race who modified her DNA to build the ultimate soldier.",
    personality: "Pragmatic, cool under crisis, highly analytical, and silent unless absolutely necessary."
  }
];

const initialSeedBattles = [
  {
    id: "match-sonic-shadow",
    fighter1Id: "sonic-hedgehog",
    fighter2Id: "shadow-hedgehog",
    phase1: "Sonic starts circling Shadow at near-light velocities, creating a massive vacuum. Shadow stands absolutely still, crossed arms, waiting for the perfect microsecond.",
    phase2: "As Sonic strikes with a Homing Attack, Shadow speaks the words: 'Chaos Control!' Time freezes. Shadow calmly teleports behind Sonic and launches a heavy Chaos Spear.",
    phase3Climax: "Time resumes. Sonic takes the direct hit but uses his momentum to trigger a high-velocity Spin Dash, clashing with Shadow's Chaos Shields in an blinding explosion.",
    predictedWinner: "Sonic the Hedgehog",
    winProbability: "52%",
    verdictSummary: "A razors-edge split. Sonic's slightly higher adaptive mobility allows him to recover from Shadow's time-dilation strikes by exploiting localized kinetic force fields.",
    timestamp: 1782394389124,
    battleSceneImgUrl: "",
    customBattleground: "",
    customRules: "",
    customHandicaps: ""
  }
];

// Pop culture backup dictionary
const quickPopCultureNames = [
  "A-Train", "Aang", "Aku", "Akuma", "Albert Wesker", "All Might", "Alucard", "Anakin Skywalker",
  "Ant-Man", "Azula", "Baki Hanma", "Batman", "Beast Boy", "Ben 10", "Bowser", "Captain America",
  "Chun-Li", "Cloud Strife", "Dante", "Darkseid", "Deadpool", "Deathstroke", "Deku", "Denji",
  "Doctor Doom", "Doctor Strange", "Donkey Kong", "Dr. Eggman", "Edward Elric", "Eraserhead",
  "Eren Jaeger", "Ezio Auditore da Firenze", "Frieren", "Frieza", "Ganondorf", "Garou",
  "Geralt of Rivia", "Giorno Giovanna", "Goku", "Gon", "Guts", "Hellboy", "Himiko Toga",
  "Hisoka Morow", "Homelander", "Ichigo Kurosaki", "Inosuke", "Invincible", "Iron Man",
  "Itachi Uchiha", "Jake the Dog", "Jin Kazama", "Jotaro Kujo", "Kakashi Hatake", "Kaneki",
  "Kazuya Mishima", "Kenpachi Zaraki", "Killua Zoldyck", "Kirby", "Kratos", "Leon S. Kennedy",
  "Levi Ackerman", "Link", "Liu Kang", "Luke Skywalker", "Madara Uchiha", "Magneto",
  "Makima", "Mario", "Master Chief", "Mega Man", "Meruem", "Monkey D. Luffy", "Muzan Kibutsuji",
  "Naruto Uzumaki", "Natsu Dragneel", "Nezuko Kamado", "Omni-Man", "Overhaul", "Pac-Man",
  "Piccolo", "Pikachu", "Power", "Raiden", "Reptile", "Reverse Flash", "Roronoa Zoro", "Ryu",
  "Saitama", "Samurai Jack", "Samus Aran", "Sasuke Uchiha", "Satoru Gojo", "Scorpion",
  "Sephiroth", "Shadow", "Shao Kahn", "Shigaraki", "Shoto Todoroki", "Solid Snake",
  "Sonic the Hedgehog", "Sousuke Aizen", "Spawn", "Spider-Man", "Starscourge Radahn",
  "Sub-Zero", "Sukuna", "Superman", "Tails", "Tanjiro Kamado", "Tatsumaki", "Thanos",
  "Thor", "Toji Fushiguro", "Toph Beifong", "Vegeta", "Vergil", "Whitebeard", "Wolverine",
  "Yoda", "Yuji Itadori", "Yuta Okkotsu", "Zuko"
];

// Populate Datalists for both A/B Selection and Tournament Wizard
function populateFranchiseDropdowns() {
  const allNames = new Set(quickPopCultureNames);
  state.characters.forEach(c => allNames.add(c.name));

  const listA = document.getElementById("characters-list-a");
  const listB = document.getElementById("characters-list-b");

  if (listA) listA.innerHTML = "";
  if (listB) listB.innerHTML = "";

  Array.from(allNames).sort().forEach(name => {
    const option = `<option value="${name}"></option>`;
    if (listA) listA.insertAdjacentHTML("beforeend", option);
    if (listB) listB.insertAdjacentHTML("beforeend", option);
  });
}

// Auto-detect environments
function detectGithubEnvironment() {
  const loc = window.location;
  let owner = "crunchycodes";
  let repo = "Battle-Lab";
  let branch = "main";
  let path = "roster.json";

  if (loc.hostname.endsWith("github.io")) {
    owner = loc.hostname.split(".")[0];
    const pathParts = loc.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      repo = pathParts[0];
    }
  }

  state.settings.githubOwner = owner;
  state.settings.githubRepo = repo;
  state.settings.githubBranch = branch;
  state.settings.githubPath = path;

  const genUrl = `https://github.com/settings/tokens/new?scopes=public_repo&description=Nexus%20VS%20Battle%20Lab%20-%20${repo}`;
  const quickLink = document.getElementById("quick-pat-link");
  if (quickLink) quickLink.href = genUrl;

  const dOwner = document.getElementById("detected-github-owner");
  const dRepo = document.getElementById("detected-github-repo");
  const dBranch = document.getElementById("detected-github-branch");
  const dPath = document.getElementById("detected-github-path");

  if (dOwner) dOwner.textContent = owner;
  if (dRepo) dRepo.textContent = repo;
  if (dBranch) dBranch.textContent = branch;
  if (dPath) dPath.textContent = path;

  const footerLink = document.getElementById("github-repo-link");
  if (footerLink) footerLink.href = `https://github.com/${owner}/${repo}`;
}

function loadStateFromLocalStorage() {
  const stored = localStorage.getItem("vs_battler_state");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.characters) state.characters = parsed.characters;
      if (parsed.battles) state.battles = parsed.battles;
    } catch (e) {
      showNotification("Failed to parse local sandbox data.", "error");
    }
  }
  
  const storedSettings = localStorage.getItem("vs_battler_settings");
  if (storedSettings) {
    try {
      state.settings = JSON.parse(storedSettings);
    } catch (e) {}
  }
}

function saveStateToLocalStorage() {
  localStorage.setItem("vs_battler_state", JSON.stringify({
    characters: state.characters,
    battles: state.battles
  }));
}

window.switchTab = function(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tabName}`).classList.remove('hidden');

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.remove('active-tab', 'text-white');
    btn.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`tab-btn-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.add('active-tab', 'text-white');
    activeBtn.classList.remove('text-slate-400');
  }

  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    btn.classList.remove('text-indigo-400');
    btn.classList.add('text-slate-400');
  });
  const activeMobBtn = document.getElementById(`mob-btn-${tabName}`);
  if (activeMobBtn) {
    activeMobBtn.classList.add('text-indigo-400');
    activeMobBtn.classList.remove('text-slate-400');
  }

  renderUI();
};

window.openSettingsModal = function() {
  detectGithubEnvironment();
  document.getElementById("settings-gemini-key").value = state.settings.geminiApiKey || "";
  document.getElementById("settings-github-pat").value = state.settings.githubPat || "";
  document.getElementById("modal-settings").classList.remove("hidden");
};

window.closeSettingsModal = function() {
  document.getElementById("modal-settings").classList.add("hidden");
};

window.togglePasswordVisibility = function(id) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
};

window.saveSystemSettings = async function() {
  state.settings.geminiApiKey = document.getElementById("settings-gemini-key").value.trim();
  state.settings.githubPat = document.getElementById("settings-github-pat").value.trim();

  localStorage.setItem("vs_battler_settings", JSON.stringify(state.settings));
  closeSettingsModal();
  showNotification("Settings updated locally!", "success");

  if (state.settings.githubPat) {
    await tryToSyncWithGitHub();
  } else {
    await publicReadFromGitHub();
  }
  renderUI();
};

async function publicReadFromGitHub() {
  const owner = state.settings.githubOwner || "crunchycodes";
  const repo = state.settings.githubRepo || "Battle-Lab";
  const branch = state.settings.githubBranch || "main";
  const path = state.settings.githubPath || "roster.json";

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}?t=${Date.now()}`;

  try {
    const response = await fetch(rawUrl);
    if (response.ok) {
      const parsed = await response.json();
      if (parsed.characters && parsed.battles) {
        state.characters = parsed.characters;
        state.battles = parsed.battles;
        saveStateToLocalStorage();
        updateSyncBadge("readonly");
        showNotification("Remote roster and battles pulled successfully.", "success");
        renderUI();
      }
    } else {
      throw new Error("Local sandbox database deployed.");
    }
  } catch (error) {
    updateSyncBadge("local");
    showNotification("Using offline combatant sandbox registry.", "info");
  }
}

async function tryToSyncWithGitHub(silent = false) {
  if (!state.settings.githubPat) {
    updateSyncBadge("readonly");
    return;
  }

  try {
    const octokit = new Octokit({ auth: state.settings.githubPat });
    
    const response = await octokit.rest.repos.getContent({
      owner: state.settings.githubOwner,
      repo: state.settings.githubRepo,
      path: state.settings.githubPath,
      ref: state.settings.githubBranch
    });

    if (response.data && response.data.content) {
      const decoded = atob(response.data.content.replace(/\s/g, ''));
      const parsed = JSON.parse(decoded);
      
      if (parsed.characters && parsed.battles) {
        state.characters = parsed.characters;
        state.battles = parsed.battles;
        saveStateToLocalStorage();
        updateSyncBadge("write");
        if (!silent) showNotification("Admin synchronized! Read & Write access confirmed.", "success");
        renderUI();
      }
    }
  } catch (error) {
    updateSyncBadge("readonly");
  }
}

async function commitToGitHub() {
  if (!state.settings.githubPat) {
    return;
  }

  try {
    const octokit = new Octokit({ auth: state.settings.githubPat });
    let sha = null;

    try {
      const fileMeta = await octokit.rest.repos.getContent({
        owner: state.settings.githubOwner,
        repo: state.settings.githubRepo,
        path: state.settings.githubPath,
        ref: state.settings.githubBranch
      });
      sha = fileMeta.data.sha;
    } catch (e) {
      // Expected for new files
    }

    const dataToUpload = {
      characters: state.characters,
      battles: state.battles
    };

    const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(dataToUpload, null, 2))));

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: state.settings.githubOwner,
      repo: state.settings.githubRepo,
      path: state.settings.githubPath,
      branch: state.settings.githubBranch,
      message: "Database Update: Synced new combatants and battles [Nexus VS]",
      content: contentBase64,
      sha: sha || undefined
    });

    updateSyncBadge("write");
    showNotification("Cloud synchronization complete!", "success");
  } catch (error) {
    updateSyncBadge("readonly");
    showNotification(`Failed to push updates: ${error.message}`, "error");
  }
}

function updateSyncBadge(mode) {
  const badge = document.getElementById("sync-badge");
  const fIndicator = document.getElementById("sync-footer-indicator");
  const fText = document.getElementById("sync-footer-text");

  if (mode === "write") {
    badge.className = "flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]";
    if (fIndicator) fIndicator.className = "h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse";
    if (fText) fText.textContent = "Admin Sync Enabled";
  } else if (mode === "readonly") {
    badge.className = "flex h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]";
    if (fIndicator) fIndicator.className = "h-1.5 w-1.5 rounded-full bg-indigo-500";
    if (fText) fText.textContent = "GitHub Feed Online";
  } else {
    badge.className = "flex h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]";
    if (fIndicator) fIndicator.className = "h-1.5 w-1.5 rounded-full bg-amber-500";
    if (fText) fText.textContent = "Offline Sandbox";
  }
}

function renderUI() {
  // Live Render previews
  renderFighterCardPreview(1, state.selectedFighter1);
  renderFighterCardPreview(2, state.selectedFighter2);

  // Render Roster Grid
  const grid = document.getElementById("roster-grid");
  if (grid) {
    grid.innerHTML = "";
    state.characters.forEach(char => {
      const card = document.createElement("div");
      card.className = "bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-lg relative overflow-hidden group";
      
      let powersHTML = char.powers.map(p => `<span class="text-[10px] bg-indigo-950/40 text-indigo-300 border border-indigo-900/40 px-2 py-0.5 rounded-md">${p}</span>`).join("");
      
      card.innerHTML = `
        <div>
          <div class="flex gap-4 items-start mb-4">
            <img src="${char.imageUrl}" class="w-16 h-16 rounded-xl object-cover bg-slate-800 border border-slate-800" onerror="this.src='https://placehold.co/150x150/1e1e30/ffffff?text=${encodeURIComponent(char.name)}'">
            <div>
              <h4 class="font-bold text-white text-base group-hover:text-indigo-400 transition">${char.name}</h4>
              <p class="text-[11px] text-slate-400"><i class="fa-solid fa-clapperboard text-[9px]"></i> ${char.mediaSource}</p>
              <p class="text-[10px] text-slate-500 mt-0.5">A.K.A. ${char.realName || 'Unknown'}</p>
            </div>
          </div>
          <p class="text-xs text-slate-300 line-clamp-3 mb-4 leading-relaxed">${char.bio || "No biography updated."}</p>
          
          <div class="space-y-3 pt-3 border-t border-slate-850">
            <div class="flex flex-wrap gap-1">
              ${powersHTML || '<span class="text-[10px] text-slate-500">No powers loaded</span>'}
            </div>
          </div>
        </div>

        <div class="flex gap-2 mt-5 pt-3 border-t border-slate-850/60">
          <button onclick="deleteCharacter('${char.id}')" class="text-xs bg-slate-950 hover:bg-red-950/20 text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg border border-slate-850 hover:border-red-900/30 transition flex-1" title="Delete Fighter">
            <i class="fa-solid fa-trash-can mr-1"></i> Purge
          </button>
          <button onclick="setAsActiveChallenger('${char.id}')" class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-2 rounded-lg transition flex-1">
            <i class="fa-solid fa-gamepad mr-1"></i> Pick Fighter
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // Render Match History
  const hGrid = document.getElementById("history-grid");
  if (hGrid) {
    hGrid.innerHTML = "";
    
    if (state.battles.length === 0) {
      hGrid.innerHTML = `
        <div class="text-center py-12 bg-slate-900 border border-dashed border-slate-800 rounded-3xl">
          <i class="fa-solid fa-database text-3xl text-slate-700 mb-3 block"></i>
          <p class="text-sm text-slate-400">No matches simulated yet. Head over to the battle arena!</p>
        </div>
      `;
      return;
    }

    const sortedBattles = [...state.battles].sort((a,b) => b.timestamp - a.timestamp);

    sortedBattles.forEach(match => {
      const f1 = state.characters.find(c => c.id === match.fighter1Id) || { name: match.fighter1Id || "Unknown" };
      const f2 = state.characters.find(c => c.id === match.fighter2Id) || { name: match.fighter2Id || "Unknown" };

      const box = document.createElement("div");
      box.className = "bg-slate-900 border border-slate-850 rounded-2xl p-6 hover:border-slate-800 transition shadow-md";
      
      box.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-850">
          <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-850">${new Date(match.timestamp).toLocaleDateString()}</span>
            <span class="text-xs text-indigo-400 font-bold uppercase tracking-wider"><i class="fa-solid fa-calculator"></i> AI RESOLVED</span>
          </div>
          <div class="text-xs font-semibold text-slate-300">
            Predicted Winner: <span class="text-emerald-400 font-bold">${match.predictedWinner} (${match.winProbability})</span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
          <div class="lg:col-span-4 flex items-center justify-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850/80">
            <div class="text-right">
              <h4 class="font-bold text-white text-sm">${f1.name}</h4>
              <span class="text-[10px] text-slate-400 block">${f1.mediaSource || ''}</span>
            </div>
            <span class="font-display italic text-slate-500 text-xs">vs</span>
            <div class="text-left">
              <h4 class="font-bold text-white text-sm">${f2.name}</h4>
              <span class="text-[10px] text-slate-400 block">${f2.mediaSource || ''}</span>
            </div>
          </div>

          <div class="lg:col-span-8 flex flex-col justify-center">
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Climax Analysis</p>
            <p class="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed italic">"${match.phase3Climax || match.phase2 || ''}"</p>
            <button onclick="playbackSavedBattle('${match.id}')" class="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center gap-1.5 mt-3.5 self-start">
              <i class="fa-solid fa-circle-play"></i> Replay Complete Fight Playback & Breakdown
            </button>
          </div>
        </div>
      `;
      hGrid.appendChild(box);
    });
  }
}

function renderFighterCardPreview(slot, contender) {
  const prefix = slot === 1 ? "f1" : "f2";
  if (!contender) {
    document.getElementById(`${prefix}-name`).textContent = "---";
    document.getElementById(`${prefix}-media`).textContent = "No Origin";
    document.getElementById(`${prefix}-variant`).textContent = "Variant: Default";
    document.getElementById(`${prefix}-bio`).textContent = "Click randomized selection tags or input values to draft.";
    document.getElementById(`${prefix}-img`).src = slot === 1 
      ? "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=300"
      : "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300";
    document.getElementById(`${prefix}-powers`).innerHTML = `<span class="text-[10px] bg-slate-950 text-slate-500 px-2 py-0.5 rounded border border-slate-850">Awaiting Selection</span>`;
    return;
  }

  document.getElementById(`${prefix}-name`).textContent = contender.name;
  document.getElementById(`${prefix}-media`).textContent = contender.mediaSource || "Origin Unknown";
  document.getElementById(`${prefix}-variant`).textContent = `Variant: ${contender.variant || "Default"}`;
  document.getElementById(`${prefix}-bio`).textContent = contender.bio || "No backstory information available.";
  document.getElementById(`${prefix}-img`).src = contender.imageUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300";

  const powersContainer = document.getElementById(`${prefix}-powers`);
  powersContainer.innerHTML = "";
  if (contender.powers && contender.powers.length > 0) {
    contender.powers.forEach(p => {
      const b = document.createElement("span");
      b.className = "text-[10px] bg-slate-950 text-slate-300 border border-slate-850 px-2 py-0.5 rounded";
      b.textContent = p;
      powersContainer.appendChild(b);
    });
  } else {
    powersContainer.innerHTML = `<span class="text-[10px] bg-slate-950 text-slate-500 px-2 py-0.5 rounded border border-slate-850">No specified abilities</span>`;
  }
}

window.setSimulationMode = function(mode) {
  state.simulationMode = mode;
  const singleBtn = document.getElementById("mode-single-btn");
  const tournamentBtn = document.getElementById("mode-tournament-btn");
  const singlePanel = document.getElementById("single-play-panel");
  const tournamentPanel = document.getElementById("tournament-play-panel");

  if (mode === 'single') {
    singleBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all bg-purple-600 text-white shadow-md shadow-purple-900/30";
    tournamentBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all text-slate-400 hover:text-slate-200";
    singlePanel.classList.remove("hidden");
    tournamentPanel.classList.add("hidden");
  } else {
    singleBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all text-slate-400 hover:text-slate-200";
    tournamentBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all bg-purple-600 text-white shadow-md shadow-purple-900/30";
    singlePanel.classList.add("hidden");
    tournamentPanel.classList.remove("hidden");
    adjustSeedingInputFields(); // Dynamic loading of seeds setup grid
  }
};

window.setFighter = function(slot, name, variant, franchise) {
  const targetSlot = slot === 'A' ? 1 : 2;
  const inputId = slot === 'A' ? 'fighter-a-input' : 'fighter-b-input';
  const variantId = slot === 'A' ? 'fighter-a-variant' : 'fighter-b-variant';
  const franchiseId = slot === 'A' ? 'fighter-a-franchise' : 'fighter-b-franchise';

  const resolvedName = name || '';
  const resolvedVariant = variant || 'Default';
  const resolvedFranchise = franchise || '';

  document.getElementById(inputId).value = resolvedName;
  document.getElementById(variantId).value = resolvedVariant;
  document.getElementById(franchiseId).value = resolvedFranchise;

  const matchedChar = state.characters.find(c => c.name.toLowerCase() === resolvedName.toLowerCase());

  if (matchedChar) {
    const clone = { ...matchedChar, variant: resolvedVariant, mediaSource: resolvedFranchise || matchedChar.mediaSource };
    if (targetSlot === 1) state.selectedFighter1 = clone;
    else state.selectedFighter2 = clone;
  } else {
    const customFighter = {
      id: `custom-${slot}-${Date.now()}`,
      name: resolvedName,
      variant: resolvedVariant,
      mediaSource: resolvedFranchise || 'Multiverse',
      powers: ["Inherent Capability Spectrum"],
      bio: "A custom multiverse contender registered directly on-the-fly for battle.",
      imageUrl: slot === 'A' 
        ? "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=300"
        : "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300"
    };
    if (targetSlot === 1) state.selectedFighter1 = customFighter;
    else state.selectedFighter2 = customFighter;
  }

  renderUI();
};

window.randomizeFighter = function(slot) {
  if (state.characters.length === 0) {
    showNotification("No fighters present in your database. Register characters in Roster tab first.", "warning");
    return;
  }
  const randChar = state.characters[Math.floor(Math.random() * state.characters.length)];
  window.setFighter(slot, randChar.name, randChar.variant || 'Default', randChar.mediaSource);
  showNotification(`Assigned random fighter to Slot ${slot}: ${randChar.name}`, "info");
};

window.setAsActiveChallenger = function(charId) {
  const char = state.characters.find(c => c.id === charId);
  if (!char) return;

  if (!state.selectedFighter1) {
    window.setFighter('A', char.name, char.variant || 'Default', char.mediaSource);
  } else {
    window.setFighter('B', char.name, char.variant || 'Default', char.mediaSource);
  }
  switchTab("arena");
};

function bindInputsToRealTimeState() {
  ['a', 'b'].forEach(slot => {
    const nameIn = document.getElementById(`fighter-${slot}-input`);
    const varIn = document.getElementById(`fighter-${slot}-variant`);
    const franIn = document.getElementById(`fighter-${slot}-franchise`);

    const handleInput = () => {
      const name = nameIn.value.trim();
      const variant = varIn.value.trim();
      const franchise = franIn.value.trim();

      if (!name) {
        if (slot === 'a') state.selectedFighter1 = null;
        else state.selectedFighter2 = null;
        renderUI();
        return;
      }

      const matched = state.characters.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (matched) {
        const updatedCopy = { ...matched, variant: variant || matched.variant, mediaSource: franchise || matched.mediaSource };
        if (slot === 'a') state.selectedFighter1 = updatedCopy;
        else state.selectedFighter2 = updatedCopy;
      } else {
        const virtualFighter = {
          id: `virtual-${slot}-${Date.now()}`,
          name: name,
          variant: variant || 'Default',
          mediaSource: franchise || 'Custom Source',
          powers: ["Dynamic Capability"],
          bio: "Confronting anomalies directly via custom parameters.",
          imageUrl: slot === 'a' 
            ? "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=300"
            : "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300"
        };
        if (slot === 'a') state.selectedFighter1 = virtualFighter;
        else state.selectedFighter2 = virtualFighter;
      }
      renderUI();
    };

    if (nameIn) nameIn.addEventListener('input', handleInput);
    if (varIn) varIn.addEventListener('input', handleInput);
    if (franIn) franIn.addEventListener('input', handleInput);
  });
}

window.autoSelectRandomMatch = function() {
  if (state.characters.length < 2) {
    showNotification("You need at least 2 fighters in your roster.", "warning");
    return;
  }
  let idx1 = Math.floor(Math.random() * state.characters.length);
  let idx2 = idx1;
  while (idx2 === idx1) {
    idx2 = Math.floor(Math.random() * state.characters.length);
  }
  window.setFighter('A', state.characters[idx1].name, state.characters[idx1].variant, state.characters[idx1].mediaSource);
  window.setFighter('B', state.characters[idx2].name, state.characters[idx2].variant, state.characters[idx2].mediaSource);
  showNotification("Randomized Matchup Ready!", "info");
};

window.toggleAdvancedOptions = function() {
  const panel = document.getElementById("advanced-options-panel");
  const arrow = document.getElementById("advanced-options-arrow");
  panel.classList.toggle("hidden");
  arrow.classList.toggle("rotate-180");
};

window.triggerRematch = function() {
  showNotification("Re-computing Rematch Sequence...", "info");
  window.runBattleSimulation();
};

window.resetArena = function() {
  document.getElementById("simulation-board").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.closeReport = function() {
  const board = document.getElementById("simulation-board");
  board.classList.add("hidden");
  document.getElementById("history-grid").classList.remove("hidden");
  document.getElementById("history-header").classList.remove("hidden");
};

window.openDisputeModal = function() {
  document.getElementById("dispute-input-text").value = "";
  document.getElementById("modal-dispute").classList.remove("hidden");
};

window.closeDisputeModal = function() {
  document.getElementById("modal-dispute").classList.add("hidden");
};

async function fetchWithRetry(url, options, retries = 2, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw err;
  }
}


/* ========================================================================================
   ================== INTERACTIVE ADVANCED TOURNAMENT CONTROLLER MODULE ===================
   ======================================================================================== */


// Adjust visual size seeding panels based on active dropdown value (4, 8, or 16)
window.adjustSeedingInputFields = function() {
  const size = parseInt(document.getElementById("bracket-size").value) || 8;
  const container = document.getElementById("seeding-slots-grid");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < size; i++) {
    const seedIndex = i + 1;
    const currentVal = state.tournament.seeds[i] || "";

    const card = document.createElement("div");
    card.className = "bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center gap-3 relative";
    
    card.innerHTML = `
      <div class="text-xs font-bold text-slate-500 w-12 text-right">Seed ${seedIndex}</div>
      <div class="relative flex-grow">
        <input type="text" id="ts-seed-input-${i}" value="${currentVal}" placeholder="Search or type fighter..." 
          class="w-full bg-slate-900 border border-slate-750 focus:border-indigo-500 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all" 
          list="characters-list-a">
      </div>
      <button onclick="randomizeIndividualSeedSlot(${i})" class="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 p-2 rounded-lg border border-slate-800 transition" title="Draft Random Fighter">
        <i class="fa-solid fa-dice text-xs"></i>
      </button>
    `;
    container.appendChild(card);
  }
};

window.randomizeIndividualSeedSlot = function(index) {
  const input = document.getElementById(`ts-seed-input-${index}`);
  if (!input) return;

  let sourceList = state.characters.map(c => c.name);
  if (sourceList.length === 0) {
    sourceList = quickPopCultureNames;
  }

  const randomFighter = sourceList[Math.floor(Math.random() * sourceList.length)];
  input.value = randomFighter;
  state.tournament.seeds[index] = randomFighter;
};

window.draftAllTournamentSlotsRandomly = function() {
  const size = parseInt(document.getElementById("bracket-size").value) || 8;
  let pool = state.characters.map(c => c.name);
  
  if (pool.length < size) {
    pool = [...pool, ...quickPopCultureNames];
  }

  // Shuffle pool
  pool.sort(() => 0.5 - Math.random());

  for (let i = 0; i < size; i++) {
    const input = document.getElementById(`ts-seed-input-${i}`);
    if (input) {
      const val = pool[i % pool.length];
      input.value = val;
      state.tournament.seeds[i] = val;
    }
  }
  showNotification(`Drafted ${size} random contenders into seeds!`, "success");
};

window.clearAllTournamentSlots = function() {
  const size = parseInt(document.getElementById("bracket-size").value) || 8;
  for (let i = 0; i < size; i++) {
    const input = document.getElementById(`ts-seed-input-${i}`);
    if (input) {
      input.value = "";
    }
  }
  state.tournament.seeds = [];
  showNotification("Cleared all seeding slots.", "info");
};


// Read the seeding inputs, bundle them, and generate bracket rounds
window.lockAndInitializeTournament = function() {
  const size = parseInt(document.getElementById("bracket-size").value) || 8;
  const seedList = [];

  for (let i = 0; i < size; i++) {
    const input = document.getElementById(`ts-seed-input-${i}`);
    const nameVal = input ? input.value.trim() : "";
    if (!nameVal) {
      showNotification(`Please fill in a fighter for Seed slot ${i+1}.`, "warning");
      return;
    }
    seedList.push(nameVal);
  }

  state.tournament.size = size;
  state.tournament.seeds = seedList;
  state.tournament.currentRoundIndex = 0;
  state.tournament.currentMatchIndex = 0;
  state.tournament.resolutionLog = [];
  
  // Generate Round 1 Match Nodes
  const r1Matches = [];
  for (let i = 0; i < size; i += 2) {
    r1Matches.push(createTournamentMatchNode(seedList[i], seedList[i+1]));
  }

  state.tournament.rounds = [ r1Matches ];

  // Create empty future rounds based on size
  let tempSize = size / 2;
  while (tempSize > 1) {
    tempSize = tempSize / 2;
    const emptyRound = [];
    for (let j = 0; j < tempSize; j++) {
      emptyRound.push(createTournamentMatchNode(null, null));
    }
    state.tournament.rounds.push(emptyRound);
  }

  state.tournament.active = true;

  // Update Visibility Deck Views
  document.getElementById("tournament-setup-deck").classList.add("hidden");
  document.getElementById("tournament-active-deck").classList.remove("hidden");

  renderActiveTournamentBracketGrid();
  
  const logBox = document.getElementById("tournament-resolution-log");
  if (logBox) logBox.innerHTML = `<span class="text-indigo-400 font-bold uppercase tracking-wider block mb-1">Grid Built! Ready for simulations.</span>`;

  showNotification(`Bracket successfully compiled with ${size} seeds!`, "success");
};

function createTournamentMatchNode(f1Name, f2Name) {
  return {
    matchId: `tmatch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    fighter1: f1Name,
    fighter2: f2Name,
    winner: null,
    simulated: false,
    phase1: "",
    phase2: "",
    phase3: "",
    verdict: "",
    winProb: ""
  };
}


// Draw tree structure beautifully inside scrollable element
window.renderActiveTournamentBracketGrid = function() {
  const container = document.getElementById("tournament-tree-grid");
  if (!container) return;

  container.innerHTML = "";
  
  const rounds = state.tournament.rounds;

  // Create flex container wrapping all round columns
  const wrapper = document.createElement("div");
  wrapper.className = "flex items-center gap-12 min-w-max select-none py-4";

  rounds.forEach((round, roundIdx) => {
    const roundCol = document.createElement("div");
    roundCol.className = "flex flex-col justify-around h-full space-y-6";

    // Generate round label
    let roundLabel = `Round ${roundIdx + 1}`;
    if (roundIdx === rounds.length - 1) roundLabel = "Championship Finals";
    else if (roundIdx === rounds.length - 2) roundLabel = "Semifinals";

    const header = document.createElement("div");
    header.className = "text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-1 mb-2";
    header.textContent = roundLabel;
    roundCol.appendChild(header);

    round.forEach((match, matchIdx) => {
      const matchCard = document.createElement("div");
      
      // Determine if this is the active pending match
      const isActive = (roundIdx === state.tournament.currentRoundIndex && matchIdx === state.tournament.currentMatchIndex);
      const activeClass = isActive 
        ? "ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/10 border-indigo-500" 
        : "border-slate-800/80 hover:border-slate-700";

      matchCard.className = `w-56 bg-slate-900 border rounded-xl p-3 space-y-2 transition relative ${activeClass}`;

      const f1Name = match.fighter1 || "TBD";
      const f2Name = match.fighter2 || "TBD";

      const f1Winner = match.winner === f1Name && match.simulated;
      const f2Winner = match.winner === f2Name && match.simulated;

      const f1Dim = match.simulated && match.winner !== f1Name ? "opacity-40 line-through" : "";
      const f2Dim = match.simulated && match.winner !== f2Name ? "opacity-40 line-through" : "";

      matchCard.innerHTML = `
        <div class="space-y-1.5 text-xs">
          <!-- Fighter A Slot -->
          <div class="flex items-center justify-between p-1 rounded ${f1Winner ? 'bg-emerald-950/20 text-emerald-300 font-bold border border-emerald-900/40' : ''} ${f1Dim}">
            <span class="truncate w-36 flex items-center gap-1.5">
              <i class="fa-solid fa-shield-halved text-[10px] text-indigo-400"></i>
              ${f1Name}
            </span>
            ${f1Winner ? '<i class="fa-solid fa-crown text-[10px] text-yellow-400"></i>' : ''}
          </div>

          <!-- Fighter B Slot -->
          <div class="flex items-center justify-between p-1 rounded ${f2Winner ? 'bg-emerald-950/20 text-emerald-300 font-bold border border-emerald-900/40' : ''} ${f2Dim}">
            <span class="truncate w-36 flex items-center gap-1.5">
              <i class="fa-solid fa-shield-halved text-[10px] text-pink-400"></i>
              ${f2Name}
            </span>
            ${f2Winner ? '<i class="fa-solid fa-crown text-[10px] text-yellow-400"></i>' : ''}
          </div>
        </div>

        <!-- Interactivity buttons inside match node -->
        <div class="pt-2 border-t border-slate-800 flex justify-between items-center">
          <span class="text-[9px] font-mono text-slate-500">M-${matchIdx+1}</span>
          ${match.simulated 
            ? `<button onclick="viewTournamentMatchReport(${roundIdx}, ${matchIdx})" class="text-[9px] text-indigo-400 hover:underline font-bold">Read Logs</button>` 
            : isActive 
              ? `<button onclick="simulateNextTournamentMatch()" class="text-[9px] text-amber-400 font-extrabold flex items-center gap-1 animate-pulse"><i class="fa-solid fa-play"></i> Run</button>` 
              : `<span class="text-[9px] text-slate-600 font-bold uppercase">Pending</span>`
          }
        </div>
      `;
      roundCol.appendChild(matchCard);
    });

    wrapper.appendChild(roundCol);
  });

  // Append Champion display column if the tournament has concluded
  const finalRound = rounds[rounds.length - 1];
  if (finalRound && finalRound[0] && finalRound[0].simulated) {
    const champCol = document.createElement("div");
    champCol.className = "flex flex-col justify-center items-center h-full space-y-3 pl-4 border-l border-slate-800/80";

    champCol.innerHTML = `
      <div class="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1">Championship Victor</div>
      <div class="bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-amber-500/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center w-48 relative overflow-hidden shadow-2xl">
        <div class="absolute -top-10 -right-10 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl"></div>
        <i class="fa-solid fa-crown text-3xl text-yellow-400 mb-2 animate-bounce"></i>
        <h4 class="font-display font-bold text-white text-sm tracking-wide truncate w-full">${finalRound[0].winner}</h4>
        <span class="text-[9px] text-indigo-300 uppercase tracking-widest font-extrabold mt-1">Universal Champion</span>
      </div>
    `;
    wrapper.appendChild(champCol);
  }

  container.appendChild(wrapper);
};

// View simulated match report in the primary UI viewport
window.viewTournamentMatchReport = function(roundIdx, matchIdx) {
  const match = state.tournament.rounds[roundIdx][matchIdx];
  if (!match || !match.simulated) return;

  const mockBattle = {
    id: match.matchId,
    fighter1Id: match.fighter1,
    fighter2Id: match.fighter2,
    phase1: match.phase1,
    phase2: match.phase2,
    phase3Climax: match.phase3,
    predictedWinner: match.winner,
    winProbability: match.winProb || "50%",
    verdictSummary: match.verdict,
    timestamp: Date.now(),
    customBattleground: `Tournament Round ${roundIdx + 1}`
  };

  // Force visual simulation tab active & playback
  switchTab("arena");
  document.getElementById("simulation-board").classList.remove("hidden");
  document.getElementById("combat-loader").classList.add("hidden");
  document.getElementById("fight-presentation").classList.remove("hidden");
  document.getElementById("simulation-board").scrollIntoView({ behavior: 'smooth' });
  playbackBattle(mockBattle);
};

// Reset tournament configuration and go back to seeding setup
window.resetTournamentWorkspace = function() {
  state.tournament.active = false;
  state.tournament.rounds = [];
  document.getElementById("tournament-setup-deck").classList.remove("hidden");
  document.getElementById("tournament-active-deck").classList.add("hidden");
  adjustSeedingInputFields();
  showNotification("Tournament setup interface unlocked.", "info");
};


// Simulate active pending match step-by-step
window.simulateNextTournamentMatch = async function() {
  if (!state.tournament.active) return;

  const rIdx = state.tournament.currentRoundIndex;
  const mIdx = state.tournament.currentMatchIndex;

  const roundMatches = state.tournament.rounds[rIdx];
  if (!roundMatches) {
    showNotification("No active round context loaded.", "error");
    return;
  }

  const match = roundMatches[mIdx];
  if (!match) {
    showNotification("No match context available.", "error");
    return;
  }

  if (match.simulated) {
    advanceTournamentIndices();
    return;
  }

  const f1Name = match.fighter1;
  const f2Name = match.fighter2;

  if (!f1Name || !f2Name) {
    showNotification("Match is pending future round conclusions.", "warning");
    return;
  }

  // Fetch full character parameters if in database
  const f1Obj = state.characters.find(c => c.name.toLowerCase() === f1Name.toLowerCase()) || { name: f1Name, powers: ["Unknown Multiverse Arts"] };
  const f2Obj = state.characters.find(c => c.name.toLowerCase() === f2Name.toLowerCase()) || { name: f2Name, powers: ["Unknown Multiverse Arts"] };

  showNotification(`Simulating matchup: ${f1Name} vs ${f2Name}...`, "info");

  // Generate duel reports using standard offline combat parameters or Gemini AI
  const apiKey = state.settings.geminiApiKey;
  let outcomeData = null;

  if (apiKey) {
    outcomeData = await callGeminiTournamentSimulation(f1Obj, f2Obj, rIdx + 1);
  }

  if (!outcomeData) {
    // Fall back to robust offline generator
    outcomeData = computeOfflineTournamentLog(f1Obj, f2Obj, rIdx + 1);
  }

  // Apply resolution to target match node
  match.winner = outcomeData.predictedWinner;
  match.simulated = true;
  match.phase1 = outcomeData.phase1Setup;
  match.phase2 = outcomeData.phase2MidGame;
  match.phase3 = outcomeData.phase3Climax;
  match.verdict = outcomeData.verdictSummary;
  match.winProb = outcomeData.winProbability;

  // Log results to local sidebar tracker
  const logBox = document.getElementById("tournament-resolution-log");
  if (logBox) {
    const existing = logBox.querySelector("span.text-slate-500") ? "" : logBox.innerHTML;
    logBox.innerHTML = `
      <div class="p-1.5 border-b border-slate-900 leading-normal">
        <span class="text-indigo-400 font-bold">[R-${rIdx+1}-M-${mIdx+1}]</span> 
        ${f1Name} vs ${f2Name} &rarr; 
        Winner: <span class="text-emerald-400 font-bold">${match.winner}</span> (${match.winProb})
      </div>
      ${existing}
    `;
  }

  // Advance winner to target slot in subsequent round
  const nextRIdx = rIdx + 1;
  if (nextRIdx < state.tournament.rounds.length) {
    const nextMIdx = Math.floor(mIdx / 2);
    const slotInNextMatch = (mIdx % 2 === 0) ? "fighter1" : "fighter2";
    state.tournament.rounds[nextRIdx][nextMIdx][slotInNextMatch] = match.winner;
  }

  // Re-render and advance cursor
  advanceTournamentIndices();
  renderActiveTournamentBracketGrid();
};

window.simulateActiveRound = async function() {
  if (!state.tournament.active) return;
  
  let pendingCount = 0;
  const rIdx = state.tournament.currentRoundIndex;
  const round = state.tournament.rounds[rIdx];

  if (!round) return;

  for (let i = 0; i < round.length; i++) {
    if (!round[i].simulated && round[i].fighter1 && round[i].fighter2) {
      pendingCount++;
      await simulateNextTournamentMatch();
    }
  }

  if (pendingCount === 0) {
    showNotification("All current round slots are resolved.", "info");
  } else {
    showNotification(`Simulated and resolved ${pendingCount} matchups!`, "success");
  }
};

function advanceTournamentIndices() {
  const rIdx = state.tournament.currentRoundIndex;
  const mIdx = state.tournament.currentMatchIndex;

  const totalMatchesInRound = state.tournament.rounds[rIdx].length;

  if (mIdx + 1 < totalMatchesInRound) {
    state.tournament.currentMatchIndex = mIdx + 1;
  } else {
    // Move to next round
    const nextRIdx = rIdx + 1;
    if (nextRIdx < state.tournament.rounds.length) {
      state.tournament.currentRoundIndex = nextRIdx;
      state.tournament.currentMatchIndex = 0;
      showNotification(`Round ${rIdx + 1} finalized! Advancing to Round ${nextRIdx + 1}`, "success");
    } else {
      showNotification("Championship concluded! We have a victor!", "success");
    }
  }
}

async function callGeminiTournamentSimulation(f1, f2, roundNum) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${state.settings.geminiApiKey}`;
  
  const systemPrompt = `You are the tournament referee of Nexus VS. Resolve this direct bracket duel based on their canon abilities. Return a perfectly structured JSON object conforming exactly to this schema:
  {
    "phase1Setup": "Detailed starting clash narrative",
    "phase2MidGame": "Adaptation details and key trading of moves",
    "phase3Climax": "Climax high-velocity final sequence",
    "predictedWinner": "EXACT match name of winner - must be either '${f1.name}' or '${f2.name}'",
    "winProbability": "e.g. 62%",
    "verdictSummary": "Clear concise reasoning explaining why this fighter won"
  }`;

  const prompt = `Round: ${roundNum}
  Challenger 1: ${f1.name} with powers: ${(f1.powers || []).join(", ")}
  Challenger 2: ${f2.name} with powers: ${(f2.powers || []).join(", ")}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          phase1Setup: { type: "STRING" },
          phase2MidGame: { type: "STRING" },
          phase3Climax: { type: "STRING" },
          predictedWinner: { type: "STRING" },
          winProbability: { type: "STRING" },
          verdictSummary: { type: "STRING" }
        },
        required: ["phase1Setup", "phase2MidGame", "phase3Climax", "predictedWinner", "winProbability", "verdictSummary"]
      }
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const rData = await response.json();
      const rawJson = rData.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(rawJson);
    }
  } catch (e) {
    console.error("Tournament AI simulation call errored:", e);
  }
  return null;
}

function computeOfflineTournamentLog(f1, f2, roundNum) {
  const p1Len = f1.powers ? f1.powers.length : 1;
  const p2Len = f2.powers ? f2.powers.length : 1;
  
  let winner = f1.name;
  let loser = f2.name;
  let probability = "55%";

  if (p1Len < p2Len) {
    winner = f2.name;
    loser = f1.name;
    probability = "60%";
  } else if (p1Len > p2Len) {
    probability = "64%";
  } else if (Math.random() > 0.5) {
    winner = f2.name;
    loser = f1.name;
  }

  return {
    phase1Setup: `${f1.name} charges forward, launching initial energy waves across the arena field. ${f2.name} establishes strong defensive parameters to absorb the initial kinetic feedback.`,
    phase2MidGame: `The exchange scales rapidly as ${loser} attempts to locate critical weak points. ${winner} executes optimized tactical countermeasures, neutralizing primary combat elements.`,
    phase3Climax: `Using precise capability adaptation, ${winner} unleashes a devastating final strike that breaks through the defenses, securing a decisive victory!`,
    predictedWinner: winner,
    winProbability: probability,
    verdictSummary: `${winner} outpaces ${loser} in sheer resourcefulness and utility scope during the combat sequence.`
  };
}


/* ========================================================================================
   ========================== MAIN GAME SIMULATION & SETUP WRAPPER ========================
   ======================================================================================== */

window.runBattleSimulation = async function() {
  if (!state.selectedFighter1 || !state.selectedFighter2) {
    showNotification("Ensure both Fighter Alpha and Fighter Omega slots are configured.", "warning");
    return;
  }

  const simBoard = document.getElementById("simulation-board");
  const loader = document.getElementById("combat-loader");
  const presenter = document.getElementById("fight-presentation");
  
  simBoard.classList.remove("hidden");
  loader.classList.remove("hidden");
  presenter.classList.add("hidden");

  simBoard.scrollIntoView({ behavior: 'smooth' });

  const customBattleground = document.getElementById("custom-battleground").value.trim();
  const customRules = document.getElementById("custom-rules").value.trim();
  const customHandicaps = document.getElementById("custom-handicaps").value.trim();

  const f1 = state.selectedFighter1;
  const f2 = state.selectedFighter2;

  const apiKey = state.settings.geminiApiKey;
  if (!apiKey) {
    setTimeout(() => {
      showNotification("No API Key Configured. Simulating using Local Core Analytics.", "info");
      runMockSimulation(f1, f2, customBattleground, customRules, customHandicaps);
    }, 1500);
    return;
  }

  const systemPrompt = `You are the master engine of Nexus VS. Resolve a fight between two contenders based on their canon abilities. Return a perfectly structured JSON object conforming exactly to this schema:
  {
    "phase1Setup": "Detailed narrative of the starting clash and initial tactical positioning",
    "phase2MidGame": "Detailed narrative of adaptations, momentum shifts, and tactical counterplays",
    "phase3Climax": "Narrative of the high-velocity final strike and decisive outcome",
    "predictedWinner": "Name of the exact winning fighter",
    "winProbability": "e.g. 74%",
    "verdictSummary": "Detailed analytical log explaining why the victor won the match under these specific rules."
  }`;

  const userPrompt = `Fighter 1:
  Name: ${f1.name} (Real Name: ${f1.realName || 'Unknown'})
  Origin: ${f1.mediaSource}
  Variant: ${f1.variant || 'Default'}
  Powers: ${(f1.powers || []).join(", ")}
  Bio: ${f1.bio || ''}
  Personality: ${f1.personality || ''}
  
  Fighter 2:
  Name: ${f2.name} (Real Name: ${f2.realName || 'Unknown'})
  Origin: ${f2.mediaSource}
  Variant: ${f2.variant || 'Default'}
  Powers: ${(f2.powers || []).join(", ")}
  Bio: ${f2.bio || ''}
  Personality: ${f2.personality || ''}
  
  Battleground: ${customBattleground || 'Default Arena'}
  Rules: ${customRules || 'None'}
  Handicaps: ${customHandicaps || 'None'}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          phase1Setup: { type: "STRING" },
          phase2MidGame: { type: "STRING" },
          phase3Climax: { type: "STRING" },
          predictedWinner: { type: "STRING" },
          winProbability: { type: "STRING" },
          verdictSummary: { type: "STRING" }
        },
        required: ["phase1Setup", "phase2MidGame", "phase3Climax", "predictedWinner", "winProbability", "verdictSummary"]
      }
    }
  };

  try {
    const response = await fetchWithRetry(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const rData = await response.json();
    const rawJson = rData.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawJson);

    const matchRecord = {
      id: `match-${Date.now()}`,
      fighter1Id: f1.id || f1.name,
      fighter2Id: f2.id || f2.name,
      phase1: parsed.phase1Setup,
      phase2: parsed.phase2MidGame,
      phase3Climax: parsed.phase3Climax,
      predictedWinner: parsed.predictedWinner,
      winProbability: parsed.winProbability,
      verdictSummary: parsed.verdictSummary,
      timestamp: Date.now(),
      battleSceneImgUrl: "fallback-split",
      customBattleground,
      customRules,
      customHandicaps,
      dispute: ""
    };

    state.battles.push(matchRecord);
    saveStateToLocalStorage();
    
    loader.classList.add("hidden");
    presenter.classList.remove("hidden");
    playbackBattle(matchRecord);
    await commitToGitHub();

  } catch (e) {
    showNotification("API Error. Activating local match logic engine.", "warning");
    runMockSimulation(f1, f2, customBattleground, customRules, customHandicaps);
  }
};

function runMockSimulation(f1, f2, bg, rules, handicaps) {
  const randomSeed = Math.random();
  const p1Str = f1.powers ? f1.powers.length : 1;
  const p2Str = f2.powers ? f2.powers.length : 1;
  const advantage = p1Str - p2Str;

  let winner = f1;
  let loser = f2;
  let probVal = "50%";

  if (advantage > 0) {
    probVal = `${Math.min(50 + advantage * 8, 95)}%`;
  } else if (advantage < 0) {
    winner = f2;
    loser = f1;
    probVal = `${Math.min(50 + Math.abs(advantage) * 8, 95)}%`;
  } else {
    if (randomSeed > 0.5) {
      winner = f2;
      loser = f1;
    }
    probVal = "55%";
  }

  const mockMatch = {
    id: `match-${Date.now()}`,
    fighter1Id: f1.id || f1.name,
    fighter2Id: f2.id || f2.name,
    phase1: `${f1.name} triggers an intensive initial charge under the rules of ${bg || 'Standard Field'}. ${f2.name} performs quick lateral evasion.`,
    phase2: `The combat scales into extreme exchanges. ${loser.name} tries to find spacing but ${winner.name} utilizes optimized tactical adaptation to block.`,
    phase3Climax: `With an authoritative final strike, ${winner.name} breaks the core line of defense and subdues ${loser.name}, wrapping the scenario cleanly.`,
    predictedWinner: winner.name,
    winProbability: probVal,
    verdictSummary: `${winner.name} clinches the victory primarily due to balanced power scaling and direct capability adaptation.`,
    timestamp: Date.now(),
    battleSceneImgUrl: "fallback-split",
    customBattleground: bg,
    customRules: rules,
    customHandicaps: handicaps,
    dispute: ""
  };

  state.battles.push(mockMatch);
  saveStateToLocalStorage();

  document.getElementById("combat-loader").classList.add("hidden");
  document.getElementById("fight-presentation").classList.remove("hidden");
  playbackBattle(mockMatch);
  commitToGitHub();
}

// Playback Specific Match Scenario Details
function playbackBattle(battle) {
  const f1 = state.characters.find(c => c.id === battle.fighter1Id || c.name === battle.fighter1Id) || state.selectedFighter1 || { name: "Challenger A" };
  const f2 = state.characters.find(c => c.id === battle.fighter2Id || c.name === battle.fighter2Id) || state.selectedFighter2 || { name: "Challenger B" };

  document.getElementById("header-f1").textContent = f1.name;
  document.getElementById("header-f2").textContent = f2.name;

  document.getElementById("predicted-winner").textContent = battle.predictedWinner;
  document.getElementById("win-probability").textContent = battle.winProbability;

  document.getElementById("results-phase-1").textContent = battle.phase1;
  document.getElementById("results-phase-2").textContent = battle.phase2;
  document.getElementById("results-phase-3").textContent = battle.phase3Climax;
  document.getElementById("results-verdict").textContent = battle.verdictSummary;

  const fallbackEl = document.getElementById('battle-scene-fallback');
  const imgEl = document.getElementById('battle-scene-img');
  const loadingEl = document.getElementById('battle-scene-loading');

  imgEl.classList.add('hidden');
  loadingEl.classList.add('hidden');
  fallbackEl.classList.remove('hidden');

  document.getElementById('fallback-winner-img').src = f1.name === battle.predictedWinner ? f1.imageUrl : f2.imageUrl;
  document.getElementById('fallback-winner-name').textContent = f1.name === battle.predictedWinner ? f1.name : f2.name;
  document.getElementById('fallback-loser-img').src = f1.name !== battle.predictedWinner ? f1.imageUrl : f2.imageUrl;
  document.getElementById('fallback-loser-name').textContent = f1.name !== battle.predictedWinner ? f1.name : f2.name;

  const condContainer = document.getElementById('active-conditions-container');
  const condBgBox = document.getElementById('active-bg-box');
  const condRulesBox = document.getElementById('active-rules-box');
  const condHandicapsBox = document.getElementById('active-handicaps-box');

  if (battle.customBattleground || battle.customRules || battle.customHandicaps) {
    condContainer.classList.remove('hidden');
    if (battle.customBattleground) {
      condBgBox.classList.remove('hidden');
      document.getElementById('active-battleground-val').textContent = battle.customBattleground;
    } else condBgBox.classList.add('hidden');

    if (battle.customRules) {
      condRulesBox.classList.remove('hidden');
      document.getElementById('active-rules-val').textContent = battle.customRules;
    } else condRulesBox.classList.add('hidden');

    if (battle.customHandicaps) {
      condHandicapsBox.classList.remove('hidden');
      document.getElementById('active-handicaps-val').textContent = battle.customHandicaps;
    } else condHandicapsBox.classList.add('hidden');
  } else {
    condContainer.classList.add('hidden');
  }
}

window.playbackSavedBattle = function(battleId) {
  const battle = state.battles.find(b => b.id === battleId);
  if (battle) {
    switchTab("history");
    document.getElementById("history-grid").classList.add("hidden");
    document.getElementById("history-header").classList.add("hidden");
    const board = document.getElementById("simulation-board");
    document.getElementById("history-report-container").appendChild(board);
    document.getElementById("simulation-board").classList.remove("hidden");
    document.getElementById("combat-loader").classList.add("hidden");
    document.getElementById("fight-presentation").classList.remove("hidden");
    document.getElementById("simulation-board").scrollIntoView({ behavior: 'smooth' });
    playbackBattle(battle);
  }
};

window.openCreateFighterModal = function() {
  document.getElementById("char-name").value = "";
  document.getElementById("char-real-name").value = "";
  document.getElementById("char-media").value = "";
  document.getElementById("char-variant").value = "Default";
  document.getElementById("char-image").value = "";
  document.getElementById("char-weight").value = "";
  document.getElementById("char-bio").value = "";
  document.getElementById("char-personality").value = "";
  document.getElementById("char-powers").value = "";

  document.getElementById("modal-create-fighter").classList.remove("hidden");
};

window.closeCreateFighterModal = function() {
  document.getElementById("modal-create-fighter").classList.add("hidden");
};

window.saveNewFighter = async function() {
  const name = document.getElementById("char-name").value.trim();
  const media = document.getElementById("char-media").value.trim();

  if (!name || !media) {
    showNotification("Name and Media are required fields.", "warning");
    return;
  }

  const pStr = document.getElementById("char-powers").value.trim();
  const pArray = pStr ? pStr.split(",").map(x => x.trim()).filter(x => x.length > 0) : [];

  const newChar = {
    id: `char-${Date.now()}`,
    name,
    realName: document.getElementById("char-real-name").value.trim() || "Unknown",
    mediaSource: media,
    variant: document.getElementById("char-variant").value.trim() || "Default",
    imageUrl: document.getElementById("char-image").value.trim() || "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=300",
    weight: document.getElementById("char-weight").value.trim() || "N/A",
    bio: document.getElementById("char-bio").value.trim() || "",
    personality: document.getElementById("char-personality").value.trim() || "",
    powers: pArray
  };

  state.characters.push(newChar);
  saveStateToLocalStorage();
  showNotification(`${name} added to roster database!`, "success");
  closeCreateFighterModal();
  populateFranchiseDropdowns();
  renderUI();
  await commitToGitHub();
};

window.deleteCharacter = async function(id) {
  const idx = state.characters.findIndex(c => c.id === id);
  if (idx === -1) return;

  const cName = state.characters[idx].name;
  state.characters.splice(idx, 1);

  if (state.selectedFighter1 && state.selectedFighter1.id === id) state.selectedFighter1 = null;
  if (state.selectedFighter2 && state.selectedFighter2.id === id) state.selectedFighter2 = null;

  saveStateToLocalStorage();
  showNotification(`${cName} has been purged.`, "info");
  populateFranchiseDropdowns();
  renderUI();
  await commitToGitHub();
};

window.showNotification = function(message, type = "info") {
  const container = document.getElementById("notification-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-start gap-3 transform transition-all duration-300 translate-y-2 opacity-0`;
  
  let icon = `<i class="fa-solid fa-circle-info text-blue-400"></i>`;
  let borderStyle = "border-slate-800 bg-slate-900 text-slate-100";

  if (type === "success") {
    icon = `<i class="fa-solid fa-circle-check text-emerald-400"></i>`;
    borderStyle = "border-emerald-900/40 bg-emerald-950/90 text-emerald-200";
  } else if (type === "warning") {
    icon = `<i class="fa-solid fa-circle-exclamation text-amber-400"></i>`;
    borderStyle = "border-amber-900/40 bg-amber-950/90 text-amber-200";
  } else if (type === "error") {
    icon = `<i class="fa-solid fa-triangle-exclamation text-red-400"></i>`;
    borderStyle = "border-red-900/40 bg-red-950/90 text-red-200";
  }

  toast.innerHTML = `
    <span class="text-base leading-none">${icon}</span>
    <div class="flex-1">${message}</div>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white transition"><i class="fa-solid fa-xmark"></i></button>
  `;

  toast.className += ` ${borderStyle}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  }, 50);

  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => toast.remove(), 300);
  }, 5000);
};

// Initialize System Setup on Page Loaded
window.addEventListener("DOMContentLoaded", async () => {
  loadStateFromLocalStorage();
  detectGithubEnvironment();

  if (state.characters.length === 0) {
    state.characters = [...initialSeedCharacters];
    state.battles = [...initialSeedBattles];
    saveStateToLocalStorage();
  }

  await publicReadFromGitHub();

  // Configure default selection setup
  if (state.characters.length >= 2) {
    window.setFighter('A', state.characters[0].name, state.characters[0].variant, state.characters[0].mediaSource);
    window.setFighter('B', state.characters[1].name, state.characters[1].variant, state.characters[1].mediaSource);
  }

  bindInputsToRealTimeState();
  populateFranchiseDropdowns();
  renderUI();

  if (state.settings.githubPat) {
    tryToSyncWithGitHub(true);
  }
});