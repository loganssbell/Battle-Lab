// State variables for paginating explorer modules
window.charCurrentPage = 1;
window.charItemsPerPage = 25;
window.matchCurrentPage = 1;
window.matchItemsPerPage = 25;

window.tournamentCurrentPage = 1;
window.tournamentItemsPerPage = 25;

// Core Tournament States
window.simulationMode = 'single'; // 'single' or 'tournament'
window.tournamentDraftSelectedIds = []; // Stores IDs of selected draft fighters
window.activeTournament = null; // Active running tournament configuration object
window.tournamentAutoRunning = false; // Flag for auto run Fast Forward simulation
window.communityFeedMode = 'matches'; // 'matches' or 'tournaments'

let tournamentsGlobal = []; // Global Tournament archive arrays

// Helper to capitalize names in Title Case with Roman numeral and hyphenation support
function capitalizeName(name) {
  if (!name) return '';
  const romanNumerals = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i;
  return name.trim().split(/\s+/)
			 .map(word => {
			   if (!word) return '';
			   if (romanNumerals.test(word)) {
				 return word.toUpperCase();
			   }
			   if (word.includes('-')) {
				 return word.split('-')
							.map(w => {
							  if (romanNumerals.test(w)) return w.toUpperCase();
							  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
							})
							.join('-');
			   }
			   return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
			 })
			 .join(' ');
}

// Helper to extract a clean, capitalized base name of a fighter
function cleanBaseName(fullName) {
  if (!fullName) return '';
  let cleaned = fullName.replace(/\s*\([^)]*\)/g, '');
  cleaned = cleaned.replace(/\s*\[[^\]]*\]/g, '');
  cleaned = cleaned.replace(/\s+variant/gi, '');
  return capitalizeName(cleaned.trim());
}

// Helper to capitalize and standardize variant labels neatly
function cleanVariantName(variantStr) {
  if (!variantStr) return 'Default';
  let cleaned = variantStr.trim();
  cleaned = cleaned.replace(/\s+variant/gi, '');
  if (cleaned.toLowerCase() === 'default' || cleaned === '') {
	return 'Default';
  }
  return capitalizeName(cleaned);
}

// Helper to consistently generate unique, collision-free database IDs incorporating Franchise context
function generateCharacterId(baseName, variant, franchise) {
  const cleanBase = cleanBaseName(baseName).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const cleanVar = cleanVariantName(variant).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const cleanFran = franchise ? franchise.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
  
  let id = cleanBase;
  if (cleanVar && cleanVar !== 'default') {
	id += '-' + cleanVar;
  }
  if (cleanFran) {
	id += '-' + cleanFran;
  }
  return id;
}

// Helper to split a combined full combatant name into its name and variant attributes
function parseNameAndVariant(fullName) {
  if (!fullName) return { name: "", variant: "Default" };
  const match = fullName.match(/^([^(]+)(?:\(([^)]+)\))?/);
  if (match) {
	return {
	  name: match[1].trim(),
	  variant: match[2] ? match[2].trim() : "Default"
	};
  }
  return { name: fullName.trim(), variant: "Default" };
}

// Helper function to sanitize, filter, and extract reliable image hotlinks
function sanitizeFighterUrl(url) {
  if (!url) return '';
  let cleaned = url.trim();
  if (cleaned.includes('/wiki/File:') || cleaned.includes('/File:')) {
	return '';
  }
  if (cleaned.includes('wikia.nocookie.net')) {
	const extMatch = cleaned.match(/\.(jpg|jpeg|png|webp)/i);
	if (extMatch) {
	  const index = cleaned.indexOf(extMatch[0]) + extMatch[0].length;
	  // Preserve /revision/latest and ?cb=... parameters if they exist to prevent broken Fandom CDN routes
	  if (cleaned.includes('/revision/latest')) {
		const cbMatch = cleaned.match(/(\?cb=\d+)/);
		const cb = cbMatch ? cbMatch[1] : '';
		cleaned = cleaned.substring(0, cleaned.indexOf('/revision/latest') + 16) + cb;
	  } else {
		cleaned = cleaned.substring(0, index);
	  }
	}
  }
  return cleaned;
}

// Intelligent lookup algorithm to find existing roster profiles by partial/full name or ID
function findBestCharacterMatch(inputName, inputFranchise = '') {
  if (!inputName) return null;
  const cleanInput = cleanBaseName(inputName).toLowerCase().trim();
  if (!cleanInput) return null;

  const userFranchise = inputFranchise ? inputFranchise.toLowerCase().trim() : '';

  // Helper to check if franchise matches or overlaps
  function franchiseMatches(char) {
	if (!userFranchise) return true; // If user didn't specify franchise, ignore and allow match
	const charFran = (char.franchise || '').toLowerCase().trim();
	const charMedia = (char.mediaSource || '').toLowerCase().trim();
	
	// Exact or direct substring match
	if (charFran.includes(userFranchise) || userFranchise.includes(charFran) ||
		charMedia.includes(userFranchise) || userFranchise.includes(charMedia)) {
	  return true;
	}
	
	// Word token overlap check (e.g. matching "Super Mario" with "Mario Brothers")
	const charFranTokens = charFran.split(/\s+/).filter(t => t.length > 2);
	const userFranTokens = userFranchise.split(/\s+/).filter(t => t.length > 2);
	const overlap = charFranTokens.filter(t => userFranTokens.includes(t));
	return overlap.length > 0;
  }

  // 1. Direct match by generated ID
  let match = charactersGlobal.find(c => c.id === cleanInput && franchiseMatches(c));
  if (match) return match;

  // 2. Direct match by baseName or full name
  match = charactersGlobal.find(c => 
	((c.name && c.name.toLowerCase().trim() === cleanInput) ||
	 (c.baseName && c.baseName.toLowerCase().trim() === cleanInput)) &&
	franchiseMatches(c)
  );
  if (match) return match;

  // 3. Fuzzy search match (substring checking and token overlaps)
  const sortedChars = [...charactersGlobal].sort((a, b) => (b.name || '').length - (a.name || '').length);
  const stopWords = ['the', 'of', 'man', 'woman', 'captain', 'kid', 'variant', 'default'];
  const inputTokens = cleanInput.split(/\s+/).filter(t => t.length > 1 && !stopWords.includes(t));

  for (const c of sortedChars) {
	if (!franchiseMatches(c)) continue; // Ensure franchise aligns before checking name overlaps

	const cName = (c.name || '').toLowerCase();
	const cBase = (c.baseName || '').toLowerCase();

	// Substring checking
	if (cName.includes(cleanInput) || cleanInput.includes(cName) || 
		cBase.includes(cleanInput) || cleanInput.includes(cBase)) {
	  return c;
	}

	// Token overlap matching (e.g. matching "Tanjiro" to "Tanjiro Kamado")
	if (inputTokens.length > 0) {
	  const cTokens = cName.split(/\s+/).concat(cBase.split(/\s+/)).filter(t => t.length > 1 && !stopWords.includes(t));
	  const matches = inputTokens.filter(t => cTokens.includes(t));
	  if (matches.length / inputTokens.length >= 0.5) {
		return c;
	  }
	}
  }
  return null;
}

// Canvas-based base64 compressor to safely avoid Firestore size threshold bugs (1MB max)
function compressBase64Image(base64Str, maxWidth, maxHeight, quality = 0.7) {
  return new Promise((resolve) => {
	if (base64Str && base64Str.startsWith("http")) {
	  resolve(base64Str);
	  return;
	}
	const img = new Image();
	img.crossOrigin = "anonymous";
	img.onload = function() {
	  let width = img.width;
	  let height = img.height;
	  if (width > maxWidth) {
		height = Math.round((height * maxWidth) / width);
		width = maxWidth;
	  }
	  if (height > maxHeight) {
		width = Math.round((width * maxHeight) / height);
		height = maxHeight;
	  }
	  const canvas = document.createElement('canvas');
	  canvas.width = width;
	  canvas.height = height;
	  const ctx = canvas.getContext('2d');
	  ctx.drawImage(img, 0, 0, width, height);
	  const compressedUrl = canvas.toDataURL('image/jpeg', quality);
	  resolve(compressedUrl);
	};
	img.onerror = function() {
	  resolve(base64Str);
	};
	img.src = base64Str;
  });
}

// Helper to safely load images with high-quality styled fallback cards
function setFighterImage(imgElement, imageUrl, name) {
  const sanitizedUrl = sanitizeFighterUrl(imageUrl);
  imgElement.setAttribute('referrerpolicy', 'no-referrer');
  if (sanitizedUrl) {
	imgElement.src = sanitizedUrl;
	imgElement.onerror = function() {
	  this.onerror = null;
	  this.src = `https://placehold.co/400x300/0f172a/94a3b8?text=${encodeURIComponent(name)}`;
	};
  } else {
	imgElement.src = `https://placehold.co/400x300/0f172a/94a3b8?text=${encodeURIComponent(name)}`;
  }
}

// Populates both dynamic drop-down selectors alphabetically
function populateFranchiseDropdowns() {
  const franchises = new Set();
  
  // Collect valid franchises from the global array list
  charactersGlobal.forEach(c => {
	const group = c.franchise || c.mediaSource || 'Unknown';
	if (group && group.trim() !== '') {
	  franchises.add(group.trim());
	}
  });

  const sortedFranchises = Array.from(franchises).sort((a, b) => a.localeCompare(b));
  
  // Select elements
  const charFranSelect = document.getElementById('explorer-char-franchise');
  const matchFranSelect = document.getElementById('explorer-match-franchise');
  const options = ['<option value="All">All Franchises</option>', ...sortedFranchises.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`)].join('');
  
  if (charFranSelect) charFranSelect.innerHTML = options;
  if (matchFranSelect) matchFranSelect.innerHTML = options;
}

// Standard starting list is now empty to support a completely fresh, user-driven database
const startingRoster = [];

// Persistent local database fallback engine
const localDbEngine = {
  getCharacters() {
	const stored = localStorage.getItem('battle_lab_characters');
	return stored ? JSON.parse(stored) : [];
  },
  saveCharacter(char) {
	const chars = this.getCharacters();
	const cleanBase = cleanBaseName(char.baseName || char.name);
	const cleanVar = cleanVariantName(char.variant || 'Default');
	const cleanFran = char.franchise || char.mediaSource || '';
	const id = generateCharacterId(cleanBase, cleanVar, cleanFran);
	
	const index = chars.findIndex(c => c.id === id);
	const payload = { id, ...char, baseName: cleanBase, variant: cleanVar };
	if (index !== -1) {
	  chars[index] = payload;
	} else {
	  chars.push(payload);
	}
	localStorage.setItem('battle_lab_characters', JSON.stringify(chars));
	return payload;
  },
  getBattles() {
	const stored = localStorage.getItem('battle_lab_battles');
	return stored ? JSON.parse(stored) : [];
  },
  saveBattle(battle) {
	const battles = this.getBattles();
	const payload = { id: 'local-' + Date.now(), ...battle };
	battles.push(payload);
	localStorage.setItem('battle_lab_battles', JSON.stringify(battles));
	return payload;
  },
  getTournaments() {
	const stored = localStorage.getItem('battle_lab_tournaments');
	return stored ? JSON.parse(stored) : [];
  },
  saveTournament(t) {
	const tournaments = this.getTournaments();
	const id = t.id || 'local-t-' + Date.now();
	const payload = { id, ...t };
	const index = tournaments.findIndex(item => item.id === id);
	if (index !== -1) {
	  tournaments[index] = payload;
	} else {
	  tournaments.push(payload);
	}
	localStorage.setItem('battle_lab_tournaments', JSON.stringify(tournaments));
	return payload;
  },
  deleteCharacter(charId) {
	let chars = this.getCharacters();
	chars = chars.filter(c => c.id !== charId);
	localStorage.setItem('battle_lab_characters', JSON.stringify(chars));
  },
  deleteBattle(battleId) {
	let battles = this.getBattles();
	battles = battles.filter(b => b.id !== battleId);
	localStorage.setItem('battle_lab_battles', JSON.stringify(battles));
  },
  deleteTournament(tId) {
	let tours = this.getTournaments();
	tours = tours.filter(t => t.id !== tId);
	localStorage.setItem('battle_lab_tournaments', JSON.stringify(tours));
  }
};

function startApp() {
  fallbackToLocalMode();
  loadOptionsState();
}

function fallbackToLocalMode() {
  document.getElementById('db-status').className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20";
  document.getElementById('db-status').innerHTML = '<span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-blue-400"></span>Local File Mode';
  checkAndPreloadRoster();
  loadLocalData();
}

function checkAndPreloadRoster() {
  const currentChars = localDbEngine.getCharacters();
  if (currentChars.length === 0) {
	// Load from database.js if localStorage is empty
	if (window.database && window.database.characters) {
	  localStorage.setItem('battle_lab_characters', JSON.stringify(window.database.characters));
	}
	if (window.database && window.database.battles) {
	  localStorage.setItem('battle_lab_battles', JSON.stringify(window.database.battles));
	}
  }
}

function triggerClearDatabase() {
  openConfirmModal(
	"Wipe Entire Database?",
	"This action will permanently erase all custom characters, match archives, and tournament bracket progress from the database. It cannot be undone.",
	() => {
	  executeDatabasePurge();
	}
  );
}

function triggerImport() {
  document.getElementById('import-file-input').click();
}

function toggleAdvancedOptions() {
  const panel = document.getElementById('advanced-options-panel');
  const arrow = document.getElementById('advanced-options-arrow');
  const isHidden = panel.classList.contains('hidden');
  
  if (isHidden) {
	panel.classList.remove('hidden');
	arrow.classList.add('rotate-180');
  } else {
	panel.classList.add('hidden');
	arrow.classList.remove('rotate-180');
  }
}

function saveOptionsState() {
  const bypass = document.getElementById('bypass-image-gen-toggle').checked;
  localStorage.setItem('battle_lab_bypass_image_gen', bypass);

  const battleground = document.getElementById('custom-battleground').value;
  localStorage.setItem('battle_lab_custom_battleground', battleground);

  const rules = document.getElementById('custom-rules').value;
  localStorage.setItem('battle_lab_custom_rules', rules);

  const handicaps = document.getElementById('custom-handicaps').value;
  localStorage.setItem('battle_lab_custom_handicaps', handicaps);
}

function loadOptionsState() {
  const bypass = localStorage.getItem('battle_lab_bypass_image_gen') === 'true';
  document.getElementById('bypass-image-gen-toggle').checked = bypass;

  document.getElementById('custom-battleground').value = localStorage.getItem('battle_lab_custom_battleground') || '';
  document.getElementById('custom-rules').value = localStorage.getItem('battle_lab_custom_rules') || '';
  document.getElementById('custom-handicaps').value = localStorage.getItem('battle_lab_custom_handicaps') || '';
}

function setSimulationMode(mode) {
  window.simulationMode = mode;
  const singlePanel = document.getElementById('single-play-panel');
  const tournamentPanel = document.getElementById('tournament-play-panel');
  
  const singleBtn = document.getElementById('mode-single-btn');
  const tournamentBtn = document.getElementById('mode-tournament-btn');
  
  const simulateBtn = document.getElementById('simulate-btn');
  const tournamentBtnInit = document.getElementById('tournament-btn');
  const optionsParent = document.getElementById('advanced-options-parent');

  const footerHint = document.getElementById('simulator-footer-hint');

  if (mode === 'tournament') {
	singlePanel.classList.add('hidden');
	tournamentPanel.classList.remove('hidden');
	
	singleBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all text-slate-400 hover:text-slate-200";
	tournamentBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all bg-purple-600 text-white shadow-md shadow-purple-900/30";
	
	simulateBtn.classList.add('hidden');
	tournamentBtnInit.classList.remove('hidden');
	optionsParent.classList.add('hidden');
	document.getElementById('advanced-options-panel').classList.add('hidden');
	
	footerHint.innerText = "Select up to 16 combatants to schedule, build, and simulate dynamic brackets.";
	renderTournamentDraftRosterBoard();
  } else {
	singlePanel.classList.remove('hidden');
	tournamentPanel.classList.add('hidden');
	
	singleBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all bg-purple-600 text-white shadow-md shadow-purple-900/30";
	tournamentBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all text-slate-400 hover:text-slate-200";
	
	simulateBtn.classList.remove('hidden');
	tournamentBtnInit.classList.add('hidden');
	optionsParent.classList.remove('hidden');
	
	footerHint.innerText = "Simulating auto-discovers real web portraits and writes files to the cloud.";
  }
}

function setCommunityFeedMode(mode) {
  window.communityFeedMode = mode;
  const matchesFeed = document.getElementById('matches-feed');
  const tournamentsFeed = document.getElementById('tournaments-feed');
  
  const tabMatches = document.getElementById('feed-tab-matches');
  const tabTournaments = document.getElementById('feed-tab-tournaments');

  if (mode === 'tournaments') {
	matchesFeed.classList.add('hidden');
	tournamentsFeed.classList.remove('hidden');
	tabMatches.className = "text-xs font-extrabold px-3 py-1 text-slate-500 hover:text-slate-300 flex items-center gap-1.5";
	tabTournaments.className = "text-xs font-extrabold px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-amber-400 flex items-center gap-1.5";
	updateTournamentsFeedUI();
  } else {
	matchesFeed.classList.remove('hidden');
	tournamentsFeed.classList.add('hidden');
	tabMatches.className = "text-xs font-extrabold px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-purple-400 flex items-center gap-1.5";
	tabTournaments.className = "text-xs font-extrabold px-3 py-1 text-slate-500 hover:text-slate-300 flex items-center gap-1.5";
	updateBattlesUI(battlesGlobal);
  }
}

function triggerFeedExplorer() {
  if (window.communityFeedMode === 'tournaments') {
	openTournamentsExplorer();
  } else {
	openMatchesExplorer();
  }
}

function loadLocalData() {
  const chars = localDbEngine.getCharacters();
  charactersGlobal = chars;
  updateDatalists(chars);
  populateFranchiseDropdowns();
  renderTournamentDraftRosterBoard();
  
  const charCountEl = document.getElementById('char-count');
  if (charCountEl) {
	charCountEl.innerText = chars.length;
  }

  const battles = localDbEngine.getBattles();
  battles.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  battlesGlobal = battles;
  
  const tourCountEl = document.getElementById('tournament-count');
  const tours = localDbEngine.getTournaments();
  tours.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  tournamentsGlobal = tours;

  if (tourCountEl) {
	tourCountEl.innerText = tours.length;
  }

  if (window.communityFeedMode === 'tournaments') {
	updateTournamentsFeedUI();
  } else {
	updateBattlesUI(battles);
  }
  populateFranchiseDropdowns();
  
  updateRosterUI(chars);

  const battleCountEl = document.getElementById('battle-count');
  if (battleCountEl) {
	battleCountEl.innerText = battles.length;
  }

  if (window.currentInspectedCharId) {
	refreshInspectedCharacterView();
  }
  refreshActiveBattleView();

  // Keep active tour monitor state synchronized
  if (window.activeTournament) {
	const synchronizedTour = tours.find(item => item.id === window.activeTournament.id);
	if (synchronizedTour) {
	  window.activeTournament = synchronizedTour;
	  renderTournamentActiveDashboard();
	}
  }
}

// Global variables
let charactersGlobal = [];
let battlesGlobal = [];
const apiKey = "YOUR_API_KEY"; // This will be needed if you want to use AI features like image generation.

if (document.readyState === "complete" || document.readyState === "interactive") {
  startApp();
} else {
  window.addEventListener('DOMContentLoaded', startApp);
}