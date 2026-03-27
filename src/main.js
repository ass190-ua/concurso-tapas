import { loginUser, getCurrentUser, logoutUser, fetchTapas, fetchVotesForUser, submitVote, fetchRankingForUser, submitRanking, fetchAllVotes, subscribeToVotes, fetchAllRankings, subscribeToRankings } from './supabase.js';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });


// ---- DOM ELEMENTS ----
// Screens
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const rankingsScreen = document.getElementById('rankings-screen');
const consensusScreen = document.getElementById('consensus-screen');
const mainNav = document.getElementById('main-nav');
const navHome = document.getElementById('nav-home');
const navRank = document.getElementById('nav-rank');
const navCon = document.getElementById('nav-con');

// Login
const loginForm = document.getElementById('login-form');
const targetUser = document.getElementById('username');
const targetPass = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const loginBtnText = loginBtn.querySelector('span');
const loginLoader = document.getElementById('login-loader');

// Dashboard
const tapasGrid = document.getElementById('tapas-grid');
const userGreeting = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');
const rankingsContainer = document.getElementById('rankings-container');
const consensusContainer = document.getElementById('consensus-container');

// Drawers
const drawerOverlay = document.getElementById('drawer-overlay');
const detailDrawer = document.getElementById('detail-drawer');
const voteDrawer = document.getElementById('vote-drawer');
const rankingDrawer = document.getElementById('ranking-drawer');

// Ranking
const openRankingBtn = document.getElementById('open-ranking-btn');
const rankingListContainer = document.getElementById('ranking-list');
const saveRankingBtn = document.getElementById('save-ranking-btn');
const rankingLoader = document.getElementById('ranking-loader');
const saveBtnText = saveRankingBtn.querySelector('span');

// Details
const detailImg = document.getElementById('detail-img');
const detailCreator = document.getElementById('detail-creator');
const detailTitle = document.getElementById('detail-title');
const detailDesc = document.getElementById('detail-desc');
const openVoteBtn = document.getElementById('open-vote-btn');
const voteMsg = document.getElementById('vote-msg');

// Voting
const voteCriteriaContainer = document.getElementById('vote-criteria-container');
const submitVoteBtn = document.getElementById('submit-vote-btn');
const submitBtnText = submitVoteBtn.querySelector('span');
const voteLoader = document.getElementById('vote-loader');
const voteTitleRef = document.getElementById('vote-title-ref');
const toast = document.getElementById('toast');

// ---- STATE ----
let currentUser = null;
let tapasData = [];
let userVotes = [];
let allVotesData = [];
let allRankingsData = [];
let currentTapaContext = null;
let currentRankingOrder = [];
let voteSubscription = null;
let rankingSubscription = null;

const criteriaKeys = [
  { key: 'score_visual', label: 'Aspecto Visual' },
  { key: 'score_sabor', label: 'Sabor' },
  { key: 'score_originalidad', label: 'Originalidad' },
  { key: 'score_final', label: 'Nota Final' }
];

let activeVoteState = {
  score_visual: 0,
  score_sabor: 0,
  score_originalidad: 0,
  score_final: 0
};

// SVG fork and knife icon
const forkIcon = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11 9H9V2H7V9H5V2H3V9c0 2.12 1.66 3.84 3.75 3.97V22h1.5V13C10.34 12.84 12 11.12 12 9V2H10V9zm5-7v16h2V11c0 0 3-1.49 3-5V2c-4.12 0-5 4-5 4z"/></svg>`;

// ---- UTILS ----
const showToast = (message) => {
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
};

// ---- INIT ----
const init = async () => {
  currentUser = getCurrentUser();
  if (currentUser) {
    showDashboard();
  } else {
    loginScreen.classList.add('active');
  }
};

// ---- LOGIN LOGIC ----
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const uname = targetUser.value.trim();
  const pwd = targetPass.value.trim();
  
  if (!uname || !pwd) return;

  // UI state
  loginBtn.disabled = true;
  loginBtnText.style.display = 'none';
  loginLoader.style.display = 'block';

  const res = await loginUser(uname, pwd);
  
  loginBtn.disabled = false;
  loginBtnText.style.display = 'block';
  loginLoader.style.display = 'none';

  if (res.error) {
    showToast(res.error.message);
  } else {
    currentUser = res.data;
    showDashboard();
  }
});

logoutBtn.addEventListener('click', () => {
  logoutUser();
});

// ---- DASHBOARD LOGIC ----
const showDashboard = async () => {
  loginScreen.classList.remove('active');
  rankingsScreen.classList.remove('active');
  consensusScreen.classList.remove('active');
  dashboardScreen.classList.add('active');
  mainNav.style.display = 'flex';
  navHome.classList.add('active');
  navRank.classList.remove('active');
  navCon.classList.remove('active');
  
  userGreeting.innerText = `Hola, ${currentUser.username} 👋`;

  // Pre-fetch tapas if empty
  if (tapasData.length === 0) {
    const { data } = await fetchTapas();
    tapasData = data || [];
  }

  // Fetch votes for user
  const { data: votes } = await fetchVotesForUser(currentUser.username);
  userVotes = (votes || []).map(v => v.tapa_id);
  
  renderGrid();
  checkRankingStatus();
  setupRealtime();
};

const setupRealtime = () => {
  if (!voteSubscription) {
    voteSubscription = subscribeToVotes(() => {
      // If rankings screen is active, refresh it
      if (rankingsScreen.classList.contains('active')) {
        loadRankings();
      }
    });
  }
  
  if (!rankingSubscription) {
    rankingSubscription = subscribeToRankings(() => {
      // If consensus screen is active, refresh it
      if (consensusScreen.classList.contains('active')) {
        loadConsensus();
      }
    });
  }
};

const showRankingsScreen = () => {
  dashboardScreen.classList.remove('active');
  consensusScreen.classList.remove('active');
  rankingsScreen.classList.add('active');
  navHome.classList.remove('active');
  navRank.classList.add('active');
  navCon.classList.remove('active');
  loadRankings();
};

const showConsensusScreen = () => {
  dashboardScreen.classList.remove('active');
  rankingsScreen.classList.remove('active');
  consensusScreen.classList.add('active');
  navHome.classList.remove('active');
  navRank.classList.remove('active');
  navCon.classList.add('active');
  loadConsensus();
};

navHome.addEventListener('click', showDashboard);
navRank.addEventListener('click', showRankingsScreen);
navCon.addEventListener('click', showConsensusScreen);

const loadConsensus = async () => {
  const { data: allRankings } = await fetchAllRankings();
  allRankingsData = allRankings || [];
  renderConsensus();
};

const renderConsensus = () => {
  consensusContainer.innerHTML = '';
  
  if (allRankingsData.length === 0) {
    consensusContainer.innerHTML = '<p style="text-align: center; margin-top: 40px; color: #999;">Aún no hay suficientes rankings individuales para generar el consenso.</p>';
    return;
  }

  const pointMap = {}; // tapa_id -> total_points
  tapasData.forEach(t => pointMap[t.id] = 0);

  // BORDA COUNT Calculation
  // 1st place: 8 pts, 2nd: 7... 8th: 1
  allRankingsData.forEach(ranking => {
    ranking.tapa_ids.forEach((id, index) => {
      const points = 8 - index;
      if (pointMap[id] !== undefined) {
        pointMap[id] += points;
      }
    });
  });

  const sortedConsensus = tapasData
    .map(t => ({ ...t, totalPoints: pointMap[t.id] }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  // Create Podium (Top 3)
  const top3 = sortedConsensus.slice(0, 3);
  const podium = document.createElement('div');
  podium.className = 'podium';
  
  // Custom order for podium: 2nd, 1st, 3rd
  const podiumOrder = [
    { rank: 2, tapa: top3[1], class: 'second' },
    { rank: 1, tapa: top3[0], class: 'first' },
    { rank: 3, tapa: top3[2], class: 'third' }
  ];

  podiumOrder.forEach(p => {
    if (!p.tapa) return;
    const place = document.createElement('div');
    place.className = `podium-place ${p.class}`;
    place.innerHTML = `
      <div class="podium-avatar">
        <img src="${p.tapa.photo_url}">
        <div class="podium-badge">${p.rank}</div>
      </div>
      <div class="podium-step">
        <div class="podium-points">${p.tapa.totalPoints}</div>
        <div class="podium-name">${p.tapa.username}</div>
      </div>
    `;
    podium.appendChild(place);
  });

  consensusContainer.appendChild(podium);

  // Create List for the rest
  const list = document.createElement('div');
  list.className = 'consensus-list-refined';
  
  sortedConsensus.slice(3).forEach((tapa, index) => {
    const row = document.createElement('div');
    row.className = 'consensus-row';
    row.style.animationDelay = `${(index + 1) * 0.1}s`;
    row.innerHTML = `
      <div class="row-rank">#${index + 4}</div>
      <img class="row-img" src="${tapa.photo_url}">
      <div class="row-info">
        <div class="row-name">${tapa.title}</div>
        <div class="row-points">De ${tapa.username} • ${tapa.totalPoints} pts</div>
      </div>
    `;
    list.appendChild(row);
  });

  consensusContainer.appendChild(list);
};

const loadRankings = async () => {
  const { data: allVotes } = await fetchAllVotes();
  allVotesData = allVotes || [];
  renderRankings();
};

const renderRankings = () => {
  rankingsContainer.innerHTML = '';
  
  const stats = tapasData.map(tapa => {
    const votes = allVotesData.filter(v => v.tapa_id === tapa.id);
    const count = votes.length;
    
    const getAvg = (key) => count ? (votes.reduce((acc, v) => acc + v[key], 0) / count).toFixed(1) : 0;
    
    return {
      id: tapa.id,
      title: tapa.title,
      scores: {
        score_visual: parseFloat(getAvg('score_visual')),
        score_sabor: parseFloat(getAvg('score_sabor')),
        score_originalidad: parseFloat(getAvg('score_originalidad')),
        score_final: parseFloat(getAvg('score_final')),
      }
    };
  });

  // Calculate Overall Best for each (average of all 4 criteria)
  stats.forEach(s => {
    const vals = Object.values(s.scores);
    s.scores.overall = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
  });

  const categories = [
    { key: 'overall', label: '👑 MEJOR TAPA (GENERAL)', class: 'best-overall' },
    { key: 'score_visual', label: 'Aspecto Visual', class: '' },
    { key: 'score_sabor', label: 'Sabor', class: '' },
    { key: 'score_originalidad', label: 'Originalidad', class: '' },
    { key: 'score_final', label: 'Nota Final', class: '' }
  ];

  categories.forEach(cat => {
    const section = document.createElement('div');
    section.className = `ranking-section ${cat.class}`;
    section.innerHTML = `<h3>${cat.label}</h3>`;
    
    // Sort tapas for this category
    const sorted = [...stats].sort((a, b) => b.scores[cat.key] - a.scores[cat.key]);
    
    sorted.forEach(s => {
      const score = s.scores[cat.key];
      const percent = (score / 5) * 100;
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = `
        <div class="bar-info">
          <span>${s.title}</span>
          <span>${score > 0 ? score : '-'}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${percent}%"></div>
        </div>
      `;
      section.appendChild(row);
    });
    
    rankingsContainer.appendChild(section);
  });
};


let isRankingReadOnly = false;

const checkRankingStatus = async () => {
  if (!currentUser) return;
  
  // Condición: Haber votado todas las tapas menos la suya (8 tapas si hay 9 participantes)
  const othersTapas = tapasData.filter(t => t.creator_username !== currentUser.username);
  const hasVotedAll = othersTapas.every(t => userVotes.includes(t.id));

  if (hasVotedAll && othersTapas.length > 0) {
    const { data: existingRanking } = await fetchRankingForUser(currentUser.username);
    openRankingBtn.style.display = 'block';
    if (existingRanking) {
       openRankingBtn.innerText = 'Ver Mi Ranking';
       currentRankingOrder = existingRanking.tapa_ids;
       isRankingReadOnly = true;
    } else {
       openRankingBtn.innerText = 'Rankear Final';
       currentRankingOrder = othersTapas.map(t => t.id);
       isRankingReadOnly = false;
    }
  } else {
    openRankingBtn.style.display = 'none';
  }
};

const renderGrid = () => {
  tapasGrid.innerHTML = '';
  tapasData.forEach(tapa => {
    const card = document.createElement('div');
    card.className = 'tapa-card';
    card.innerHTML = `<img src="${tapa.photo_url}" loading="lazy" alt="${tapa.title}">`;
    card.addEventListener('click', () => openDetailDrawer(tapa));
    tapasGrid.appendChild(card);
  });
};

// ---- DETAIL DRAWER LOGIC ----
const openDetailDrawer = (tapa) => {
  currentTapaContext = tapa;
  detailImg.src = tapa.photo_url;
  detailTitle.innerText = tapa.title;
  detailDesc.innerText = tapa.description || '';
  detailCreator.innerHTML = `👨‍🍳 ${tapa.creator_username}`;

  // Reset states
  openVoteBtn.style.display = 'block';
  openVoteBtn.disabled = false;
  voteMsg.style.display = 'none';

  // Rule 1: No self vote
  if (tapa.creator_username === currentUser.username) {
    openVoteBtn.style.display = 'none';
    voteMsg.style.display = 'block';
    voteMsg.innerText = "No puedes votar tu propia creación 😉";
  } 
  // Rule 2: Already voted
  else if (userVotes.includes(tapa.id)) {
    openVoteBtn.disabled = true;
    openVoteBtn.innerHTML = "<span>YA HAS VOTADO</span>";
    voteMsg.style.display = 'block';
    voteMsg.innerText = "Gracias por tu voto.";
  } else {
    openVoteBtn.innerHTML = "<span>VOTAR</span>";
  }

  drawerOverlay.classList.add('active');
  detailDrawer.classList.add('active');
};

const closeAllDrawers = () => {
  drawerOverlay.classList.remove('active');
  detailDrawer.classList.remove('active');
  voteDrawer.classList.remove('active');
  rankingDrawer.classList.remove('active');
  setTimeout(() => { 
    currentTapaContext = null; 
    document.body.style.overflow = 'auto';
  }, 300);
};

drawerOverlay.addEventListener('click', closeAllDrawers);
document.querySelectorAll('.drawer-handle').forEach(h => {
  h.addEventListener('click', closeAllDrawers);
});

// ---- VOTE DRAWER LOGIC ----
openVoteBtn.addEventListener('click', () => {
  detailDrawer.classList.remove('active');
  voteTitleRef.innerText = currentTapaContext.title;
  buildVoteForm();
  setTimeout(() => {
    voteDrawer.classList.add('active');
  }, 200);
});

const buildVoteForm = () => {
  activeVoteState = { score_visual: 0, score_sabor: 0, score_originalidad: 0, score_final: 0 };
  voteCriteriaContainer.innerHTML = '';

  criteriaKeys.forEach(crit => {
    const isFinal = crit.key === 'score_final';
    const row = document.createElement('div');
    row.className = 'vote-criterion';
    row.innerHTML = `
      <div class="criterion-header">
        <span style="${isFinal ? 'color: var(--gold-color)' : ''}">${crit.label}</span>
        <span class="criterion-score" id="score-text-${crit.key}" style="${isFinal ? 'color: var(--gold-color)' : ''}">-</span>
      </div>
      <div class="forks-container" id="forks-${crit.key}">
        ${[1, 2, 3, 4, 5].map(i => `<div class="fork-icon ${isFinal ? 'gold' : ''}" data-key="${crit.key}" data-val="${i}">${forkIcon}</div>`).join('')}
      </div>
    `;
    voteCriteriaContainer.appendChild(row);

    const forks = row.querySelectorAll('.fork-icon');
    forks.forEach(fork => {
      fork.addEventListener('click', (e) => {
        const val = parseInt(e.currentTarget.dataset.val);
        const k = e.currentTarget.dataset.key;
        activeVoteState[k] = val;
        
        // Update UI logic
        document.getElementById(`score-text-${k}`).innerText = val;
        forks.forEach(f => {
          if (parseInt(f.dataset.val) <= val) {
            f.classList.add('selected');
          } else {
            f.classList.remove('selected');
          }
        });
      });
    });
  });
};

submitVoteBtn.addEventListener('click', async () => {
  // Validate
  if (Object.values(activeVoteState).includes(0)) {
    showToast('Por favor, valora todos los criterios.');
    return;
  }

  submitVoteBtn.disabled = true;
  submitBtnText.style.display = 'none';
  voteLoader.style.display = 'block';

  const payload = {
    tapa_id: currentTapaContext.id,
    voting_username: currentUser.username,
    ...activeVoteState
  };

  const res = await submitVote(payload);

  submitVoteBtn.disabled = false;
  submitBtnText.style.display = 'block';
  voteLoader.style.display = 'none';

  if (res.error) {
    if (res.error.code === '23505') { // Unique constraint
      showToast('Ya has votado por esta tapa anteriormente.');
    } else {
      showToast('Error al guardar el voto.');
    }
  } else {
    showToast('¡Voto registrado con éxito!');
    userVotes.push(currentTapaContext.id); // Update local state so it blocks further votes
    closeAllDrawers();
    checkRankingStatus();
  }
});

// ---- RANKING DRAWER LOGIC ----
openRankingBtn.addEventListener('click', () => {
  drawerOverlay.classList.add('active');
  rankingDrawer.classList.add('active');
  document.body.style.overflow = 'hidden';
  renderRankingList();
});

const renderRankingList = () => {
  rankingListContainer.innerHTML = '';
  
  // Manage CTA button
  if (isRankingReadOnly) {
    saveRankingBtn.style.display = 'none';
  } else {
    saveRankingBtn.style.display = 'block';
    saveRankingBtn.disabled = false;
  }

  // Sort based on currentRankingOrder or default
  const othersTapas = tapasData.filter(t => t.creator_username !== currentUser.username);
  const sortedTapas = [...othersTapas].sort((a, b) => {
    return currentRankingOrder.indexOf(a.id) - currentRankingOrder.indexOf(b.id);
  });

  sortedTapas.forEach((tapa, index) => {
    const item = document.createElement('div');
    item.className = 'ranking-item';
    if (!isRankingReadOnly) {
      item.draggable = true;
      setupDragAndDrop(item);
    } else {
      item.style.cursor = 'default';
      item.style.opacity = '0.9';
    }
    item.dataset.id = tapa.id;
    item.innerHTML = `
      <div class="ranking-index">${index + 1}</div>
      <img class="ranking-img" src="${tapa.photo_url}">
      <div class="ranking-title">${tapa.title}</div>
      ${!isRankingReadOnly ? '<div class="ranking-handle">☰</div>' : ''}
    `;
    
    rankingListContainer.appendChild(item);
  });
};

let dragItem = null;

const setupDragAndDrop = (item) => {
  item.addEventListener('dragstart', () => {
    dragItem = item;
    setTimeout(() => item.classList.add('dragging'), 0);
  });

  item.addEventListener('dragend', () => {
    dragItem.classList.remove('dragging');
    dragItem = null;
    updateIndices();
  });

  rankingListContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(rankingListContainer, e.clientY);
    const draggable = document.querySelector('.dragging');
    if (afterElement == null) {
      rankingListContainer.appendChild(draggable);
    } else {
      rankingListContainer.insertBefore(draggable, afterElement);
    }
  });

  // Mobile Touch Support
  item.addEventListener('touchstart', (e) => {
    dragItem = item;
    item.classList.add('dragging');
  }, { passive: true });

  item.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const afterElement = getDragAfterElement(rankingListContainer, touch.clientY);
    const draggable = document.querySelector('.dragging');
    if (afterElement == null) {
      rankingListContainer.appendChild(draggable);
    } else {
      rankingListContainer.insertBefore(draggable, afterElement);
    }
  }, { passive: false });

  item.addEventListener('touchend', () => {
    item.classList.remove('dragging');
    updateIndices();
    dragItem = null;
  });
};

const getDragAfterElement = (container, y) => {
  const draggableElements = [...container.querySelectorAll('.ranking-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
};

const updateIndices = () => {
  const items = rankingListContainer.querySelectorAll('.ranking-item');
  items.forEach((item, index) => {
    item.querySelector('.ranking-index').innerText = index + 1;
  });
};

saveRankingBtn.addEventListener('click', async () => {
  const items = [...rankingListContainer.querySelectorAll('.ranking-item')];
  const order = items.map(item => parseInt(item.dataset.id));
  
  saveRankingBtn.disabled = true;
  saveBtnText.style.display = 'none';
  rankingLoader.style.display = 'block';

  const { error } = await submitRanking({
    username: currentUser.username,
    tapa_ids: order
  });

  saveRankingBtn.disabled = false;
  saveBtnText.style.display = 'block';
  rankingLoader.style.display = 'none';

  if (error) {
    showToast('Error al guardar el ranking.');
  } else {
    showToast('¡Ranking final guardado!');
    currentRankingOrder = order;
    closeAllDrawers();
    checkRankingStatus();
  }
});

// Boot
init();
