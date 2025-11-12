class TierListGame {
    constructor() {
        // État du jeu avec 5 tiers
        this.allImages = [];
        this.processedImages = new Set();
        this.tiers = {
            s: [], // A Marier
            a: [], // Je prétends réfléchir  
            b: [], // Si y'a rien d'autre
            c: [], // Même bourré j'hésite
            f: []  // Nope total
        };
        this.currentImagePath = null;
        
        // Éléments DOM - Boutons
        this.tierButtons = {
            s: document.getElementById('tier-s-btn'),
            a: document.getElementById('tier-a-btn'),
            b: document.getElementById('tier-b-btn'),
            c: document.getElementById('tier-c-btn'),
            f: document.getElementById('tier-f-btn')
        };
        
        // Éléments DOM - Affichage
        this.cardImage = document.getElementById('card-image');
        this.cardCounter = document.getElementById('card-counter');
        this.notification = document.getElementById('notification');
        this.gameOverEl = document.getElementById('game-over');
        this.restartBtn = document.getElementById('restart-btn');
        
        // Compteurs header
        this.scoreElements = {
            s: document.getElementById('score-s'),
            a: document.getElementById('score-a'),
            b: document.getElementById('score-b'),
            c: document.getElementById('score-c'),
            f: document.getElementById('score-f')
        };
        
        // Compteurs tier list
        this.tierCountElements = {
            s: document.getElementById('tier-s-count'),
            a: document.getElementById('tier-a-count'),
            b: document.getElementById('tier-b-count'),
            c: document.getElementById('tier-c-count'),
            f: document.getElementById('tier-f-count')
        };
        
        // Conteneurs d'images
        this.tierImageElements = {
            s: document.getElementById('tier-s-images'),
            a: document.getElementById('tier-a-images'),
            b: document.getElementById('tier-b-images'),
            c: document.getElementById('tier-c-images'),
            f: document.getElementById('tier-f-images')
        };
        
        // État pour les animations
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        this.generateAllImages();
        
        if (this.loadFromStorage()) {
            this.showNotification('🔄 Session précédente chargée');
        }
        
        this.setupEventListeners();
        this.loadNextImage();
        this.updateDisplay();
    }
    
    generateAllImages() {
        this.allImages = [];
        for (let i = 1; i <= 237; i++) {
            this.allImages.push(`images/${i.toString().padStart(2, '0')}.png`);
        }
        this.shuffleArray(this.allImages);
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    setupEventListeners() {
        // Boutons de tier
        Object.keys(this.tierButtons).forEach(tier => {
            this.tierButtons[tier]?.addEventListener('click', () => this.makeChoice(tier));
        });
        
        // Bouton restart
        this.restartBtn?.addEventListener('click', () => this.restart());
        
        // Bouton export
        const exportBtn = document.getElementById('export-btn');
        exportBtn?.addEventListener('click', () => this.exportTierListAsPNG());
        
        // Boutons header
        const resetBtn = document.getElementById('reset-btn');
        const hubBtn = document.getElementById('hub-btn');
        
        resetBtn?.addEventListener('click', () => this.confirmReset());
        hubBtn?.addEventListener('click', () => this.goToHub());
        
        // Clavier (1-5 pour les tiers)
        document.addEventListener('keydown', (e) => {
            if (this.isAnimating) return;
            
            const keyToTier = {
                '1': 's',
                '2': 'a', 
                '3': 'b',
                '4': 'c',
                '5': 'f'
            };
            
            if (keyToTier[e.key]) {
                this.makeChoice(keyToTier[e.key]);
            }
        });
        
        // Touch/swipe simplifié
        let startY = 0;
        const currentCard = document.getElementById('current-card');
        
        currentCard?.addEventListener('touchstart', (e) => {
            if (this.isAnimating) return;
            startY = e.touches[0].clientY;
        });
        
        currentCard?.addEventListener('touchend', (e) => {
            if (this.isAnimating) return;
            const endY = e.changedTouches[0].clientY;
            const diff = startY - endY;
            
            if (Math.abs(diff) > 100) {
                if (diff > 50) {
                    this.makeChoice('s'); // Swipe up = tier S
                } else if (diff < -50) {
                    this.makeChoice('f'); // Swipe down = tier F
                }
            }
        });
    }
    
    makeChoice(tier) {
        if (this.isAnimating || !this.currentImagePath || !this.tiers[tier]) return;
        
        this.isAnimating = true;
        
        const imageNumber = this.getImageNumber(this.currentImagePath);
        const imageData = {
            path: this.currentImagePath,
            number: imageNumber,
            tier: tier
        };
        
        // Ajouter à la tier appropriée
        this.tiers[tier].push(imageData);
        
        // Marquer comme traité
        this.processedImages.add(this.currentImagePath);
        
        // Feedback visuel
        this.showFeedback(tier);
        
        // Animation
        this.animateChoice(tier);
        
        // Sauvegarder
        this.saveToStorage();
        
        // Continuer
        setTimeout(() => {
            this.loadNextImage();
            this.updateDisplay();
            this.updateTierLists();
            this.isAnimating = false;
            
            // For testing: trigger game over after 10 items instead of all
            if (this.processedImages.size >= 237) {
                this.showGameOver();
            }
        }, 500);
    }
    
    getImageNumber(imagePath) {
        const match = imagePath.match(/(\d+)\.png$/);
        return match ? parseInt(match[1], 10) : 0;
    }
    
    loadNextImage() {
        this.currentImagePath = this.allImages.find(img => !this.processedImages.has(img));
        
        if (this.currentImagePath && this.cardImage) {
            this.cardImage.src = this.currentImagePath;
            this.cardImage.alt = `Image ${this.getImageNumber(this.currentImagePath)}`;
        }
    }
    
    updateDisplay() {
        // Mettre à jour tous les compteurs
        Object.keys(this.tiers).forEach(tier => {
            const count = this.tiers[tier].length;
            
            if (this.scoreElements[tier]) {
                this.scoreElements[tier].textContent = count;
            }
            
            if (this.tierCountElements[tier]) {
                this.tierCountElements[tier].textContent = count;
            }
        });
        
        // Compteur de progression
        if (this.cardCounter) {
            const processed = this.processedImages.size;
            const total = this.allImages.length;
            this.cardCounter.textContent = `${processed + 1} / ${total}`;
        }
    }
    
    updateTierLists() {
        Object.keys(this.tiers).forEach(tier => {
            const container = this.tierImageElements[tier];
            if (!container) return;
            
            container.innerHTML = '';
            this.tiers[tier].forEach(imageData => {
                const element = this.createImageElement(imageData);
                container.appendChild(element);
            });
        });
    }
    
    createImageElement(imageData) {
        const div = document.createElement('div');
        div.className = 'tier-img';
        div.innerHTML = `
            <img src="${imageData.path}" alt="Image ${imageData.number}">
        `;
        return div;
    }
    
    showFeedback(tier) {
        const feedback = document.getElementById('feedback');
        if (!feedback) return;
        
        const tierEmojis = {
            s: '❤️‍🔥',
            a: '😳',
            b: '🙂', 
            c: '😬',
            f: '🧊'
        };
        
        feedback.textContent = tierEmojis[tier] || '✨';
        feedback.className = `feedback tier-${tier}`;
        feedback.style.display = 'block';
        
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 800);
    }
    
    animateChoice(tier) {
        const card = document.getElementById('current-card');
        if (!card) return;
        
        const directions = {
            s: 'translateY(-100%) scale(1.1)', // Vers le haut
            a: 'translateX(50%) translateY(-50%) rotate(10deg)',
            b: 'translateX(0%) scale(0.9)',
            c: 'translateX(-50%) translateY(50%) rotate(-10deg)', 
            f: 'translateY(100%) scale(0.8)' // Vers le bas
        };
        
        card.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
        card.style.transform = directions[tier] || 'scale(0.8)';
        card.style.opacity = '0.3';
        
        setTimeout(() => {
            card.style.transition = '';
            card.style.transform = '';
            card.style.opacity = '';
        }, 500);
    }
    
    // ===== SYSTÈME DE SAUVEGARDE =====
    
    saveToStorage() {
        const gameState = {
            processedImages: Array.from(this.processedImages),
            tiers: this.tiers,
            allImages: this.allImages,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('tier-list-auto', JSON.stringify(gameState));
    }
    
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('tier-list-auto');
            if (!saved) return false;
            
            const gameState = JSON.parse(saved);
            
            this.processedImages = new Set(gameState.processedImages || []);
            this.tiers = gameState.tiers || { s: [], a: [], b: [], c: [], f: [] };
            
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
        if (confirm('🏠 Retourner au hub ? La progression sera sauvegardée automatiquement.')) {
            this.saveToStorage();
            this.resetGame();
            this.showNotification('🏠 Retour au hub - Progression sauvegardée !');
        }
    }
    
    restart() {
        this.resetGame();
    }
    
    resetGame() {
        localStorage.removeItem('tier-list-auto');
        
        this.processedImages.clear();
        this.tiers = { s: [], a: [], b: [], c: [], f: [] };
        this.currentImagePath = null;
        this.isAnimating = false;
        
        this.shuffleArray(this.allImages);
        
        if (this.gameOverEl) {
            this.gameOverEl.classList.add('hidden');
        }
        
        this.loadNextImage();
        this.updateDisplay();
        this.updateTierLists();
    }
    
    showGameOver() {
        const total = this.processedImages.size;
        
        // Mettre à jour les statistiques finales
        const finalElements = {
            s: document.getElementById('final-s'),
            a: document.getElementById('final-a'),
            b: document.getElementById('final-b'),
            c: document.getElementById('final-c'),
            f: document.getElementById('final-f')
        };
        
        Object.keys(this.tiers).forEach(tier => {
            if (finalElements[tier]) {
                finalElements[tier].textContent = this.tiers[tier].length;
            }
        });
        
        if (this.gameOverEl) {
            this.gameOverEl.classList.remove('hidden');
        }
        
        // Jouer le son de fin de jeu
        this.playGameOverSound();
        
        this.showNotification('🎉 Terminé ! Tous les personnages ont été classés dans la tier list.');
    }
    
    async exportTierListAsPNG() {
        try {
            // Cacher temporairement les éléments de jeu qui ne doivent pas apparaître
            const gameArea = document.querySelector('.game-area');
            const gameOver = document.getElementById('game-over');
            const notification = document.getElementById('notification');
            
            if (gameArea) gameArea.style.display = 'none';
            if (gameOver) gameOver.style.display = 'none';
            if (notification) notification.style.display = 'none';
            
            // Créer un canvas à partir de la tier list
            const tierList = document.querySelector('.tier-list');
            if (!tierList) {
                this.showNotification('❌ Impossible de trouver la tier list');
                return;
            }
            
            // Sauvegarder les styles originaux qui limitent la hauteur
            const originalStyles = new Map();
            const tierImages = document.querySelectorAll('.tier-images');
            const tierListElement = tierList;
            
            // Créer une feuille de style temporaire pour forcer l'affichage complet
            const tempStyle = document.createElement('style');
            tempStyle.setAttribute('data-temp-export', 'true');
            tempStyle.textContent = `
                .tier-list { 
                    max-height: none !important; 
                    overflow: visible !important; 
                }
                .tier-images { 
                    max-height: none !important; 
                    overflow: visible !important; 
                    height: auto !important; 
                }
            `;
            document.head.appendChild(tempStyle);
            
            // Sauvegarder et modifier les styles inline aussi
            originalStyles.set(tierListElement, {
                maxHeight: tierListElement.style.maxHeight,
                height: tierListElement.style.height,
                overflow: tierListElement.style.overflow
            });
            
            tierListElement.style.maxHeight = 'none';
            tierListElement.style.height = 'auto';
            tierListElement.style.overflow = 'visible';
            
            tierImages.forEach((element) => {
                originalStyles.set(element, {
                    maxHeight: element.style.maxHeight,
                    height: element.style.height,
                    overflow: element.style.overflow
                });
                element.style.maxHeight = 'none';
                element.style.height = 'auto';
                element.style.overflow = 'visible';
            });
            
            // Attendre un peu pour que le DOM se mette à jour
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Utiliser html2canvas si disponible
            if (typeof html2canvas !== 'undefined') {
                const canvas = await html2canvas(tierList, {
                    backgroundColor: '#1a1a1a',
                    scale: 1.5, // Bonne résolution mais pas trop lourde
                    logging: false,
                    useCORS: true,
                    allowTaint: true,
                    width: tierList.scrollWidth,
                    height: tierList.scrollHeight,
                    scrollX: 0,
                    scrollY: 0
                });
                
                // Télécharger l'image
                const link = document.createElement('a');
                link.download = `tier-list-${new Date().toISOString().slice(0, 10)}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                this.showNotification('📸 Tier list exportée avec succès !');
            } else {
                // Fallback: méthode manuelle
                this.exportTierListManually();
            }
            
            // Restaurer les styles originaux
            originalStyles.forEach((styles, element) => {
                element.style.maxHeight = styles.maxHeight;
                element.style.height = styles.height;
                element.style.overflow = styles.overflow;
            });
            
            // Supprimer la feuille de style temporaire
            const exportTempStyle = document.querySelector('style[data-temp-export]');
            if (exportTempStyle) {
                exportTempStyle.remove();
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            this.showNotification('❌ Erreur lors de l\'export');
            
            // Nettoyer en cas d'erreur aussi
            const tempStyle = document.querySelector('style[data-temp-export]');
            if (tempStyle) {
                tempStyle.remove();
            }
        } finally {
            // Restaurer l'affichage
            const gameArea = document.querySelector('.game-area');
            const gameOver = document.getElementById('game-over');
            
            if (gameArea) gameArea.style.display = '';
            if (gameOver) gameOver.style.display = '';
        }
    }
    
    exportTierListManually() {
        // Méthode alternative sans bibliothèque externe
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Taille du canvas
        canvas.width = 800;
        canvas.height = 1200;
        
        // Fond
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Titre
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Tier List', canvas.width / 2, 50);
        
        // Couleurs des tiers
        const tierColors = {
            s: '#ff6b9d',
            a: '#ff9800',
            b: '#4caf50',
            c: '#607d8b',
            f: '#2196f3'
        };
        
        const tierLabels = {
            s: '❤️‍🔥 A MARIER',
            a: '😳 JE PRÉTENDS RÉFLÉCHIR',
            b: '🙂 SI Y\'A RIEN D\'AUTRE',
            c: '😬 MÊME BOURRÉ J\'HÉSITE',
            f: '🧊 NOPE TOTAL'
        };
        
        let y = 100;
        
        Object.keys(this.tiers).forEach(tier => {
            const count = this.tiers[tier].length;
            
            // Header du tier
            ctx.fillStyle = tierColors[tier];
            ctx.fillRect(50, y, canvas.width - 100, 60);
            
            // Label du tier
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(tierLabels[tier], 70, y + 35);
            
            // Compteur
            ctx.textAlign = 'right';
            ctx.fillText(count.toString(), canvas.width - 70, y + 35);
            
            y += 80;
            
            // Note: Les images nécessiteraient un chargement asynchrone
            // Pour l'instant, on affiche juste le nombre
            if (count > 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(50, y, canvas.width - 100, 60);
                
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${count} personnage(s) dans ce tier`, canvas.width / 2, y + 35);
                
                y += 80;
            }
            
            y += 20; // Espacement entre les tiers
        });
        
        // Télécharger
        const link = document.createElement('a');
        link.download = `tier-list-simple-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        this.showNotification('📸 Tier list exportée (version simplifiée) !');
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
    
    playGameOverSound() {
        try {
            // Créer un élément audio pour le son de fin
            const audio = new Audio();
            
            // Jouer le son "what-da-hell.mp3" parce que pourquoi pas ! 😂
            audio.src = 'what-da-hell.mp3';
            
            // Régler le volume
            audio.volume = 0.7; // Un peu plus fort pour "what da hell" 😄
            
            // Jouer le son
            audio.play().catch(error => {
                console.log('Impossible de jouer le son automatiquement:', error);
                // Les navigateurs bloquent souvent l'autoplay audio
            });
            
        } catch (error) {
            console.error('Erreur lors de la lecture du son:', error);
        }
    }
}

// Initialiser le jeu
document.addEventListener('DOMContentLoaded', () => {
    new TierListGame();
});

// Empêcher le scroll sur mobile
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('#current-card')) {
        e.preventDefault();
    }
}, { passive: false });