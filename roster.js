/**
 * Battle Lab - Roster Management Script
 *
 * This file contains all JavaScript logic for managing the character roster,
 * including the main feed, the database explorer modal, the character dossier viewer,
 * and the functionality for adding, editing, and deleting characters.
 */

//! ROSTER & CHARACTER MANAGEMENT

// Updates the main character roster feed on the right column
function updateRosterUI(chars) {
    const rosterFeed = document.getElementById('roster-feed');
    if (chars.length === 0) {
      rosterFeed.innerHTML = `
          <div class="flex flex-col items-center justify-center h-full text-slate-500 py-8">
            <i class="fa-solid fa-box-open mb-2 text-lg"></i>
            <p class="text-[11px]">No combatants in system database yet. Simulate the first matchup to add them!</p>
          </div>
        `;
      return;
    }

    // Rank characters based on dynamic live fight records
    const rankedChars = [...chars].map(c => ({
      ...c,
      _stats: calculateBattleStats(c)
    })).sort((a, b) => b._stats.total - a._stats.total);

    rosterFeed.innerHTML = rankedChars.slice(0, 15).map(c => {
      const alignmentColor = c.alignment === 'Good' ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50' : c.alignment === 'Evil' ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50' : 'border-slate-800 bg-slate-900/60 hover:border-slate-600';
      const alignmentTextClass = c.alignment === 'Good' ? 'text-emerald-400' : c.alignment === 'Evil' ? 'text-red-400' : 'text-slate-400';
      const cleanBase = cleanBaseName(c.baseName || c.name);
      const displayName = cleanBase + (c.variant && c.variant.toLowerCase() !== 'default' ? ` (${cleanVariantName(c.variant)})` : '');
      
      const avatarImg = c.imageUrl 
        ? `<img referrerpolicy="no-referrer" src="${c.imageUrl}" class="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" onerror="this.onerror=null; this.src='https://placehold.co/100x100/1e293b/94a3b8?text=${encodeURIComponent(cleanBase.substring(0, 2))}';">`
        : `<div class="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0"><i class="fa-solid fa-user-ninja text-xs"></i></div>`;

      // Dynamic badge: Display battle count if they've had matches, fallback to classic alignment
      const rightBadge = c._stats.total > 0 
        ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800/40 text-purple-400 shrink-0 font-extrabold flex items-center gap-1" title="${c._stats.total} battles recorded"><i class="fa-solid fa-fire text-[8px]"></i>${c._stats.total}</span>`
        : `<span class="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800/80 shrink-0 ${alignmentTextClass}">${escapeHtml(c.alignment || 'Neutral')}</span>`;

      return `
          <div class="p-2 rounded-xl border ${alignmentColor} flex items-center justify-between space-x-2.5 transition cursor-pointer" onclick="inspectCharacter('${c.id}')">
            <div class="flex items-center space-x-2 overflow-hidden">
              ${avatarImg}
              <div class="overflow-hidden">
                <div class="flex items-center space-x-1.5">
                  <span class="font-bold text-xs text-slate-100 truncate">${escapeHtml(displayName)}</span>
                </div>
                <p class="text-[9px] text-slate-500 truncate italic">${escapeHtml(c.franchise || c.mediaSource || c.publisher || 'Unknown')}</p>
              </div>
            </div>
            ${rightBadge}
          </div>
        `;
    }).join('');
}

// Filters the main roster feed based on search input
function filterRoster() {
    const q = document.getElementById('roster-search').value.toLowerCase().trim();
    const filtered = charactersGlobal.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.realName && c.realName.toLowerCase().includes(q)) || 
      (c.franchise && c.franchise.toLowerCase().includes(q)) ||
      (c.mediaSource && c.mediaSource.toLowerCase().includes(q)) ||
      (c.publisher && c.publisher.toLowerCase().includes(q)) ||
      (c.variant && c.variant.toLowerCase().includes(q))
    );
    updateRosterUI(filtered);
}

//! CHARACTER EXPLORER MODAL

function openRosterExplorer() {
    document.getElementById('roster-explorer-modal').classList.remove('hidden');
    applyRosterExplorerFilters(false);
}

function closeRosterExplorer() {
    document.getElementById('roster-explorer-modal').classList.add('hidden');
}

function changeCharLimit() {
    window.charItemsPerPage = parseInt(document.getElementById('explorer-char-limit').value) || 25;
    window.charCurrentPage = 1;
    applyRosterExplorerFilters(true);
}

function changeCharPage(newPage) {
    window.charCurrentPage = newPage;
    applyRosterExplorerFilters(true);
}

function applyRosterExplorerFilters(keepPage = false) {
    if (!keepPage) {
      window.charCurrentPage = 1;
    }

    const q = document.getElementById('explorer-char-search').value.toLowerCase().trim();
    const alignment = document.getElementById('explorer-char-alignment').value;
    const franchise = document.getElementById('explorer-char-franchise').value;
    const sortVal = document.getElementById('explorer-char-sort').value;

    let filtered = [...charactersGlobal];

    if (q) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.realName && c.realName.toLowerCase().includes(q)) || 
        (c.franchise && c.franchise.toLowerCase().includes(q)) ||
        (c.mediaSource && c.mediaSource.toLowerCase().includes(q))
      );
    }

    if (alignment !== 'All') {
      filtered = filtered.filter(c => c.alignment === alignment);
    }

    if (franchise !== 'All') {
      filtered = filtered.filter(c => (c.franchise || c.mediaSource) === franchise);
    }

    if (sortVal === 'AZ') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortVal === 'ZA') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortVal === 'Newest') {
      filtered.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
    } else if (sortVal === 'Fights') {
      filtered.sort((a, b) => {
        const statsA = calculateBattleStats(a);
        const statsB = calculateBattleStats(b);
        return statsB.total - statsA.total; // Highest total fights first
      });
    } else if (sortVal === 'Franchise') {
      filtered.sort((a, b) => {
        const franA = a.franchise || a.mediaSource || 'Unknown';
        const franB = b.franchise || b.mediaSource || 'Unknown';
        return franA.localeCompare(franB);
      });
    }

    // Compute Pagination Metrics
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / window.charItemsPerPage) || 1;

    if (window.charCurrentPage > totalPages) {
      window.charCurrentPage = totalPages;
    }
    if (window.charCurrentPage < 1) {
      window.charCurrentPage = 1;
    }

    const startIndex = (window.charCurrentPage - 1) * window.charItemsPerPage;
    const endIndex = startIndex + window.charItemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    renderRosterExplorerGrid(paginated);
    renderRosterExplorerPagination(window.charCurrentPage, totalPages, totalItems);
}

function renderRosterExplorerPagination(currentPage, totalPages, totalItems) {
    const container = document.getElementById('explorer-char-pagination');
    if (!container) return;

    if (totalItems === 0) {
      container.innerHTML = '';
      return;
    }

    const startIdx = (currentPage - 1) * window.charItemsPerPage + 1;
    const endIdx = Math.min(currentPage * window.charItemsPerPage, totalItems);

    container.innerHTML = `
        <div class="text-slate-400">
          Showing <span class="font-bold text-slate-200">${startIdx}</span> to <span class="font-bold text-slate-200">${endIdx}</span> of <span class="font-bold text-slate-200">${totalItems}</span> characters
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="changeCharPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} 
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-200 rounded-lg transition font-semibold flex items-center gap-1">
            <i class="fa-solid fa-chevron-left text-[10px]"></i> Prev
          </button>
          <span class="text-slate-300 px-3 bg-slate-950/60 py-1.5 rounded-lg border border-slate-850">
            Page <span class="text-purple-400 font-extrabold">${currentPage}</span> of ${totalPages}
          </span>
          <button onclick="changeCharPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} 
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-200 rounded-lg transition font-semibold flex items-center gap-1">
            Next <i class="fa-solid fa-chevron-right text-[10px]"></i>
          </button>
        </div>
      `;
}

function renderRosterExplorerGrid(chars) {
    const container = document.getElementById('explorer-char-grid');
    if (chars.length === 0) {
      container.innerHTML = `
          <div class="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
            <i class="fa-solid fa-folder-open mb-3 text-3xl"></i>
            <span class="text-sm">No matched characters found in this database scope.</span>
          </div>
        `;
      return;
    }

    container.innerHTML = chars.map(c => {
      const alignmentColor = c.alignment === 'Good' ? 'border-emerald-500/30 bg-emerald-500/5' : c.alignment === 'Evil' ? 'border-red-500/30 bg-red-500/5' : 'border-slate-800 bg-slate-900/40';
      const alignmentTextClass = c.alignment === 'Good' ? 'text-emerald-400' : c.alignment === 'Evil' ? 'text-red-400' : 'text-slate-400';
      const cleanBase = cleanBaseName(c.baseName || c.name);
      const displayName = cleanBase + (c.variant && c.variant.toLowerCase() !== 'default' ? ` (${cleanVariantName(c.variant)})` : '');

      const avatarImg = c.imageUrl 
        ? `<img referrerpolicy="no-referrer" src="${c.imageUrl}" class="w-full h-32 object-contain bg-slate-950/60 p-2 border-b border-slate-800 shrink-0" onerror="this.onerror=null; this.src='https://placehold.co/300x150/1e293b/94a3b8?text=${encodeURIComponent(cleanBase)}';">`
        : `<div class="w-full h-32 bg-slate-950/80 border-b border-slate-800 flex items-center justify-center text-slate-600 shrink-0"><i class="fa-solid fa-mask text-3xl"></i></div>`;

      return `
          <div class="border ${alignmentColor} rounded-xl overflow-hidden hover:border-slate-500 transition cursor-pointer flex flex-col justify-between h-auto min-h-[260px] bg-slate-950" onclick="inspectCharacter('${c.id}')">
            <div class="flex flex-col flex-grow">
              ${avatarImg}
              <div class="p-3 space-y-1.5 flex-grow">
                <div class="flex items-start justify-between gap-1.5">
                  <h4 class="font-extrabold text-xs text-slate-100 truncate max-w-[130px]" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</h4>
                  <span class="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0 ${alignmentTextClass}">${escapeHtml(c.alignment || 'Neutral')}</span>
                </div>
                <p class="text-[10px] text-purple-400 font-semibold truncate"><i class="fa-solid fa-gamepad text-[8px] mr-1"></i>${escapeHtml(c.franchise || c.mediaSource || 'Unknown')}</p>
                <p class="text-[9px] text-slate-500 truncate italic">Publisher: ${escapeHtml(c.publisher || 'Unknown')}</p>
              </div>
            </div>
            <div class="px-3 pb-3 pt-2 border-t border-slate-850/60 flex items-center justify-between text-[9px] text-slate-400 shrink-0 bg-slate-950/40">
              <span>H: ${escapeHtml(c.height || 'N/A')}</span>
              <span>W: ${escapeHtml(c.weight || 'N/A')}</span>
            </div>
          </div>
        `;
    }).join('');
}

function clearRosterFilters() {
    document.getElementById('explorer-char-search').value = '';
    document.getElementById('explorer-char-alignment').value = 'All';
    document.getElementById('explorer-char-franchise').value = 'All';
    document.getElementById('explorer-char-sort').value = 'AZ';
    document.getElementById('explorer-char-limit').value = '25';
    window.charItemsPerPage = 25;
    window.charCurrentPage = 1;
    applyRosterExplorerFilters(true);
}

//! ADD CHARACTER MODALS & AI SCOUT

function triggerAddCharacterHub() {
    document.getElementById('add-char-modal').classList.remove('hidden');
}

function closeAddCharacterHub() {
    document.getElementById('add-char-modal').classList.add('hidden');
}

function selectAddRoute(route) {
    closeAddCharacterHub();
    if (route === 'ai') {
      document.getElementById('ai-scout-name').value = '';
      document.getElementById('ai-scout-variant').value = '';
      document.getElementById('ai-scout-franchise').value = '';
      document.getElementById('ai-scout-modal').classList.remove('hidden');
    } else if (route === 'random') {
      executeRandomPopularScout();
    } else {
      const tempId = 'temp-' + Date.now();
      window.currentInspectedCharId = tempId;
      
      setDossierMode('edit');

      document.getElementById('edit-name').value = '';
      document.getElementById('edit-variant').value = 'Default';
      document.getElementById('edit-real-name').value = '';
      document.getElementById('edit-publisher').value = '';
      document.getElementById('edit-franchise').value = '';
      document.getElementById('edit-media-source').value = '';
      document.getElementById('edit-wiki-link').value = '';
      document.getElementById('edit-height').value = '';
      document.getElementById('edit-weight').value = '';
      document.getElementById('edit-alignment').value = 'Good';
      document.getElementById('edit-image-url').value = '';
      document.getElementById('edit-powers').value = '';
      document.getElementById('edit-bio').value = '';
      document.getElementById('edit-personality').value = '';

      document.getElementById('dossier-name').innerText = 'Unregistered Character';
      document.getElementById('dossier-img').src = 'https://placehold.co/400x300/0f172a/94a3b8?text=Custom+Hero';
      document.getElementById('dossier-image-input').value = '';
      document.getElementById('dossier-wiki').classList.add('hidden');

      document.getElementById('dossier-variant-container').classList.add('hidden');
      document.getElementById('delete-char-btn').classList.add('hidden');

      document.getElementById('save-dossier-changes-btn').onclick = () => saveDossierChanges(tempId, true);

      document.getElementById('dossier-modal').classList.remove('hidden');
    }
}

async function executeRandomPopularScout() {
    let existingFranchises = [...new Set(charactersGlobal.map(c => c.franchise || c.mediaSource).filter(Boolean))];
    let existingCharacters = charactersGlobal.map(c => {
      const cleanBase = cleanBaseName(c.baseName || c.name);
      const cleanVar = cleanVariantName(c.variant || 'Default');
      return cleanVar.toLowerCase() !== 'default' ? `${cleanBase} (${cleanVar})` : cleanBase;
    });

    // A rich fallback list of battle-focused franchises if the local DB is fresh or empty
    const backupFranchises = [
      'Sonic the Hedgehog', 'Super Mario', 'The Legend of Zelda', 'Jujutsu Kaisen',
      'Demon Slayer: Kimetsu no Yaiba', 'Dragon Ball', 'Naruto', 'Bleach',
      'My Hero Academia', 'Avatar: The Last Airbender', 'Marvel Comics', 'DC Comics',
      'Metroid', 'Street Fighter', 'Mortal Kombat', 'Final Fantasy VII', 'One Piece',
      'Hunter x Hunter', 'Chainsaw Man', 'Cyberpunk 2077', 'Elden Ring', 'Halo'
    ];
    
    const targetFranchisesList = existingFranchises.length > 0 ? existingFranchises : backupFranchises;

    openModal(
      "Cosmic Recruiter Dispatched...", 
      "AI is scouting a cool franchise and selecting a popular character missing from your roster...", 
      "fa-solid fa-satellite-dish animate-pulse text-emerald-400"
    );

    try {
      const systemPrompt = `You are a multiverse character archiver. Choose a franchise from the provided list (or select a highly similar popular gaming, anime, or comic universe not listed).
Then, choose an iconic, highly capable, and combat-relevant character from that franchise who is NOT already present in our roster.
Gather comprehensive background details and output them in valid JSON.
You MUST use google search to get accurate real-world data and find a working, direct, hotlinkable image URL for this character's portrait.

CRITICAL PORTRAIT URL RULES:
- Do NOT manually construct, guess, or fabricate Wikia/Fandom image URLs (e.g., guessing directory hashes like '/images/a/a2/'). These paths require exact MD5 hashes of the filename and guessing them will result in broken 404 links.
- You MUST ONLY use the actual, verbatim image URLs found directly in your google_search results.
- If no verified direct image URL is available in your search results, set "imageUrl" to an empty string ("") so the system can dynamically render a high-quality stylized placeholder.`;

      const userPrompt = `Existing Characters in database roster (DO NOT choose any of these): ${JSON.stringify(existingCharacters)}
Suggested Franchise candidates (or similar battle/combat universes): ${JSON.stringify(targetFranchisesList)}

Select a unique, popular combat character that is completely missing from the existing characters list.
Output MUST match this strict JSON structure:
{
  "name": "Base Name of character",
  "realName": "Official civilian identity / real name",
  "publisher": "Creator company (e.g., Sega, Capcom, Nintendo, Shueisha, Marvel, DC)",
  "powers": ["Power 1", "Power 2", "Power 3", "Power 4"],
  "alignment": "Good or Evil or Neutral",
  "height": "Height stats (e.g. 5'11\")",
  "weight": "Weight stats (e.g. 170 lbs)",
  "personality": "Detailed combat behavior profile",
  "bio": "Comprehensive origin history",
  "mediaSource": "Core game title, anime, or comic universe source",
  "franchise": "Standardized core franchise grouping name (e.g. 'Sonic the Hedgehog', 'Naruto', 'Marvel Comics')",
  "imageUrl": "Direct web link to an official raw portrait image (MUST end in .jpg, .png, or .webp)",
  "wikiLink": "Fandom wiki page URL of this character"
}`;

      const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
      };

      const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!jsonText) throw new Error("Empty response from database engine.");
      const profileResult = JSON.parse(jsonText);

      const varClean = 'Default';
      const baseClean = cleanBaseName(profileResult.name);
      const docId = generateCharacterId(baseClean, varClean, profileResult.franchise || profileResult.mediaSource);

      let portraitUrl = profileResult.imageUrl || "";
      const compressedPortrait = await compressBase64Image(portraitUrl, 300, 300, 0.8);

      const finalPayload = {
        name: baseClean,
        baseName: baseClean,
        variant: varClean,
        realName: profileResult.realName || 'Unknown',
        publisher: profileResult.publisher || 'Indie',
        mediaSource: profileResult.mediaSource || '',
        franchise: profileResult.franchise || profileResult.mediaSource || 'Unknown',
        wikiLink: profileResult.wikiLink || '',
        height: profileResult.height || 'Unknown',
        weight: profileResult.weight || 'Unknown',
        alignment: profileResult.alignment || 'Neutral',
        imageUrl: compressedPortrait,
        powers: profileResult.powers || [],
        bio: profileResult.bio || '',
        personality: profileResult.personality || '',
        createdTimestamp: Date.now()
      };

      if (db && currentUser) {
        const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('characters').doc(docId);
        await docRef.set(finalPayload);
      } else {
        localDbEngine.saveCharacter(finalPayload);
        loadLocalData();
      }

      closeModal();
      inspectCharacter(docId);

    } catch (err) {
      console.error("AI Surprise Scout crashed:", err);
      openModal("AI Scout Offline", "Could not complete surprise registration: " + err.message, "fa-solid fa-triangle-exclamation");
    }
}

function closeAiScoutModal() {
    document.getElementById('ai-scout-modal').classList.add('hidden');
}

async function executeAiRosterScout() {
    const scoutName = document.getElementById('ai-scout-name').value.trim();
    const scoutVariant = document.getElementById('ai-scout-variant').value.trim();
    const scoutFranchise = document.getElementById('ai-scout-franchise').value.trim();

    if (!scoutName) {
      openModal("Incomplete Profile Request", "Please specify a character identity to launch AI Scout.", "fa-solid fa-circle-exclamation");
      return;
    }

    closeAiScoutModal();
    openModal("Multiverse Roster Scout active...", `AI is researching and building profile files for ${scoutName}...`, "fa-solid fa-satellite-dish animate-pulse text-purple-400");

    try {
      const systemPrompt = `You are a multiverse character archiver. Gather comprehensive background details on the specified character variant and output them in valid JSON. You MUST use google search to get accurate real-world data and find a working, direct, hotlinkable image URL for this character's portrait.

CRITICAL PORTRAIT URL RULES:
- Do NOT manually construct, guess, or fabricate Wikia/Fandom image URLs (e.g., guessing directory hashes like '/images/a/a2/'). These paths require exact MD5 hashes of the filename and guessing them will result in broken 404 links.
- You MUST ONLY use the actual, verbatim image URLs found directly in your google_search results.
- If no verified direct image URL is available in your search results, set "imageUrl" to an empty string ("") so the system can dynamically render a high-quality stylized placeholder.`;
      
      const userPrompt = `Build an official biography folder for:
Character Name: "${scoutName}" 
${scoutFranchise ? `Franchise/Lore Context: "${scoutFranchise}"` : ''}
Variant: "${scoutVariant || 'Default'}"

Output MUST match this strict JSON structure:
{
  "name": "${scoutName}",
  "realName": "Official civilian identity / real name",
  "publisher": "Creator company (e.g. Sega, Capcom, Nintendo, Valve)",
  "powers": ["Power 1", "Power 2", "Power 3"],
  "alignment": "Good or Evil or Neutral",
  "height": "Height stats",
  "weight": "Weight stats",
  "personality": "Detailed combat behavior profile",
  "bio": "Comprehensive origin history",
  "mediaSource": "Core game title or comic universe",
  "franchise": "${scoutFranchise || `Standardized core franchise grouping name (e.g. 'Sonic the Hedgehog', 'Super Mario', 'Metroid')`}",
  "imageUrl": "Direct web link to a real official raw portrait image (MUST end in .jpg, .png, or .webp)",
  "wikiLink": "Fandom wiki page URL of this character"
}`;

      const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
      };

      const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!jsonText) throw new Error("Empty response from database engine.");
      const profileResult = JSON.parse(jsonText);

      const varClean = cleanVariantName(scoutVariant);
      const baseClean = cleanBaseName(profileResult.name);
      const docId = generateCharacterId(baseClean, varClean, profileResult.franchise || profileResult.mediaSource);

      let portraitUrl = profileResult.imageUrl || "";
      const compressedPortrait = await compressBase64Image(portraitUrl, 300, 300, 0.8);

      const finalPayload = {
        name: baseClean,
        baseName: baseClean,
        variant: varClean,
        realName: profileResult.realName || 'Unknown',
        publisher: profileResult.publisher || 'Indie',
        powers: profileResult.powers || [],
        alignment: profileResult.alignment || 'Neutral',
        height: profileResult.height || 'Unknown',
        weight: profileResult.weight || 'Unknown',
        personality: profileResult.personality || '',
        bio: profileResult.bio || '',
        mediaSource: profileResult.mediaSource || '',
        franchise: profileResult.franchise || profileResult.mediaSource || 'Unknown',
        imageUrl: compressedPortrait,
        wikiLink: profileResult.wikiLink || '',
        createdTimestamp: Date.now()
      };

      if (db && currentUser) {
        const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('characters').doc(docId);
        await docRef.set(finalPayload);
      } else {
        localDbEngine.saveCharacter(finalPayload);
        loadLocalData();
      }

      closeModal();
      inspectCharacter(docId);

    } catch (err) {
      console.error("AI Scout crashed:", err);
      openModal("AI Scout Offline", "Could not complete registration profile: " + err.message, "fa-solid fa-triangle-exclamation");
    }
}

//! CHARACTER DOSSIER MODAL

function inspectCharacter(charId) {
    const char = charactersGlobal.find(c => c.id === charId);
    if (!char) return;

    window.currentInspectedCharId = charId;
    setDossierMode('view');

    const baseNameVal = cleanBaseName(char.baseName || char.name).toLowerCase().trim();
    const linkedVariants = charactersGlobal.filter(c => {
      const cBase = cleanBaseName(c.baseName || c.name).toLowerCase().trim();
      return cBase === baseNameVal;
    });

    const varSelect = document.getElementById('dossier-variant-select');
    varSelect.innerHTML = linkedVariants.map(v => {
      const variantDisplay = v.variant || 'Default';
      return `<option value="${v.id}">${escapeHtml(variantDisplay)}</option>`;
    }).join('');
    
    varSelect.value = charId;
    document.getElementById('dossier-variant-container').classList.remove('hidden');
    document.getElementById('delete-char-btn').classList.remove('hidden');

    renderVariantView(char);

    document.getElementById('dossier-slot-a').onclick = function() {
      setFighter('A', char.baseName || char.name, char.variant || 'Default');
      closeDossier();
    };
    document.getElementById('dossier-slot-b').onclick = function() {
      setFighter('B', char.baseName || char.name, char.variant || 'Default');
      closeDossier();
    };

    document.getElementById('dossier-modal').classList.remove('hidden');
}

function changeDossierVariant() {
    const selectedCharId = document.getElementById('dossier-variant-select').value;
    if (selectedCharId) {
      inspectCharacter(selectedCharId);
    }
}

// Dynamic analytics checker mapping live records from the main battle archive
function calculateBattleStats(char) {
    if (!char) return { total: 0, wins: 0, losses: 0 };
    const base = cleanBaseName(char.baseName || char.name).toLowerCase().trim();
    const variant = cleanVariantName(char.variant || 'Default').toLowerCase().trim();
    
    let wins = 0;
    let losses = 0;
    
    const targetFullName = base + (variant && variant !== 'default' ? ` (${variant})` : '');
    
    battlesGlobal.forEach(b => {
      const fA = (b.fighterAName || '').toLowerCase().trim();
      const fB = (b.fighterBName || '').toLowerCase().trim();
      const winner = (b.predictedWinner || '').toLowerCase().trim();
      
      if (fA === targetFullName || fB === targetFullName) {
        if (winner === targetFullName) {
          wins++;
        } else {
          losses++;
        }
      }
    });
    
    return { total: wins + losses, wins, losses };
}

function renderVariantView(char) {
    const baseClean = cleanBaseName(char.baseName || char.name);
    const variantStr = char.variant && char.variant.toLowerCase() !== 'default' ? ` (${cleanVariantName(char.variant)})` : '';
    document.getElementById('dossier-name').innerText = baseClean + variantStr;
    
    document.getElementById('dossier-real-name').innerText = char.realName || 'Unknown Identity';
    document.getElementById('dossier-publisher').innerText = char.publisher || 'Indie';
    document.getElementById('dossier-media-source').innerText = (char.franchise || char.mediaSource || char.publisher || 'Unknown');
    document.getElementById('dossier-height').innerText = char.height || 'Unknown';
    document.getElementById('dossier-weight').innerText = char.weight || 'Unknown';
    document.getElementById('dossier-bio').innerText = char.bio || 'Detailed biography pending...';
    document.getElementById('dossier-personality').innerText = char.personality || 'Mindset profiling uninitialized.';
    
    const stats = calculateBattleStats(char);
    document.getElementById('dossier-total-battles').innerText = stats.total;
    document.getElementById('dossier-wins').innerText = stats.wins;
    document.getElementById('dossier-losses').innerText = stats.losses;

    const dossierImg = document.getElementById('dossier-img');
    setFighterImage(dossierImg, char.imageUrl, baseClean);

    const wikiBadge = document.getElementById('dossier-wiki');
    if (char.wikiLink) {
      wikiBadge.href = char.wikiLink;
      wikiBadge.classList.remove('hidden');
    } else {
      wikiBadge.classList.add('hidden');
    }

    document.getElementById('dossier-image-input').value = char.imageUrl || '';
    document.getElementById('update-image-btn').onclick = () => updateCharacterImage(char.id);
    
    const pFeed = document.getElementById('dossier-powers');
    const activePowers = char.powers || [];
    if (Array.isArray(activePowers) && activePowers.length > 0) {
      pFeed.innerHTML = activePowers.map(p => `<span class="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-semibold">${p}</span>`).join('');
    } else {
      pFeed.innerHTML = `<span class="text-xs text-slate-500">Unclassified power attributes.</span>`;
    }

    const alignBadge = document.getElementById('dossier-alignment');
    const activeAlignment = char.alignment || 'Neutral';
    alignBadge.innerText = activeAlignment;
    if (activeAlignment === 'Good') {
      alignBadge.className = "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    } else if (activeAlignment === 'Evil') {
      alignBadge.className = "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-500/10 border-red-500/20 text-red-400";
    } else {
      alignBadge.className = "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-950 border-slate-800 text-slate-400";
    }

    document.getElementById('edit-name').value = baseClean || '';
    document.getElementById('edit-variant').value = char.variant || 'Default';
    document.getElementById('edit-real-name').value = char.realName || '';
    document.getElementById('edit-publisher').value = char.publisher || '';
    document.getElementById('edit-franchise').value = char.franchise || char.mediaSource || '';
    document.getElementById('edit-media-source').value = char.mediaSource || '';
    document.getElementById('edit-wiki-link').value = char.wikiLink || '';
    document.getElementById('edit-height').value = char.height || '';
    document.getElementById('edit-weight').value = char.weight || '';
    document.getElementById('edit-alignment').value = activeAlignment;
    document.getElementById('edit-image-url').value = char.imageUrl || '';
    document.getElementById('edit-powers').value = Array.isArray(activePowers) ? activePowers.join(', ') : '';
    document.getElementById('edit-bio').value = char.bio || '';
    document.getElementById('edit-personality').value = char.personality || '';

    document.getElementById('save-dossier-changes-btn').onclick = () => saveDossierChanges(char.id);
}

function refreshInspectedCharacterView() {
    const charId = window.currentInspectedCharId;
    if (!charId || window.isDossierEditing) return;

    const char = charactersGlobal.find(c => c.id === charId);
    if (char) {
      renderVariantView(char);
    }
}

function closeDossier() {
    document.getElementById('dossier-modal').classList.add('hidden');
    window.currentInspectedCharId = null;
}

function setDossierMode(mode) {
    const viewContainer = document.getElementById('dossier-view-container');
    const editContainer = document.getElementById('dossier-edit-container');
    const toggleBtn = document.getElementById('toggle-edit-btn');
    const footer = document.getElementById('dossier-footer');

    if (mode === 'edit') {
      window.isDossierEditing = true;
      viewContainer.classList.add('hidden');
      editContainer.classList.remove('hidden');
      toggleBtn.innerHTML = `<i class="fa-solid fa-eye"></i> <span>View Profile</span>`;
      footer.classList.add('hidden');
    } else {
      window.isDossierEditing = false;
      viewContainer.classList.remove('hidden');
      editContainer.classList.add('hidden');
      toggleBtn.innerHTML = `<i class="fa-solid fa-user-pen"></i> <span>Edit Profile</span>`;
      footer.classList.remove('hidden');
    }
}

function toggleDossierEdit() {
    if (window.isDossierEditing) {
      setDossierMode('view');
    } else {
      setDossierMode('edit');
    }
}

async function saveDossierChanges(charId, isNew = false) {
    const nameInputVal = document.getElementById('edit-name').value.trim();
    const variantInputVal = document.getElementById('edit-variant').value.trim() || 'Default';
    const realName = document.getElementById('edit-real-name').value.trim();
    const publisher = document.getElementById('edit-publisher').value.trim();
    const franchise = document.getElementById('edit-franchise').value.trim();
    const mediaSource = document.getElementById('edit-media-source').value.trim();
    const wikiLink = document.getElementById('edit-wiki-link').value.trim();
    const height = document.getElementById('edit-height').value.trim();
    const weight = document.getElementById('edit-weight').value.trim();
    const alignment = document.getElementById('edit-alignment').value;
    const imageUrl = document.getElementById('edit-image-url').value.trim();
    const powersStr = document.getElementById('edit-powers').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const personality = document.getElementById('edit-personality').value.trim();

    if (!nameInputVal) {
      openModal("Invalid Entry", "The Character Name is required.", "fa-solid fa-triangle-exclamation");
      return;
    }

    const powers = powersStr ? powersStr.split(',').map(p => p.trim()).filter(p => p.length > 0) : [];

    try {
      const compressedUrl = await compressBase64Image(imageUrl, 300, 300, 0.8);
      const finalBaseClean = cleanBaseName(nameInputVal);
      const finalVarClean = cleanVariantName(variantInputVal);
      const finalDocId = generateCharacterId(finalBaseClean, finalVarClean, franchise || mediaSource);

      const savePayload = {
        name: finalBaseClean,
        baseName: finalBaseClean,
        variant: finalVarClean,
        realName,
        publisher,
        mediaSource,
        franchise: franchise || mediaSource || 'Unknown',
        wikiLink,
        height,
        weight,
        alignment,
        imageUrl: compressedUrl,
        powers,
        bio,
        personality
      };

      if (db && currentUser) {
        const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('characters').doc(finalDocId);
        await docRef.set(savePayload);
        
        if (!isNew && charId !== finalDocId) {
          const oldDocRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('characters').doc(charId);
          await oldDocRef.delete();
        }
      } else {
        localDbEngine.saveCharacter(savePayload);
        if (!isNew && charId !== finalDocId) {
          localDbEngine.deleteCharacter(charId);
        }
        loadLocalData();
      }

      window.currentInspectedCharId = finalDocId;
      setDossierMode('view');
      
      const saveBtn = document.getElementById('save-dossier-changes-btn');
      const oldContent = saveBtn.innerHTML;
      saveBtn.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400 animate-bounce"></i> Changes Saved!`;
      setTimeout(() => { saveBtn.innerHTML = oldContent; }, 2050);

      if (isNew) {
        inspectCharacter(finalDocId);
      }

    } catch (err) {
      openModal("Write Privilege Error", "Unable to sync profile configurations: " + err.message, "fa-solid fa-circle-exclamation");
    }
}

async function triggerDeleteCharacter() {
    const charId = window.currentInspectedCharId;
    if (!charId) return;

    const delBtn = document.getElementById('delete-char-btn');
    const delText = document.getElementById('delete-char-btn-text');

    if (delBtn.dataset.confirming === "true") {
      try {
        if (db && currentUser) {
          const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('characters').doc(charId);
          await docRef.delete();
        } else {
          localDbEngine.deleteCharacter(charId);
          loadLocalData();
        }
        closeDossier();
        openModal("Profile Erased", "Character has been removed.", "fa-solid fa-trash text-red-400");
      } catch (err) {
        openModal("Error", "Could not remove character profile: " + err.message, "fa-solid fa-triangle-exclamation");
      } finally {
        delBtn.dataset.confirming = "false";
        delText.innerText = "Delete Profile";
        delBtn.className = "px-4 py-2 bg-red-950/40 hover:bg-red-900/20 text-red-400 hover:text-red-300 text-xs font-bold rounded-lg border border-red-900/30 transition flex items-center gap-1";
      }
    } else {
      delBtn.dataset.confirming = "true";
      delText.innerText = "Confirm Delete?";
      delBtn.className = "px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg transition flex items-center gap-1";

      const resetHandler = function() {
        delBtn.dataset.confirming = "false";
        delText.innerText = "Delete Profile";
        delBtn.className = "px-4 py-2 bg-red-950/40 hover:bg-red-900/20 text-red-400 hover:text-red-300 text-xs font-bold rounded-lg border border-red-900/30 transition flex items-center gap-1";
        delBtn.removeEventListener('mouseleave', resetHandler);
      };
      delBtn.addEventListener('mouseleave', resetHandler);
    }
}

async function updateCharacterImage(charId) {
    const newUrl = document.getElementById('dossier-image-input').value.trim();
    try {
      const compressedUrl = await compressBase64Image(newUrl, 300, 300, 0.8);
      if (db && currentUser) {
        const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('characters').doc(charId);
        await docRef.update({ imageUrl: compressedUrl });
      } else {
        const char = charactersGlobal.find(c => c.id === charId);
        if (char) {
          char.imageUrl = compressedUrl;
          localDbEngine.saveCharacter(char);
          loadLocalData();
        }
      }
      
      const imgEl = document.getElementById('dossier-img');
      setFighterImage(imgEl, compressedUrl, 'Updated');
      document.getElementById('edit-image-url').value = compressedUrl;

      const btn = document.getElementById('update-image-btn');
      const oldText = btn.innerText;
      btn.innerText = "Saved!";
      setTimeout(() => btn.innerText = oldText, 2000);
    } catch (err) {
      openModal("Update Failed", "Could not save image.", "fa-solid fa-exclamation-triangle");
    }
}

async function generateAIPortrait(charName, publisher, alignment) {
  const prompt = `Stylized highly detailed comic book headshot profile portrait artwork of the superhero character ${charName} from ${publisher || 'multiverse lore'}. Highly detailed, professional graphic novel art style, vibrant colors, ${alignment === 'Evil' ? 'sinister dramatic lighting' : 'heroic epic lighting'}. Portrait framing.`;
  
  const payload = {
    instances: { prompt: prompt },
    parameters: { sampleCount: 1 }
  };

  try {
    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    
    if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
      return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
    }
  } catch (err) {
    console.error("Imagen portrait build error:", err);
  }
  return null;
}

async function triggerAIPortraitGeneration() {
    const charId = window.currentInspectedCharId;
    if (!charId) return;

    const btn = document.getElementById('generate-ai-portrait-btn');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Paint AI Portrait...`;

    try {
      const char = charactersGlobal.find(c => c.id === charId);
      if (!char) return;

      let targetName = cleanBaseName(char.baseName || char.name);
      if (char.variant && char.variant.toLowerCase() !== "default") {
        targetName = `${targetName} (${cleanVariantName(char.variant)} variant)`;
      }

      const generatedUrl = await generateAIPortrait(targetName, char.publisher, char.alignment);
      if (generatedUrl) {
        const compressedPortrait = await compressBase64Image(generatedUrl, 300, 300, 0.8);
        
        if (db && currentUser) {
          const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('characters').doc(charId);
          await docRef.update({ imageUrl: compressedPortrait });
        } else {
          char.imageUrl = compressedPortrait;
          localDbEngine.saveCharacter(char);
          loadLocalData();
        }

        const dossierImg = document.getElementById('dossier-img');
        dossierImg.src = compressedPortrait;
        document.getElementById('edit-image-url').value = compressedPortrait;
        document.getElementById('dossier-image-input').value = compressedPortrait;

        btn.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> Done!`;
      } else {
        throw new Error("Empty image array.");
      }
    } catch (err) {
      console.error("Art generation failed:", err);
      openModal("Canvas Pipeline Interrupt", "Could not paint AI portrait: " + err.message, "fa-solid fa-circle-exclamation");
      btn.innerHTML = `<i class="fa-solid fa-circle-xmark text-red-400"></i> Generation Failed`;
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }, 2000);
    }
}