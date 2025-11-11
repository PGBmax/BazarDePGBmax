class SmashOrPassGame {
    constructor() {
        // État du jeu
        this.allImages = []; // Liste complète des images (jamais modifiée)
        this.processedImages = new Set(); // Images déjà traitées (Set pour éviter les doublons)
        this.smashList = [];
        this.passList = [];
        this.currentImagePath = null;
        
        // Unique storage key for this site
        this.storageKey = 'smashOrPass_SmashOrPass';
        
        // Éléments DOM
        this.cardImage = document.getElementById('card-image');
        this.cardCounter = document.getElementById('card-counter');
        this.smashBtn = document.getElementById('smash-btn');
        this.passBtn = document.getElementById('pass-btn');
        this.smashCountEl = document.getElementById('smash-count');
        this.passCountEl = document.getElementById('pass-count');
        this.smashTierCountEl = document.getElementById('smash-tier-count');
        this.passTierCountEl = document.getElementById('pass-tier-count');
        this.smashImagesEl = document.getElementById('smash-images');
        this.passImagesEl = document.getElementById('pass-images');
        this.gameOverEl = document.getElementById('game-over');
        this.restartBtn = document.getElementById('restart-btn');
        this.notification = document.getElementById('notification');
        
        // État pour les animations
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        // Show welcome popup on every launch
        this.showWelcomePopup();
        
        // Génerer la liste complète des images
        this.generateAllImages();
        
        // Charger automatiquement si une sauvegarde existe
        if (this.loadFromStorage()) {
            this.showNotification('🔄 Session précédente chargée');
        }
        
        // Configurer les événements
        this.setupEventListeners();
        
        // Charger la première image
        this.loadNextImage();
        this.updateDisplay();
    }
    
    generateAllImages() {
        this.allImages = [];
        for (let i = 1; i <= 237; i++) {
            this.allImages.push(`images/${i.toString().padStart(2, '0')}.png`);
        }
        // Mélanger une seule fois au début
        this.shuffleArray(this.allImages);
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    setupEventListeners() {
        // Boutons de choix
        this.smashBtn?.addEventListener('click', () => this.makeChoice('smash'));
        this.passBtn?.addEventListener('click', () => this.makeChoice('pass'));
        
        // Bouton restart
        this.restartBtn?.addEventListener('click', () => this.restart());
        
        // Boutons header
        const resetBtn = document.getElementById('reset-btn');
        const hubBtn = document.getElementById('hub-btn');
        
        resetBtn?.addEventListener('click', () => this.confirmReset());
        hubBtn?.addEventListener('click', () => this.goToHub());
        
        // Clavier
        document.addEventListener('keydown', (e) => {
            if (this.isAnimating) return;
            
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.makeChoice('pass');
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.makeChoice('smash');
            }
        });
        
        // Touch/swipe pour mobile (simplifié)
        let startX = 0;
        const currentCard = document.getElementById('current-card');
        
        currentCard?.addEventListener('touchstart', (e) => {
            if (this.isAnimating) return;
            startX = e.touches[0].clientX;
        });
        
        currentCard?.addEventListener('touchend', (e) => {
            if (this.isAnimating) return;
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 100) { // Seuil de swipe
                if (diff > 0) {
                    this.makeChoice('pass'); // Swipe left = pass
                } else {
                    this.makeChoice('smash'); // Swipe right = smash
                }
            }
        });
    }
    
    makeChoice(choice) {
        if (this.isAnimating || !this.currentImagePath) return;
        
        this.isAnimating = true;
        
        // Extraire le numéro de l'image
        const imageNumber = this.getImageNumber(this.currentImagePath);
        
        // Ajouter à la liste appropriée
        const imageData = {
            path: this.currentImagePath,
            number: imageNumber
        };
        
        if (choice === 'smash') {
            this.smashList.push(imageData);
            this.showFeedback('♥', 'smash');
        } else {
            this.passList.push(imageData);
            this.showFeedback('✗', 'pass');
        }
        
        // Marquer comme traité
        this.processedImages.add(this.currentImagePath);
        
        // Animation et passage à l'image suivante
        this.animateChoice(choice);
        
        // Sauvegarder automatiquement
        this.saveToStorage();
        
        // Continuer après l'animation
        setTimeout(() => {
            this.loadNextImage();
            this.updateDisplay();
            this.updateTierLists();
            this.isAnimating = false;
            
            // Vérifier si le jeu est fini
            if (this.processedImages.size >= this.allImages.length) {
                this.showGameOver();
            }
        }, 500);
    }
    
    getImageNumber(imagePath) {
        const match = imagePath.match(/(\d+)\.png$/);
        return match ? parseInt(match[1], 10) : 0;
    }
    
    loadNextImage() {
        // Trouver la prochaine image non traitée
        this.currentImagePath = this.allImages.find(img => !this.processedImages.has(img));
        
        if (this.currentImagePath && this.cardImage) {
            this.cardImage.src = this.currentImagePath;
            this.cardImage.alt = `Image ${this.getImageNumber(this.currentImagePath)}`;
        }
    }
    
    updateDisplay() {
        // Mettre à jour les compteurs
        if (this.smashCountEl) this.smashCountEl.textContent = this.smashList.length;
        if (this.passCountEl) this.passCountEl.textContent = this.passList.length;
        if (this.smashTierCountEl) this.smashTierCountEl.textContent = this.smashList.length;
        if (this.passTierCountEl) this.passTierCountEl.textContent = this.passList.length;
        
        // Mettre à jour le compteur de progression
        if (this.cardCounter) {
            const processed = this.processedImages.size;
            const total = this.allImages.length;
            this.cardCounter.textContent = `${processed + 1} / ${total}`;
        }
    }
    
    updateTierLists() {
        // Vider et reconstruire les listes visuelles
        if (this.smashImagesEl) {
            this.smashImagesEl.innerHTML = '';
            this.smashList.forEach(imageData => {
                const element = this.createImageElement(imageData);
                this.smashImagesEl.appendChild(element);
            });
        }
        
        if (this.passImagesEl) {
            this.passImagesEl.innerHTML = '';
            this.passList.forEach(imageData => {
                const element = this.createImageElement(imageData);
                this.passImagesEl.appendChild(element);
            });
        }
    }
    
    createImageElement(imageData) {
        const div = document.createElement('div');
        div.className = 'tier-img';
        div.innerHTML = `
            <img src="${imageData.path}" alt="Image ${imageData.number}">
            <span class="img-number">${imageData.number}</span>
        `;
        return div;
    }
    
    showFeedback(icon, type) {
        const feedback = document.getElementById('feedback');
        if (feedback) {
            feedback.textContent = icon;
            feedback.className = `feedback ${type}`;
            feedback.style.display = 'block';
            
            setTimeout(() => {
                feedback.style.display = 'none';
            }, 800);
        }
    }
    
    animateChoice(choice) {
        const card = document.getElementById('current-card');
        if (card) {
            card.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
            if (choice === 'smash') {
                card.style.transform = 'translateX(100%) rotate(15deg)';
            } else {
                card.style.transform = 'translateX(-100%) rotate(-15deg)';
            }
            card.style.opacity = '0.3';
            
            setTimeout(() => {
                card.style.transition = '';
                card.style.transform = '';
                card.style.opacity = '';
            }, 500);
        }
    }
    
    // ===== SYSTÈME DE SAUVEGARDE =====
    
    saveToStorage() {
        const gameState = {
            processedImages: Array.from(this.processedImages),
            smashList: this.smashList,
            passList: this.passList,
            allImages: this.allImages, // Sauvegarder l'ordre mélangé
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(gameState));
    }
    
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return false;
            
            const gameState = JSON.parse(saved);
            
            // Restaurer l'état
            this.processedImages = new Set(gameState.processedImages || []);
            this.smashList = gameState.smashList || [];
            this.passList = gameState.passList || [];
            
            // Si on a un ordre mélangé sauvé, l'utiliser
            if (gameState.allImages && gameState.allImages.length > 0) {
                this.allImages = gameState.allImages;
            }
            
            return true;
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            return false;
        }
    }
    
    // ===== CONTRÔLES =====
    
    confirmReset() {
        if (confirm('⚠️ Êtes-vous sûr de vouloir tout recommencer ? Toute la progression sera perdue.')) {
            this.resetGame();
            this.showNotification('🔄 Jeu réinitialisé !');
        }
    }
    
    goToHub() {
        // Save before going to hub (no reset)
        this.saveToStorage();
        this.showNotification('💾 Progression sauvegardée !');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1000);
    }
    
    restart() {
        this.resetGame();
    }
    
    resetGame() {
        // Effacer la sauvegarde spécifique à ce site
        localStorage.removeItem(this.storageKey);
        
        // Reset complet
        this.processedImages.clear();
        this.smashList = [];
        this.passList = [];
        this.currentImagePath = null;
        this.isAnimating = false;
        
        // Remélanger les images
        this.shuffleArray(this.allImages);
        
        // Cacher game over
        if (this.gameOverEl) {
            this.gameOverEl.classList.add('hidden');
        }
        
        // Recharger
        this.loadNextImage();
        this.updateDisplay();
        this.updateTierLists();
    }
    
    showGameOver() {
        const total = this.processedImages.size;
        const smashCount = this.smashList.length;
        const passCount = this.passList.length;
        const smashRate = total > 0 ? Math.round((smashCount / total) * 100) : 0;
        
        // Mettre à jour les statistiques finales
        const finalSmash = document.getElementById('final-smash');
        const finalPass = document.getElementById('final-pass');
        const smashRateEl = document.getElementById('smash-rate');
        
        if (finalSmash) finalSmash.textContent = smashCount;
        if (finalPass) finalPass.textContent = passCount;
        if (smashRateEl) smashRateEl.textContent = `${smashRate}%`;
        
        // Afficher l'écran de fin
        if (this.gameOverEl) {
            this.gameOverEl.classList.remove('hidden');
        }
        
        // Show the goofy completion popup
        this.showCompletionPopup();
        
        this.showNotification('🎉 Terminé ! Tous les personnages ont été classés.');
    }
    
    showCompletionPopup() {
        // Play the goofy sound
        try {
            const audio = new Audio('what-da-hell.mp3');
            audio.volume = 0.7;
            audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (e) {
            console.log('Audio loading failed:', e);
        }
        
        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.className = 'completion-popup-overlay';
        
        // Create popup content
        const popup = document.createElement('div');
        popup.className = 'completion-popup';
        popup.innerHTML = `
            <div class="completion-popup-content">
                <h2>🎉 FÉLICITATIONS ! 🎉</h2>
                <p>Tu es officiellement le plus gros daleux de<br><strong>RAID: Shadow Legends !</strong></p>
                <div class="completion-stats">
                    <div>❤️ SMASH: ${this.smashList.length}</div>
                    <div>❌ PASS: ${this.passList.length}</div>
                </div>
                <p class="completion-credit">- Site fait par PG_Banania</p>
                <button class="completion-close-btn" onclick="this.closest('.completion-popup-overlay').remove()">
                    Fermer
                </button>
            </div>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        // Add click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }
    
    showWelcomePopup() {
        // Array of goofy welcome messages in French
        const welcomeMessages = [
            "🎮 Prépare-toi à juger les plus beaux champions de RAID !",
            "💀 Es-tu prêt à smash ou pass 237 champions ? Courage !",
            "🔥 Attention ! Zone de daleux extrêmes détectée !",
            "⚔️ Bienvenue dans l'arène du SMASH OR PASS !",
            "🎯 Mission : Séparer les beaux des moins beaux !",
            "💎 237 champions t'attendent... Que le tri commence !",
            "🌟 Prêt à découvrir tes goûts douteux ? C'est parti !",
            "🎪 Dedicace a PG_Banania !"
        ];
        
        // Pick a random message
        const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        
        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.className = 'welcome-popup-overlay';
        
        // Create popup content
        const popup = document.createElement('div');
        popup.className = 'welcome-popup';
        popup.innerHTML = `
            <div class="welcome-popup-content">
                <h2>🎉 BIENVENUE ! 🎉</h2>
                <p>${randomMessage}</p>
                <div class="welcome-info">
                    <div>🎯 <strong>237 Champions</strong> à juger</div>
                    <div>⌨️ Utilise les <strong>Boutons</strong> pour <strong>Smash And Pass</strong></div>
                </div>
                <button class="welcome-start-btn" onclick="this.closest('.welcome-popup-overlay').remove()">
                    🚀 COMMENCER LE TRI !
                </button>
            </div>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        // Add click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        // Add keyboard support (Enter or Space to close)
        document.addEventListener('keydown', function handleWelcomeKeys(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                overlay.remove();
                document.removeEventListener('keydown', handleWelcomeKeys);
            }
        });
    }
    
    showNotification(message) {
        if (!this.notification) return;
        
        const text = document.getElementById('notification-text');
        if (text) {
            text.textContent = message;
        }
        
        this.notification.classList.remove('hidden');
        
        setTimeout(() => {
            this.notification.classList.add('hidden');
        }, 3000);
    }
}

// Initialiser le jeu
document.addEventListener('DOMContentLoaded', () => {
    new SmashOrPassGame();
});

// Empêcher le scroll sur mobile lors du swipe
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('#current-card')) {
        e.preventDefault();
    }
}, { passive: false });