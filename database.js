/**
 * Battle Lab - Database Management Script
 *
 * This file contains all logic for initializing and interacting with data sources,
 * including Firebase Firestore for cloud persistence and localStorage for local sandbox mode.
 * It manages loading, saving, importing, and exporting all character, battle, and tournament data.
 */

//! DATABASE & PERSISTENCE ENGINE

const appId = typeof __app_id !== 'undefined' ? __app_id : (window.__app_id || 'multiverse-battle-laboratory');
let firebaseConfig = null;
let auth = null;
let db = null;
let currentUser = null;

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

// Prepopulate cloud database if it starts completely empty (RULE 3 guard)
async function checkAndPreloadCloudRoster() {
  if (!db || !currentUser) return;
  try {
    const charsRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('characters');
    const snapshot = await charsRef.get();
    if (snapshot.empty) {
      const defaultFighters = [
        {
          name: "Sonic",
          baseName: "Sonic",
          variant: "Default",
          realName: "Sonic the Hedgehog",
          publisher: "Sega",
          powers: ["Super Speed", "Spin Dash", "Chaos Control"],
          alignment: "Good",
          height: "3'3\"",
          weight: "77 lbs",
          personality: "Impatient, adventurous, kind-hearted, loves freedom.",
          bio: "The world's fastest hedgehog, who can run at supersonic speeds and loves adventure.",
          mediaSource: "Sonic the Hedgehog",
          franchise: "Sonic the Hedgehog",
          imageUrl: "https://placehold.co/400x300/1e293b/94a3b8?text=Sonic",
          wikiLink: "https://sonic.fandom.com/wiki/Sonic_the_Hedgehog",
          createdTimestamp: Date.now()
        },
        {
          name: "Kirby",
          baseName: "Kirby",
          variant: "Default",
          realName: "Kirby of the Stars",
          publisher: "Nintendo",
          powers: ["Inhale Copy Ability", "Float", "Star Spit"],
          alignment: "Good",
          height: "0'8\"",
          weight: "0.1 lbs",
          personality: "Cheerful, innocent, loves eating and sleeping.",
          bio: "A round, pink hero from Planet Popstar who can copy abilities by swallowing foes.",
          mediaSource: "Kirby",
          franchise: "Kirby",
          imageUrl: "https://placehold.co/400x300/1e293b/94a3b8?text=Kirby",
          wikiLink: "https://kirby.fandom.com/wiki/Kirby",
          createdTimestamp: Date.now()
        },
        {
          name: "Shadow",
          baseName: "Shadow",
          variant: "Default",
          realName: "Shadow the Hedgehog",
          publisher: "Sega",
          powers: ["Chaos Spear", "Chaos Blast", "Teleportation"],
          alignment: "Neutral",
          height: "3'3\"",
          weight: "77 lbs",
          personality: "Brooding, intense, fiercely determined, independent.",
          bio: "The Ultimate Life Form, a black hedgehog created by Gerald Robotnik to cure illness.",
          mediaSource: "Sonic the Hedgehog",
          franchise: "Sonic the Hedgehog",
          imageUrl: "https://placehold.co/400x300/1e293b/94a3b8?text=Shadow",
          wikiLink: "https://sonic.fandom.com/wiki/Shadow_the_Hedgehog",
          createdTimestamp: Date.now()
        },
        {
          name: "Mega Man",
          baseName: "Mega Man",
          variant: "Default",
          realName: "Rock",
          publisher: "Capcom",
          powers: ["Mega Buster", "Weapon Copy System", "Slide"],
          alignment: "Good",
          height: "4'4\"",
          weight: "230 lbs",
          personality: "Just, peaceful, brave, values robot and human harmony.",
          bio: "A highly advanced helper robot modified for combat by Dr. Light to defeat Dr. Wily.",
          mediaSource: "Mega Man",
          franchise: "Mega Man",
          imageUrl: "https://placehold.co/400x300/1e293b/94a3b8?text=Mega+Man",
          wikiLink: "https://megaman.fandom.com/wiki/Mega_Man",
          createdTimestamp: Date.now()
        }
      ];
      for (const f of defaultFighters) {
        const docId = generateCharacterId(f.baseName, f.variant, f.franchise);
        await charsRef.doc(docId).set(f);
      }
    }
  } catch (err) {
    console.warn("Failed to check and preload cloud roster:", err);
  }
}

function startApp() {
  // Try to initialize Firebase securely if credentials are set
  try {
    if (typeof firebase !== 'undefined' && firebaseConfig && firebaseConfig.apiKey) {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      auth = firebase.auth();
      
      // RULE 3: Custom token priority, fallback to anonymous
      const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : (window.__initial_auth_token || null);
      let signInPromise;
      if (token) {
        signInPromise = auth.signInWithCustomToken(token);
      } else {
        signInPromise = auth.signInAnonymously();
      }

      signInPromise.then(userCredential => {
        currentUser = auth.currentUser || userCredential.user || userCredential;
        document.getElementById('db-status').className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        document.getElementById('db-status').innerHTML = '<span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Cloud Storage Active';
        
        // Wait for preloading cloud data to complete before starting snapshot listeners
        checkAndPreloadCloudRoster().then(() => {
          setupDatabaseListeners();
        });
      }).catch(err => {
        console.warn("Auth failed, falling back to local storage sandbox:", err);
        fallbackToLocalMode();
      });
    } else {
      console.warn("No firebaseConfig or firebase SDK detected. Reverting to sandbox fallback.");
      fallbackToLocalMode();
    }
  } catch (e) {
    console.warn("Firebase initialization failed, falling back to local storage sandbox:", e);
    fallbackToLocalMode();
  }
  loadOptionsState();
}

function fallbackToLocalMode() {
  db = null;
  currentUser = null;
  document.getElementById('db-status').className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20";
  document.getElementById('db-status').innerHTML = '<span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-blue-400"></span>Local Sandbox Mode';
  checkAndPreloadRoster();
  loadLocalData();
}

function checkAndPreloadRoster() {
  const currentChars = localDbEngine.getCharacters();
  if (currentChars.length === 0) {
    // Preload standard classic fighters to make sure the app works on very first opening
    const defaultFighters = [
      {
        name: "Sonic",
        baseName: "Sonic",
        variant: "Default",
        realName: "Sonic the Hedgehog",
        publisher: "Sega",
        powers: ["Super Speed", "Spin Dash", "Chaos Control"],
        alignment: "Good",
        height: "3'3\"",
        weight: "77 lbs",
        personality: "Impatient, adventurous, kind-hearted, loves freedom.",
        bio: "The world's fastest hedgehog, who can run at supersonic speeds and loves adventure.",
        mediaSource: "Sonic the Hedgehog",
        franchise: "Sonic the Hedgehog",
        imageUrl: "https://placehold.co/400x300/1e293b/94a3b8?text=Sonic",
        wikiLink: "https://sonic.fandom.com/wiki/Sonic_the_Hedgehog",
        createdTimestamp: Date.now()
      },
      {
        name: "Kirby",
        baseName: "Kirby",
        variant: "Default",
        realName: "Kirby of the Stars",
        publisher: "Nintendo",
        powers: ["Inhale Copy Ability", "Float", "Star Spit"],
        alignment: "Good",
        height: "0'8\"",
        weight: "0.1 lbs",
        personality: "Cheerful, innocent, loves eating and sleeping.",
        bio: "A round, pink hero from Planet Popstar who can copy abilities by swallowing foes.",
        mediaSource: "Kirby",
        franchise: "Kirby",
        imageUrl: "https://placehold.co/400x300/1e293b/94a3b8?text=Kirby",
        wikiLink: "https://kirby.fandom.com/wiki/Kirby",
        createdTimestamp: Date.now()
      },
      {
        name: "Shadow",
        baseName: "Shadow",
        variant: "Default",
        realName: "Shadow the Hedgehog",
        publisher: "Sega",
        powers: ["Chaos Spear", "Chaos Blast", "Teleportation"],
        alignment: "Neutral",
        height: "3'3\"",
        weight: "77 lbs",
        personality: "Brooding, intense, fiercely determined, independent.",
        bio: "The Ultimate Life Form, a black hedgehog created by Gerald Robotnik to cure illness.",
        mediaSource: "Sonic the Hedgehog",
        franchise: "Sonic the Hedgehog",
        imageUrl: "https://placehold.co/400x300/1e293b/94a3b8?text=Shadow",
        wikiLink: "https://sonic.fandom.com/wiki/Shadow_the_Hedgehog",
        createdTimestamp: Date.now()
      },
      {
        name: "Mega Man",
        baseName: "Mega Man",
        variant: "Default",
        realName: "Rock",
        publisher: "Capcom",
        powers: ["Mega Buster", "Weapon Copy System", "Slide"],
        alignment: "Good",
        height: "4'4\"",
        weight: "230 lbs",
        personality: "Just, peaceful, brave, values robot and human harmony.",
        bio: "A highly advanced helper robot modified for combat by Dr. Light to defeat Dr. Wily.",
        mediaSource: "Mega Man",
        franchise: "Mega Man",
        imageUrl: "https://placehold.co/400x300/1e293b/94a3b8?text=Mega+Man",
        wikiLink: "https://megaman.fandom.com/wiki/Mega_Man",
        createdTimestamp: Date.now()
      }
    ];
    defaultFighters.forEach(f => localDbEngine.saveCharacter(f));
  }
}

function setupDatabaseListeners() {
  if (!currentUser || !db) return;

  const charsRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('characters');
  charsRef.onSnapshot((snapshot) => {
    const characters = [];
    snapshot.forEach((doc) => {
      characters.push({ id: doc.id, ...doc.data() });
    });
    charactersGlobal = characters;
    updateRosterUI(characters);
    updateDatalists(characters);
    populateFranchiseDropdowns();
    renderTournamentDraftRosterBoard();
    
    const charCountEl = document.getElementById('char-count');
    if (charCountEl) {
      charCountEl.innerText = characters.length;
    }

    if (window.currentInspectedCharId) {
      refreshInspectedCharacterView();
    }
    refreshActiveBattleView();
  }, (err) => console.error(err));

  const battlesRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('battles');
  battlesRef.onSnapshot((snapshot) => {
    const battles = [];
    snapshot.forEach((doc) => {
      battles.push({ id: doc.id, ...doc.data() });
    });
    battles.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    battlesGlobal = battles;
    if (window.communityFeedMode === 'matches') {
      updateBattlesUI(battles);
    }
    populateFranchiseDropdowns();
    
    const battleCountEl = document.getElementById('battle-count');
    if (battleCountEl) {
      battleCountEl.innerText = battles.length;
    }

    updateRosterUI(charactersGlobal);

    if (window.currentInspectedCharId) {
      refreshInspectedCharacterView();
    }
    refreshActiveBattleView();
  }, (err) => console.error(err));

  // TOURNAMENT OBSERVER
  const tournamentsRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('tournaments');
  tournamentsRef.onSnapshot((snapshot) => {
    const tours = [];
    snapshot.forEach((doc) => {
      tours.push({ id: doc.id, ...doc.data() });
    });
    tours.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    tournamentsGlobal = tours;
    
    const tourCountEl = document.getElementById('tournament-count');
    if (tourCountEl) {
      tourCountEl.innerText = tours.length;
    }

    if (window.communityFeedMode === 'tournaments') {
      updateTournamentsFeedUI();
    }

    // Keep active tour monitor state synchronized
    if (window.activeTournament) {
      const synchronizedTour = tours.find(item => item.id === window.activeTournament.id);
      if (synchronizedTour) {
        window.activeTournament = synchronizedTour;
        renderTournamentActiveDashboard();
      }
    }
  }, (err) => console.error(err));
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

function exportData() {
  if (charactersGlobal.length === 0 && battlesGlobal.length === 0 && tournamentsGlobal.length === 0) {
    openModal("No Data Found", "There is no character, battle, or tournament bracket data currently loaded to export.", "fa-solid fa-circle-exclamation");
    return;
  }
  
  const backup = {
    appId: appId,
    timestamp: Date.now(),
    characters: charactersGlobal,
    battles: battlesGlobal,
    tournaments: tournamentsGlobal
  };

  try {
    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `char-battle-archive.json`;
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    
    URL.revokeObjectURL(url);
    openModal("Export Complete", `Exported ${charactersGlobal.length} characters, ${battlesGlobal.length} battles, and ${tournamentsGlobal.length} tournaments successfully.`, "fa-solid fa-circle-check");
  } catch (err) {
    openModal("Export Interrupted", "Your browser blocked this download: " + err.message, "fa-solid fa-circle-exclamation");
  }
}

async function handleImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      const charactersToImport = data.characters || [];
      const battlesToImport = data.battles || [];
      const tournamentsToImport = data.tournaments || [];

      openModal("Synchronizing Records...", `Importing data files: ${charactersToImport.length} characters, ${battlesToImport.length} battles, and ${tournamentsToImport.length} tournaments...`, "fa-solid fa-spinner animate-spin");

      let importedChars = 0;
      let importedBattles = 0;
      let importedTours = 0;

      for (const char of charactersToImport) {
        const cleanBase = cleanBaseName(char.baseName || char.name);
        const varClean = cleanVariantName(char.variant || 'Default');
        const cleanFran = char.franchise || char.mediaSource || 'Unknown';
        const id = generateCharacterId(cleanBase, varClean, cleanFran);
        
        const payload = {
          name: char.name || cleanBase,
          baseName: cleanBase,
          variant: varClean,
          realName: char.realName || 'Unknown',
          publisher: char.publisher || 'Indie',
          powers: char.powers || [],
          alignment: char.alignment || 'Neutral',
          height: char.height || 'Unknown',
          weight: char.weight || 'Unknown',
          personality: char.personality || '',
          bio: char.bio || '',
          mediaSource: char.mediaSource || '',
          franchise: cleanFran,
          imageUrl: char.imageUrl || '',
          wikiLink: char.wikiLink || '',
          createdTimestamp: char.createdTimestamp || Date.now()
        };

        if (db && currentUser) {
          const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('characters').doc(id);
          await docRef.set(payload);
        } else {
          localDbEngine.saveCharacter(payload);
        }
        importedChars++;
      }

      for (const battle of battlesToImport) {
        const alreadyExists = battlesGlobal.some(b => 
          b.timestamp === battle.timestamp && 
          b.fighterAName === battle.fighterAName && 
          b.fighterBName === battle.fighterBName
        );

        if (!alreadyExists) {
          const cleanA = cleanBaseName(battle.fighterAName);
          const cleanB = cleanBaseName(battle.fighterBName);
          const varA = parseNameAndVariant(battle.fighterAName).variant;
          const varB = parseNameAndVariant(battle.fighterBName).variant;

          const payload = {
            fighterAId: battle.fighterAId || generateCharacterId(cleanA, varA, ''),
            fighterBId: battle.fighterBId || generateCharacterId(cleanB, varB, ''),
            fighterAName: battle.fighterAName,
            fighterBName: battle.fighterBName,
            predictedWinner: battle.predictedWinner,
            winProbability: battle.winProbability || '80%',
            phase1Setup: battle.phase1Setup || '',
            phase2MidGame: battle.phase2MidGame || '',
            phase3Climax: battle.phase3Climax || '',
            verdictSummary: battle.verdictSummary || '',
            timestamp: battle.timestamp || Date.now(),
            battleSceneImgUrl: battle.battleSceneImgUrl || '',
            dispute: battle.dispute || '',
            customBattleground: battle.customBattleground || '',
            customRules: battle.customRules || '',
            customHandicaps: battle.customHandicaps || ''
          };

          if (db && currentUser) {
            const battlesRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('battles');
            await battlesRef.add(payload);
          } else {
            localDbEngine.saveBattle(payload);
          }
          importedBattles++;
        }
      }

      for (const t of tournamentsToImport) {
        const alreadyExists = tournamentsGlobal.some(item => item.id === t.id);
        if (!alreadyExists) {
          if (db && currentUser) {
            const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('tournaments').doc(t.id);
            await docRef.set(t);
          } else {
            localDbEngine.saveTournament(t);
          }
          importedTours++;
        }
      }

      if (!db) loadLocalData();

      openModal("Sync Succeeded", `Successfully imported ${importedChars} character profiles, ${importedBattles} battles, and ${importedTours} bracket tournaments.`, "fa-solid fa-circle-check");
    } catch (err) {
      openModal("Restore Interruption", "An error occurred during JSON restoration: " + err.message, "fa-solid fa-circle-exclamation");
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

async function executeDatabasePurge() {
  try {
    if (db && currentUser) {
      const batchLimit = 500;
      
      // Clear Cloud Characters
      const charsSnap = await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('characters').get();
      let charBatch = db.batch();
      let count = 0;
      for (const doc of charsSnap.docs) {
        charBatch.delete(doc.ref);
        count++;
        if (count >= batchLimit) {
          await charBatch.commit();
          charBatch = db.batch();
          count = 0;
        }
      }
      if (count > 0) {
        await charBatch.commit();
      }

      // Clear Cloud Battles
      const battlesSnap = await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('battles').get();
      let battleBatch = db.batch();
      count = 0;
      for (const doc of battlesSnap.docs) {
        battleBatch.delete(doc.ref);
        count++;
        if (count >= batchLimit) {
          await battleBatch.commit();
          battleBatch = db.batch();
          count = 0;
        }
      }
      if (count > 0) {
        await battleBatch.commit();
      }

      // Clear Cloud Tournaments
      const toursSnap = await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('tournaments').get();
      let tourBatch = db.batch();
      count = 0;
      for (const doc of toursSnap.docs) {
        tourBatch.delete(doc.ref);
        count++;
        if (count >= batchLimit) {
          await tourBatch.commit();
          tourBatch = db.batch();
          count = 0;
        }
      }
      if (count > 0) {
        await tourBatch.commit();
      }
    }

    // Wipe Local Sandbox Engine Data
    localStorage.removeItem('battle_lab_characters');
    localStorage.removeItem('battle_lab_battles');
    localStorage.removeItem('battle_lab_tournaments');

    // Reset global local cache
    charactersGlobal = [];
    battlesGlobal = [];
    tournamentsGlobal = [];

    // Clear interface feeds
    updateRosterUI([]);
    updateBattlesUI([]);
    updateTournamentsFeedUI();
    updateDatalists([]);
    populateFranchiseDropdowns();

    // Reset system counters
    const charCountEl = document.getElementById('char-count');
    if (charCountEl) charCountEl.innerText = "0";
    const battleCountEl = document.getElementById('battle-count');
    if (battleCountEl) battleCountEl.innerText = "0";
    const tourCountEl = document.getElementById('tournament-count');
    if (tourCountEl) tourCountEl.innerText = "0";

    // Collapse active simulation reports
    document.getElementById('results-card').classList.add('hidden');
    document.getElementById('tournament-active-card').classList.add('hidden');
    window.activeTournament = null;

    closeModal();
    openModal("System Cleaned", "Your database has been wiped clean. You now have a blank canvas!", "fa-solid fa-trash-can text-red-400");
  } catch (err) {
    closeModal();
    console.error("Purge script interrupted:", err);
    openModal("Purge Failed", "An error occurred while cleaning the database: " + err.message, "fa-solid fa-triangle-exclamation");
  }
}