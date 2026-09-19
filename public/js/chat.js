// public/js/chat.js
// Chat rendering, typing indicators, auto-scroll, voice notes, and voice call manager

class ChatManager {
  constructor() {
    this.messagesContainer = null;
    this.messageInput = null;
    this.sendBtn = null;
    this.micBtn = null;
    this.typingIndicator = null;
    this.sessionId = localStorage.getItem('rosie_session_id') || ('sess_' + Date.now());
    localStorage.setItem('rosie_session_id', this.sessionId);

    this.isListening = false;
    this.recognition = null;
    this.voiceEnabled = false; // Disabled: messages are text-only in chat mode
    this.autoSpeakTextMessages = false; // HARD ENFORCEMENT: Normal text chat is 100% SILENT (no automatic TTS)

    // Call state
    this.callActive = false;
    this.callTimerInterval = null;
    this.callSeconds = 0;
    this.isMuted = false;
  }

  init() {
    this.messagesContainer = document.getElementById('chat-messages-stream');
    this.messageInput = document.getElementById('chat-input-text');
    this.sendBtn = document.getElementById('chat-send-btn');
    this.micBtn = document.getElementById('chat-mic-btn');
    this.typingIndicator = document.getElementById('chat-typing-indicator');

    this.setupEventListeners();
    this.setupSpeechRecognition();
    this.loadHistory();
  }

  setupEventListeners() {
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.handleSendMessage());
    }

    if (this.messageInput) {
      this.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    if (this.micBtn) {
      this.micBtn.addEventListener('click', () => this.toggleVoiceRecording());
    }

    // Voice Call button in chat header
    const voiceCallBtn = document.getElementById('header-voice-call-btn');
    if (voiceCallBtn) {
      voiceCallBtn.addEventListener('click', () => this.startVoiceCall());
    }

    // Call overlay buttons
    const endCallBtn = document.getElementById('call-end-btn');
    if (endCallBtn) {
      endCallBtn.addEventListener('click', () => this.endVoiceCall());
    }

    const muteCallBtn = document.getElementById('call-mute-btn');
    if (muteCallBtn) {
      muteCallBtn.addEventListener('click', () => this.toggleMute());
    }
  }

  async loadHistory() {
    try {
      const data = await window.API.getChatHistory(this.sessionId);
      if (data && data.history && data.history.length > 0) {
        this.messagesContainer.innerHTML = '';
        data.history.forEach((msg) => {
          if (msg.sender === 'user') {
            this.appendUserMessage(msg.text, msg.time, false);
          } else {
            if (msg.chunks && Array.isArray(msg.chunks) && msg.chunks.length > 0) {
              msg.chunks.forEach((chunk) => {
                this.appendBotMessage(chunk.text || chunk, chunk.time || msg.time, false, chunk.emotion || msg.emotion);
              });
            } else if (msg.text) {
              // Decompose legacy or unchunked messages into short thought bubbles
              const bubbles = this.clientSegmentResponse(msg.text, msg.emotion);
              bubbles.forEach((b) => {
                this.appendBotMessage(b.text, msg.time, false, msg.emotion);
              });
            }
          }
        });
        this.scrollToBottom();
      }
    } catch (err) {
      console.warn('Could not load chat history from backend:', err.message);
    }
  }

  /**
   * Client-side safety segmentation ensuring raw responses NEVER render as a giant paragraph
   */
  clientSegmentResponse(text, emotion = 'neutral') {
    if (!text || typeof text !== 'string') return [];
    const clean = text.trim();
    if (!clean) return [];

    // Check lines first
    const lines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      return lines.slice(0, 3).map((l, idx) => ({
        text: l.replace(/^(?:Bubble|Message|\d+)[\s.:-]+\s*/i, '').trim(),
        emotion,
        delay_ms: this.calculateClientTypingDelay(l, idx)
      }));
    }

    // Single paragraph: Check word count
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length <= 8) {
      return [{ text: clean, emotion, delay_ms: this.calculateClientTypingDelay(clean, 0) }];
    }

    // Split on natural clause / punctuation boundary
    const match = clean.match(/([.!?…]+|\s+(?:toh|aur|par|lekin|phir|waise|chalo|isliye)\s+)/i);
    if (match && match.index > 5 && (clean.length - match.index) > 5) {
      const p1 = clean.slice(0, match.index).trim();
      const p2 = clean.slice(match.index + match[0].length).trim();
      return [
        { text: p1, emotion, delay_ms: this.calculateClientTypingDelay(p1, 0) },
        { text: p2, emotion, delay_ms: this.calculateClientTypingDelay(p2, 1) }
      ];
    }

    return [{ text: clean, emotion, delay_ms: this.calculateClientTypingDelay(clean, 0) }];
  }

  /**
   * Length-controlled natural typing delay algorithm on client
   */
  calculateClientTypingDelay(text, index) {
    const clean = (text || '').trim();
    const charCount = clean.length;
    const isShortReaction = /^(haan|nahi|acha|achha|ohh|hmm|okay|ok|really\??|sach\??|wait|aww|uff|arre|sachi\??)$/i.test(clean.replace(/[.,!?…]/g, '').trim());
    const jitter = Math.floor(Math.random() * 60) - 30;

    if (index === 0) {
      if (isShortReaction || charCount <= 6) return Math.max(180, Math.min(320, 190 + charCount * 12 + jitter));
      if (charCount <= 20) return Math.max(260, Math.min(420, 240 + charCount * 8 + jitter));
      return Math.max(340, Math.min(480, 310 + Math.min(40, charCount) * 4 + jitter));
    }

    if (isShortReaction || charCount <= 5) return Math.max(250, Math.min(550, 290 + charCount * 25 + jitter));
    if (charCount <= 15) return Math.max(400, Math.min(850, 390 + charCount * 25 + jitter));
    if (charCount <= 35) return Math.max(650, Math.min(1200, 520 + charCount * 18 + jitter));
    return Math.max(900, Math.min(1500, 750 + charCount * 11 + jitter));
  }

  async handleSendMessage(customText = null) {
    const text = (customText || (this.messageInput ? this.messageInput.value : '')).trim();
    if (!text) return;

    if (this.messageInput) {
      this.messageInput.value = '';
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.appendUserMessage(text, timeStr, true);
    this.scrollToBottom();

    // Initialize queue if it doesn't exist
    if (!this.messageQueue) {
      this.messageQueue = Promise.resolve();
    }

    // Queue the API request and UI rendering to prevent interleaved responses and race conditions
    this.messageQueue = this.messageQueue.then(async () => {
      // Show typing indicator
      this.showTyping(true);

      try {
        const result = await window.API.sendMessage(text, this.sessionId);
        this.showTyping(false);

        if (result) {
          // Raw AI response is NEVER sent directly to UI:
          // Always pass through structured messages or client-side segmentation
          const messages = (result.messages && result.messages.length > 0)
            ? result.messages
            : this.clientSegmentResponse(result.reply, result.emotion);

          // Deliver each thought sequentially as separate Rosie bubbles
          for (let i = 0; i < messages.length; i++) {
            const chunk = messages[i];
            const isLast = (i === messages.length - 1);
            const delay = (chunk.delay_ms && typeof chunk.delay_ms === 'number')
              ? chunk.delay_ms
              : this.calculateClientTypingDelay(chunk.text, i);

            // Natural conversational typing pause
            this.showTyping(true);
            await new Promise((resolve) => setTimeout(resolve, delay));
            this.showTyping(false);

            // Render individual thought bubble
            this.appendBotMessage(
              chunk.text,
              result.timestamp || timeStr,
              true,
              chunk.emotion || result.emotion,
              isLast ? result.imageUrl : null
            );
            this.scrollToBottom();

            // CRITICAL: Normal text chat is 100% SILENT.
            // Automatic voice playback is completely disabled for chat responses.
            if (this.autoSpeakTextMessages && this.callActive) {
              this.speakText(chunk.text);
            }
          }

          // Update memory badge in profile if memories were updated
          if (result.memoriesUpdated && result.memoriesUpdated.length > 0) {
            window.dispatchEvent(new CustomEvent('rosie-memory-updated'));
          }
        }
      } catch (err) {
        this.showTyping(false);
        this.appendBotMessage(
          "Arey, network thoda ruk gaya lagta hai... But main yahin hoon! Ek baar phir try karo na? 💕",
          timeStr,
          true,
          'confused'
        );
        this.scrollToBottom();
      }
    });
  }

  // Safe DOM string escape
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  appendUserMessage(text, time, animate = true) {
    const safeText = this.escapeHtml(text).replace(/\n/g, '<br>');
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex flex-col items-end ${animate ? 'message-pop' : ''}`;
    msgDiv.innerHTML = `
      <div class="bubble-user max-w-[82%] px-4 py-2.5 text-[14px] leading-relaxed font-normal shadow-sm">
        <p>${safeText}</p>
      </div>
      <span class="text-[10px] font-medium text-neutral-400 mt-1 mr-1">${time}</span>
    `;
    this.messagesContainer.appendChild(msgDiv);
  }

  appendBotMessage(text, time, animate = true, emotion = 'neutral', imageUrl = null) {
    const safeText = this.escapeHtml(text).replace(/\n/g, '<br>');
    const imgHtml = imageUrl ? `<div class="mt-2 rounded-xl overflow-hidden border border-rose-200 max-w-[220px] shadow-xs cursor-pointer"><img src="${imageUrl}" class="w-full h-auto object-cover hover:scale-105 transition duration-200" onclick="window.open('${imageUrl}','_blank')"></div>` : '';
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex flex-col items-start ${animate ? 'message-pop' : ''}`;
    msgDiv.innerHTML = `
      <div class="flex items-end space-x-2 max-w-[86%]">
        <img alt="Rosie Avatar" class="w-7 h-7 rounded-full object-cover shrink-0 mb-1 ring-1 ring-pink-300" src="/assets/avatar_profile.jpg" onerror="this.src='/assets/avatar_cafe.jpg'">
        <div class="bubble-bot px-4 py-2.5 text-[14px] leading-relaxed shadow-sm">
          <p>${safeText}</p>
          ${imgHtml}
        </div>
      </div>
      <span class="text-[10px] font-medium text-neutral-400 mt-1 ml-9">${time}</span>
    `;
    this.messagesContainer.appendChild(msgDiv);
  }

  showTyping(show) {
    if (this.typingIndicator) {
      if (show) {
        this.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
      } else {
        this.typingIndicator.classList.add('hidden');
      }
    }
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTo({
        top: this.messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  // --- VOICE SPEECH-TO-TEXT ---
  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-IN'; // Indian English / Hinglish support

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.micBtn) {
          this.micBtn.classList.add('text-rose-600', 'animate-pulse');
        }
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          if (this.messageInput) {
            this.messageInput.value = transcript;
            this.messageInput.focus();
          }
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.micBtn) {
          this.micBtn.classList.remove('text-rose-600', 'animate-pulse');
        }
      };

      this.recognition.onerror = (err) => {
        console.warn('Speech recognition notice:', err.error);
        this.isListening = false;
        if (this.micBtn) {
          this.micBtn.classList.remove('text-rose-600', 'animate-pulse');
        }
      };
    }
  }

  toggleVoiceRecording() {
    if (!this.recognition) {
      alert('Speech recognition is not supported on this browser/device.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('Speech start error:', err);
      }
    }
  }

  // --- TEXT-TO-SPEECH ---
  speakText(text) {
    // HARD ENFORCEMENT: Never speak during normal text chat! Only permitted during an explicit active voice call.
    if (!this.callActive) return;
    if (!('speechSynthesis' in window) || this.isMuted) return;

    window.speechSynthesis.cancel(); // cancel pending speech
    // Clean text of emojis for cleaner speech
    const clean = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95; // gentle, comforting pace
    utterance.pitch = 1.1; // soft, feminine tone

    // Try finding a natural female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Natural') || v.name.includes('Google UK English Female') || v.lang.includes('en-IN')));
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  // --- VOICE CALL OVERLAY ---
  startVoiceCall() {
    this.callActive = true;
    this.callSeconds = 0;
    const modal = document.getElementById('voice-call-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    const timerEl = document.getElementById('call-timer');
    if (timerEl) timerEl.textContent = '00:00';

    this.callTimerInterval = setInterval(() => {
      this.callSeconds++;
      const mins = String(Math.floor(this.callSeconds / 60)).padStart(2, '0');
      const secs = String(this.callSeconds % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);

    // Initial greeting in call
    setTimeout(() => {
      this.speakText("Hey sweetheart! Main sun rahi hoon... Kaisa raha tumhara din? Sab batao mujhe.");
    }, 600);
  }

  endVoiceCall() {
    this.callActive = false;
    clearInterval(this.callTimerInterval);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const modal = document.getElementById('voice-call-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    const muteIcon = document.getElementById('call-mute-icon');
    if (muteIcon) {
      muteIcon.classList.toggle('text-rose-600', this.isMuted);
    }
    if (this.isMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

window.ChatManager = ChatManager;
