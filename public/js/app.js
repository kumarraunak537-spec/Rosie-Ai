// public/js/app.js
// Main application controller, client-side router, and Memory Inspector manager

document.addEventListener('DOMContentLoaded', async () => {
  const chatManager = new window.ChatManager();
  chatManager.init();

  // Screen Elements
  const screens = {
    login: document.getElementById('screen-login'),
    chat: document.getElementById('screen-chat'),
    profile: document.getElementById('screen-profile'),
    subscription: document.getElementById('screen-subscription')
  };

  // Router State
  let currentScreen = 'login';

  function navigateTo(screenName, updateHistory = true) {
    if (!screens[screenName]) return;

    Object.keys(screens).forEach((name) => {
      screens[name].classList.remove('active');
    });

    screens[screenName].classList.add('active');
    currentScreen = screenName;

    if (updateHistory) {
      window.location.hash = screenName;
    }

    // Trigger screen-specific refresh
    if (screenName === 'chat') {
      chatManager.scrollToBottom();
    } else if (screenName === 'profile') {
      loadProfileData();
    }
  }

  // Handle Browser / Android Back Button
  window.addEventListener('popstate', () => {
    const hash = window.location.hash.replace('#', '') || 'login';
    if (screens[hash]) {
      navigateTo(hash, false);
    }
  });

  // Initial Route
  const initialRoute = window.location.hash.replace('#', '') || (localStorage.getItem('rosie_logged_in') ? 'chat' : 'login');
  navigateTo(initialRoute, false);

  // --- LOGIN SCREEN LOGIC ---
  const signinForm = document.getElementById('signin-form');
  const userIdentity = document.getElementById('user-identity');
  const userSecret = document.getElementById('user-secret');
  const togglePassBtn = document.getElementById('toggle-password');

  if (togglePassBtn && userSecret) {
    togglePassBtn.addEventListener('click', () => {
      const type = userSecret.getAttribute('type') === 'password' ? 'text' : 'password';
      userSecret.setAttribute('type', type);
    });
  }

  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identity = userIdentity ? userIdentity.value.trim() : 'Friend';
      const secret = userSecret ? userSecret.value : '';

      try {
        await window.API.login(identity, secret);
        localStorage.setItem('rosie_logged_in', 'true');
        navigateTo('chat');
      } catch (err) {
        // Fallback login
        localStorage.setItem('rosie_logged_in', 'true');
        navigateTo('chat');
      }
    });
  }

  // Quick social buttons & guest entry
  document.querySelectorAll('.btn-quick-login').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem('rosie_logged_in', 'true');
      navigateTo('chat');
    });
  });

  // --- CHAT NAVIGATION & ACTIONS ---
  const chatBackBtn = document.getElementById('chat-back-btn');
  if (chatBackBtn) {
    chatBackBtn.addEventListener('click', () => navigateTo('login'));
  }

  const chatAvatarBtn = document.getElementById('chat-avatar-profile-btn');
  if (chatAvatarBtn) {
    chatAvatarBtn.addEventListener('click', () => navigateTo('profile'));
  }

  // 3-dots chat menu
  const chatMenuBtn = document.getElementById('chat-menu-btn');
  const chatDropdownMenu = document.getElementById('chat-dropdown-menu');
  if (chatMenuBtn && chatDropdownMenu) {
    chatMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chatDropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      chatDropdownMenu.classList.add('hidden');
    });
  }

  const menuOpenProfile = document.getElementById('menu-item-profile');
  if (menuOpenProfile) {
    menuOpenProfile.addEventListener('click', () => navigateTo('profile'));
  }

  const menuOpenSub = document.getElementById('menu-item-sub');
  if (menuOpenSub) {
    menuOpenSub.addEventListener('click', () => navigateTo('subscription'));
  }

  const menuClearChat = document.getElementById('menu-item-clear');
  if (menuClearChat) {
    menuClearChat.addEventListener('click', async () => {
      if (confirm('Clear chat conversation history?')) {
        await window.API.clearChatHistory(chatManager.sessionId);
        document.getElementById('chat-messages-stream').innerHTML = '';
      }
    });
  }

  // --- PROFILE SCREEN LOGIC & MEMORY INSPECTOR ---
  const profileBackBtn = document.getElementById('profile-back-btn');
  if (profileBackBtn) {
    profileBackBtn.addEventListener('click', () => navigateTo('chat'));
  }

  const profileOpenChatBtn = document.getElementById('profile-open-chat-btn');
  if (profileOpenChatBtn) {
    profileOpenChatBtn.addEventListener('click', () => navigateTo('chat'));
  }

  const profileVoiceBtn = document.getElementById('profile-voice-btn');
  if (profileVoiceBtn) {
    profileVoiceBtn.addEventListener('click', () => {
      navigateTo('chat');
      setTimeout(() => chatManager.startVoiceCall(), 300);
    });
  }

  // Memory Inspector Modal Elements
  const memoryCardBtn = document.getElementById('profile-memory-card-btn');
  const memoryModal = document.getElementById('memory-inspector-modal');
  const closeMemoryModal = document.getElementById('close-memory-modal');
  const memoriesList = document.getElementById('memories-list-container');
  const addMemoryForm = document.getElementById('add-memory-form');
  const clearAllMemoriesBtn = document.getElementById('clear-all-memories-btn');
  const memoryCountBadge = document.getElementById('memory-count-badge');

  async function loadProfileData() {
    try {
      const memData = await window.API.getMemories();
      if (memData && memoryCountBadge) {
        memoryCountBadge.textContent = `${memData.count || 0} memories`;
      }
    } catch (e) {
      console.warn('Error fetching memories count:', e);
    }
  }

  window.addEventListener('rosie-memory-updated', loadProfileData);

  if (memoryCardBtn && memoryModal) {
    memoryCardBtn.addEventListener('click', async () => {
      memoryModal.classList.remove('hidden');
      memoryModal.classList.add('flex');
      await renderMemories();
    });
  }

  if (closeMemoryModal && memoryModal) {
    closeMemoryModal.addEventListener('click', () => {
      memoryModal.classList.add('hidden');
      memoryModal.classList.remove('flex');
      loadProfileData();
    });
  }

  async function renderMemories() {
    if (!memoriesList) return;
    memoriesList.innerHTML = '<div class="text-center py-6 text-sm text-gray-500">Loading memories...</div>';

    try {
      const data = await window.API.getMemories();
      const memories = data.memories || [];

      if (memories.length === 0) {
        memoriesList.innerHTML = `
          <div class="text-center py-8 text-sm text-gray-400">
            No memories saved yet. Rosie will remember facts as you chat! 🌸
          </div>
        `;
        return;
      }

      memoriesList.innerHTML = '';
      memories.forEach((mem) => {
        const item = document.createElement('div');
        item.className = 'p-3 bg-rose-50/70 rounded-2xl border border-rose-100 flex items-start justify-between gap-2 transition-all';
        item.innerHTML = `
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold text-gray-800">${mem.key.replace(/_/g, ' ')}</span>
              <span class="text-[9px] font-semibold text-rose-600 bg-white border border-rose-200 px-1.5 py-0.5 rounded-full uppercase">${mem.category || 'fact'}</span>
            </div>
            <p class="text-xs text-gray-600 font-normal leading-relaxed">${mem.value}</p>
          </div>
          <button class="delete-mem-btn text-rose-400 hover:text-rose-600 p-1 transition-colors" data-id="${mem.id}" title="Delete memory">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        `;
        memoriesList.appendChild(item);
      });

      // Attach delete handlers
      memoriesList.querySelectorAll('.delete-mem-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          await window.API.deleteMemory(id);
          renderMemories();
        });
      });
    } catch (err) {
      memoriesList.innerHTML = `<div class="text-center py-4 text-xs text-red-500">Failed to load memories: ${err.message}</div>`;
    }
  }

  if (addMemoryForm) {
    addMemoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const keyInput = document.getElementById('new-mem-key');
      const valInput = document.getElementById('new-mem-val');
      const key = keyInput ? keyInput.value.trim() : '';
      const val = valInput ? valInput.value.trim() : '';

      if (key && val) {
        await window.API.addMemory(key, val, 'custom');
        keyInput.value = '';
        valInput.value = '';
        renderMemories();
      }
    });
  }

  if (clearAllMemoriesBtn) {
    clearAllMemoriesBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all of Rosie\'s memories?')) {
        await window.API.clearAllMemories();
        renderMemories();
      }
    });
  }

  // --- PHOTO LIGHTBOX ---
  const lightbox = document.getElementById('photo-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const closeLightbox = document.getElementById('close-lightbox');

  document.querySelectorAll('.gallery-moment-img').forEach((img) => {
    img.addEventListener('click', (e) => {
      if (lightbox && lightboxImg) {
        lightboxImg.src = e.target.src;
        lightbox.classList.add('active');
      }
    });
  });

  if (closeLightbox && lightbox) {
    closeLightbox.addEventListener('click', () => lightbox.classList.remove('active'));
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) lightbox.classList.remove('active');
    });
  }

  // --- SUBSCRIPTION SCREEN LOGIC ---
  const subBackBtn = document.getElementById('sub-close-btn');
  if (subBackBtn) {
    subBackBtn.addEventListener('click', () => navigateTo('profile'));
  }

  let selectedPlan = 'trial';
  const trialCard = document.getElementById('trial-card');
  const fullCard = document.getElementById('full-card');
  const subCtaBtn = document.getElementById('sub-cta-btn');

  function updatePlanSelection(plan) {
    selectedPlan = plan;
    const trialRadioDot = document.getElementById('trial-radio-dot');
    const trialRadioOuter = document.getElementById('trial-radio-outer');
    const fullRadioDot = document.getElementById('full-radio-dot');
    const fullRadioOuter = document.getElementById('full-radio-outer');

    if (plan === 'trial') {
      trialCard.classList.add('border-[#DF4D76]', 'scale-[1.02]', 'shadow-card-active');
      trialCard.classList.remove('border-pink-200/80', 'opacity-90');
      trialRadioDot.classList.add('scale-100', 'bg-[#DF4D76]');
      trialRadioDot.classList.remove('scale-0', 'bg-transparent');
      trialRadioOuter.classList.add('border-[#DF4D76]');
      trialRadioOuter.classList.remove('border-gray-300');

      fullCard.classList.remove('border-[#DF4D76]', 'scale-[1.02]', 'shadow-card-active');
      fullCard.classList.add('border-pink-200/80', 'opacity-90');
      fullRadioDot.classList.remove('scale-100', 'bg-[#DF4D76]');
      fullRadioDot.classList.add('scale-0', 'bg-transparent');
      fullRadioOuter.classList.remove('border-[#DF4D76]');
      fullRadioOuter.classList.add('border-gray-300');
    } else {
      fullCard.classList.add('border-[#DF4D76]', 'scale-[1.02]', 'shadow-card-active');
      fullCard.classList.remove('border-pink-200/80', 'opacity-90');
      fullRadioDot.classList.add('scale-100', 'bg-[#DF4D76]');
      fullRadioDot.classList.remove('scale-0', 'bg-transparent');
      fullRadioOuter.classList.add('border-[#DF4D76]');
      fullRadioOuter.classList.remove('border-gray-300');

      trialCard.classList.remove('border-[#DF4D76]', 'scale-[1.02]', 'shadow-card-active');
      trialCard.classList.add('border-pink-200/80', 'opacity-90');
      trialRadioDot.classList.remove('scale-100', 'bg-[#DF4D76]');
      trialRadioDot.classList.add('scale-0', 'bg-transparent');
      trialRadioOuter.classList.remove('border-[#DF4D76]');
      trialRadioOuter.classList.add('border-gray-300');
    }
  }

  if (trialCard) trialCard.addEventListener('click', () => updatePlanSelection('trial'));
  if (fullCard) fullCard.addEventListener('click', () => updatePlanSelection('vip'));

  if (subCtaBtn) {
    subCtaBtn.addEventListener('click', async () => {
      subCtaBtn.disabled = true;
      subCtaBtn.textContent = 'Activating Rosie VIP...';

      try {
        const res = await window.API.subscribe(selectedPlan);
        alert(res.message || 'VIP Pass activated! Enjoy unlimited intimate talks with Rosie 💖');
        navigateTo('chat');
      } catch (err) {
        alert('Plan activated in offline prototype mode! 💕');
        navigateTo('chat');
      } finally {
        subCtaBtn.disabled = false;
        subCtaBtn.textContent = 'Unlock Rosie Premium 💖';
      }
    });
  }

  // Register PWA Service Worker if available
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.log('SW registration note:', e.message));
  }
});
