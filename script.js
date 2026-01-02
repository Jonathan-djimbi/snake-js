
class Game {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.blockSize = 30;
        this.canvasWidth = 900;
        this.canvasHeight = 600;
        this.score = 0;
        this.season = 'spring'; // spring, summer, fall, winter
        this.isRunning = false;

        // Mobile adjustments
        if (window.innerWidth <= 600) {
            this.blockSize = 20;
            this.canvasWidth = window.innerWidth - 20;
            this.canvasHeight = Math.floor((window.innerHeight * 0.6) / this.blockSize) * this.blockSize;
        }

        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;

        document.getElementById('canvasDiv').innerHTML = '';
        document.getElementById('canvasDiv').appendChild(this.canvas);

        this.snake = new Snake(this);
        this.food = new Food(this);
        this.renderer = new Renderer(this);
        this.inputHandler = new InputHandler(this);

        this.loop = this.loop.bind(this);
    }

    start() {
        this.score = 0;
        this.snake.reset();
        this.food.respawn();
        this.isRunning = true;
        this.lastTime = 0;
        requestAnimationFrame(this.loop);
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastTime;

        // Control game speed (simulating the old delay of 100ms)
        if (deltaTime > 100) {
            this.update();
            this.renderer.draw();
            this.lastTime = timestamp;
        }

        requestAnimationFrame(this.loop);
    }

    update() {
        this.snake.update();

        if (this.snake.checkCollision()) {
            this.gameOver();
            return;
        }

        if (this.snake.checkFoodCollision(this.food)) {
            this.score++;
            this.snake.grow();
            this.food.respawn();

            // Season Cycle Logic (every 5 points)
            const seasons = ['spring', 'summer', 'fall', 'winter'];
            const seasonIndex = Math.floor((this.score / 5) % 4);
            this.season = seasons[seasonIndex];

            this.updateUI();
        }
    }

    updateUI() {
        const seasonDisplay = document.getElementById('seasonDisplay');
        const scoreDisplay = document.getElementById('scoreDisplay');

        if (seasonDisplay) seasonDisplay.textContent = this.season.charAt(0).toUpperCase() + this.season.slice(1);
        if (scoreDisplay) scoreDisplay.textContent = this.score + 'g';
    }

    gameOver() {
        this.isRunning = false;
        this.renderer.drawGameOver();
    }
}

class Snake {
    constructor(game) {
        this.game = game;
        this.reset();
    }

    reset() {
        this.body = [
            {x: 6, y: 4},
            {x: 5, y: 4},
            {x: 4, y: 4},
            {x: 3, y: 4},
            {x: 2, y: 4}
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.ateFood = false;
    }

    setDirection(newDir) {
        const opposites = {
            'left': 'right',
            'right': 'left',
            'up': 'down',
            'down': 'up'
        };

        if (opposites[newDir] !== this.direction) {
            this.nextDirection = newDir;
        }
    }

    update() {
        this.direction = this.nextDirection;
        const head = {...this.body[0]};

        switch(this.direction) {
            case 'left': head.x--; break;
            case 'right': head.x++; break;
            case 'up': head.y--; break;
            case 'down': head.y++; break;
        }

        this.body.unshift(head);

        if (!this.ateFood) {
            this.body.pop();
        } else {
            this.ateFood = false;
        }
    }

    grow() {
        this.ateFood = true;
    }

    checkCollision() {
        const head = this.body[0];
        const widthInBlocks = this.game.canvasWidth / this.game.blockSize;
        const heightInBlocks = this.game.canvasHeight / this.game.blockSize;

        // Wall collision
        if (head.x < 0 || head.x >= widthInBlocks || head.y < 0 || head.y >= heightInBlocks) {
            return true;
        }

        // Self collision
        for (let i = 1; i < this.body.length; i++) {
            if (head.x === this.body[i].x && head.y === this.body[i].y) {
                return true;
            }
        }

        return false;
    }

    checkFoodCollision(food) {
        const head = this.body[0];
        return head.x === food.x && head.y === food.y;
    }
}

class Food {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
        this.respawn();
    }

    respawn() {
        const widthInBlocks = this.game.canvasWidth / this.game.blockSize;
        const heightInBlocks = this.game.canvasHeight / this.game.blockSize;

        let validPosition = false;
        while (!validPosition) {
            this.x = Math.floor(Math.random() * widthInBlocks);
            this.y = Math.floor(Math.random() * heightInBlocks);

            validPosition = true;
            for (let block of this.game.snake.body) {
                if (block.x === this.x && block.y === this.y) {
                    validPosition = false;
                    break;
                }
            }
        }
    }
}

class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.blockSize = game.blockSize;

        // Pixel Art Colors
        this.colors = {
            spring: { bg: '#56a147', grass: '#6abf58' },
            summer: { bg: '#8fbc4d', grass: '#a6d95b' },
            fall:   { bg: '#d48c3f', grass: '#e69d51' },
            winter: { bg: '#e8f2ff', grass: '#ffffff' }
        };
    }

    draw() {
        this.ctx.clearRect(0, 0, this.game.canvasWidth, this.game.canvasHeight);

        this.drawBackground();
        // this.drawScore(); // Score is now in HTML overlay
        this.drawSnake();
        this.drawFood();
    }

    drawBackground() {
        const season = this.game.season;
        const theme = this.colors[season];

        this.ctx.fillStyle = theme.bg;
        this.ctx.fillRect(0, 0, this.game.canvasWidth, this.game.canvasHeight);

        // Draw some texture (simple noise/grass blades)
        this.ctx.fillStyle = theme.grass;
        for (let i = 0; i < 20; i++) {
             // Random procedural grass patches based on canvas size, but deterministic-ish would be better.
             // For now just random is fine as it redraws every frame? No, that would flicker.
             // We need a deterministic pattern or draw it once to an offscreen canvas.
             // For simplicity/performance in this MVP, let's just do a checker pattern or simple grid
        }

        // Simple Grid for "Tilled Soil" look
        this.ctx.strokeStyle = "rgba(0,0,0,0.05)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let x = 0; x <= this.game.canvasWidth; x += this.blockSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.game.canvasHeight);
        }
        for (let y = 0; y <= this.game.canvasHeight; y += this.blockSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.game.canvasWidth, y);
        }
        this.ctx.stroke();
    }

    drawSnake() {
        // Draw Snake as "Junimo" style (rounded squares with little antenna on head)
        const body = this.game.snake.body;

        for (let i = 0; i < body.length; i++) {
            const block = body[i];
            const x = block.x * this.blockSize;
            const y = block.y * this.blockSize;

            // Body color
            this.ctx.fillStyle = i === 0 ? "#74d435" : "#5cb823"; // Head is lighter

            // Rounded rect for organic look
            this.fillRoundedRect(x + 1, y + 1, this.blockSize - 2, this.blockSize - 2, 4);

            // Eyes for head
            if (i === 0) {
                this.ctx.fillStyle = "black";

                let eyeOffsetX = 0;
                let eyeOffsetY = 0;

                // Adjust eyes based on direction
                switch(this.game.snake.direction) {
                    case 'right': eyeOffsetX = 4; break;
                    case 'left': eyeOffsetX = -4; break;
                    case 'down': eyeOffsetY = 4; break;
                    case 'up': eyeOffsetY = -4; break;
                }

                this.ctx.fillRect(x + this.blockSize/2 - 4 + eyeOffsetX, y + this.blockSize/2 - 4 + eyeOffsetY, 3, 3);
                this.ctx.fillRect(x + this.blockSize/2 + 4 + eyeOffsetX, y + this.blockSize/2 - 4 + eyeOffsetY, 3, 3);

                // Blush
                this.ctx.fillStyle = "#ffaaaa";
                this.ctx.fillRect(x + this.blockSize/2 - 6 + eyeOffsetX, y + this.blockSize/2 + 2 + eyeOffsetY, 3, 2);
                this.ctx.fillRect(x + this.blockSize/2 + 6 + eyeOffsetX, y + this.blockSize/2 + 2 + eyeOffsetY, 3, 2);
            }
        }
    }

    drawFood() {
        const x = this.game.food.x * this.blockSize;
        const y = this.game.food.y * this.blockSize;
        const s = this.blockSize;

        // Draw Crop based on Season
        // Spring: Parsnip, Summer: Blueberry, Fall: Pumpkin, Winter: Crystal Fruit

        this.drawPixelArt(x, y, s, this.game.season);
    }

    drawPixelArt(x, y, size, season) {
        const pixelSize = size / 5; // 5x5 grid
        let map = [];
        let palette = {};

        if (season === 'spring') {
            // Parsnip
            // . G .
            // G W G
            // . W .
            // . W .
            // . T .
            palette = { G: '#4c9634', W: '#f2e8c9', T: '#d9a066' };
            map = [
                [0, 'G', 0],
                ['G', 'W', 'G'],
                [0, 'W', 0],
                [0, 'W', 0],
                [0, 'T', 0]
            ];
            // Adjust to 5x5 by centering 3x5
        } else if (season === 'summer') {
            // Blueberry (Multiple)
            palette = { B: '#2b3a8f', L: '#66cc44' };
            map = [
                [0, 'L', 0, 'L', 0],
                ['B', 'B', 0, 'B', 'B'],
                ['B', 'B', 0, 'B', 'B'],
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0]
            ];
        } else if (season === 'fall') {
            // Pumpkin
            palette = { O: '#e66a25', S: '#3a7d33' };
            map = [
                [0, 0, 'S', 0, 0],
                [0, 'O', 'O', 'O', 0],
                ['O', 'O', 'O', 'O', 'O'],
                ['O', 'O', 'O', 'O', 'O'],
                [0, 'O', 'O', 'O', 0]
            ];
        } else {
            // Winter Root/Crystal
            palette = { C: '#a3dce8', B: '#4a8bad' };
            map = [
                [0, 0, 'C', 0, 0],
                [0, 'C', 'C', 'C', 0],
                ['B', 'C', 'C', 'C', 'B'],
                [0, 'B', 'C', 'B', 0],
                [0, 0, 'B', 0, 0]
            ];
        }

        // Draw the pixel map
        // If map is 3x5, we center it.
        const offsetX = (size - (map[0].length * pixelSize)) / 2;
        const offsetY = (size - (map.length * pixelSize)) / 2;

        for(let r=0; r < map.length; r++) {
            for(let c=0; c < map[r].length; c++) {
                if (map[r][c] !== 0) {
                    this.ctx.fillStyle = palette[map[r][c]];
                    this.ctx.fillRect(x + offsetX + c * pixelSize, y + offsetY + r * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    }

    fillRoundedRect(x, y, w, h, r) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.arcTo(x + w, y, x + w, y + h, r);
        this.ctx.arcTo(x + w, y + h, x, y + h, r);
        this.ctx.arcTo(x, y + h, x, y, r);
        this.ctx.arcTo(x, y, x + w, y, r);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawScore() {
        this.ctx.save();
        this.ctx.font = "bold 10rem sans-serif";
        this.ctx.fillStyle = "gray";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.globalAlpha = 0.3;
        const centerX = this.game.canvasWidth / 2;
        const centerY = this.game.canvasHeight / 2;
        this.ctx.fillText(this.game.score.toString(), centerX, centerY);
        this.ctx.restore();
    }

    drawGameOver() {
        this.ctx.save();
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(0, 0, this.game.canvasWidth, this.game.canvasHeight);

        this.ctx.font = "bold 40px sans-serif";
        this.ctx.fillStyle = "#f00020";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        const centerX = this.game.canvasWidth / 2;
        const centerY = this.game.canvasHeight / 2;

        this.ctx.fillText("Game Over", centerX, centerY - 50);

        this.ctx.font = "bold 20px sans-serif";
        this.ctx.fillStyle = "white";

        // Check for touch capability roughly
        const msg = ('ontouchstart' in window) ? "Tap to Restart" : "Press Space to Restart";
        this.ctx.fillText(msg, centerX, centerY + 20);

        this.ctx.restore();
    }
}

class InputHandler {
    constructor(game) {
        this.game = game;
        document.addEventListener('keydown', this.handleKey.bind(this));

        // Touch events
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.game.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), {passive: false});
        this.game.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), {passive: false}); // Prevent scroll
        this.game.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Handle reset buttons
        const restartBtn = document.getElementById('space');
        if (restartBtn) restartBtn.addEventListener('click', () => game.start());

        // Handle existing UI buttons
        const btns = document.querySelectorAll('.container');
        btns.forEach(btn => {
             btn.addEventListener('click', (e) => {
                 const id = e.target.id;
                 if (id === 'left' || id === 'right' || id === 'up' || id === 'down') {
                     this.game.snake.setDirection(id);
                 } else if (id === 'space') {
                     this.game.start();
                 }
             });
        });
    }

    handleKey(e) {
        const key = e.keyCode;
        switch (key) {
            case 37: this.game.snake.setDirection("left"); break;
            case 38: this.game.snake.setDirection("up"); break;
            case 39: this.game.snake.setDirection("right"); break;
            case 40: this.game.snake.setDirection("down"); break;
            case 32: this.game.start(); break;
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
    }

    handleTouchMove(e) {
        e.preventDefault(); // Stop scrolling while playing
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;

        this.handleSwipe(this.touchStartX, this.touchStartY, touchEndX, touchEndY);
    }

    handleSwipe(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;

        if (!this.game.isRunning) {
            // Tap to restart
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                this.game.start();
            }
            return;
        }

        // Threshold to be considered a swipe
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal
            if (Math.abs(dx) > 30) {
                if (dx > 0) this.game.snake.setDirection("right");
                else this.game.snake.setDirection("left");
            }
        } else {
            // Vertical
            if (Math.abs(dy) > 30) {
                if (dy > 0) this.game.snake.setDirection("down");
                else this.game.snake.setDirection("up");
            }
        }
    }
}

// Initialize Game
let gameInstance;
window.onload = function() {
    gameInstance = new Game();
    gameInstance.start();
};
