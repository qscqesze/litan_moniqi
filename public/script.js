// 立即执行函数，不依赖DOMContentLoaded
(function() {
    // 如果DOM还没准备好，等待一下
    function waitForDOM(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            // DOM已经准备好了，立即执行
            callback();
        }
    }
    
    waitForDOM(() => {
        // 常量定义
        const CIRCLE_RADIUS = 300;
        const ARROW_SIZE = 20;
        const MAX_DISTANCE = CIRCLE_RADIUS - ARROW_SIZE;
        
        // DOM元素
        const arrow = document.getElementById('arrow');
        const circle = document.getElementById('circle');
        const container = document.querySelector('.container');
        const startButton = document.getElementById('start-star-move');
        const countdownElement = document.getElementById('countdown');
        const gameStatusElement = document.getElementById('game-status');
        
        // 检查必要的DOM元素是否存在
        if (!arrow || !circle || !container) {
            console.error('Required DOM elements not found');
            return;
        }
        
        // 游戏状态
        const gameState = {
            arrow: { x: 0, y: 0, speed: 3, rotationAngle: 0 },
            mouse: { x: 0, y: 0 },
            starMove: { isActive: false, isCountingDown: false },
            debug: { isActive: false, bossRay: null, reflectedRay: null },
            keys: { w: false, a: false, s: false, d: false }
        };
        
        // 初始化UI
        function initializeUI() {
            // 设置容器样式
            Object.assign(container.style, {
                width: '700px', height: '700px', position: 'relative'
            });
            
            // 设置圆形样式
            Object.assign(circle.style, {
                position: 'absolute', width: '600px', height: '600px',
                borderRadius: '50%', backgroundColor: '#ffffff',
                border: '3px solid #3498db', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 15px rgba(0, 0, 0, 0.1)'
            });
            
            // 设置箭头样式
            Object.assign(arrow.style, {
                position: 'absolute', fontSize: '24px', width: '40px', height: '40px',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                backgroundColor: '#e74c3c', color: 'white', borderRadius: '50%',
                zIndex: '10', transition: 'transform 0.1s ease', cursor: 'pointer'
            });
        }
        
        // 创建标记元素的通用函数
        function createMarker(text, size, bgColor, position = { x: 0, y: 0 }) {
            const element = document.createElement('div');
            Object.assign(element.style, {
                position: 'absolute', width: `${size}px`, height: `${size}px`,
                borderRadius: '50%', backgroundColor: bgColor, color: 'white',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: size > 50 ? '14px' : '16px', fontWeight: 'bold',
                left: '50%', top: '50%', zIndex: '5',
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)'
            });
            element.textContent = text;
            container.appendChild(element);
            return element;
        }
        
        // 创建数字标记
        function createNumberMarkers() {
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
            const radius = 320;
            
            numbers.forEach((number, index) => {
                const angle = (index * 45 - 90) * (Math.PI / 180);
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);
                createMarker(number.toString(), 30, '#2c3e50', { x, y });
            });
        }
        
        // 创建Boss标记
        function createBossMarker() {
            const boss = createMarker('李🥛', 80, '#8e44ad');
            boss.style.border = '3px solid #9b59b6';
            boss.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
            return boss;
        }
        
        // 创建Debug按钮
        function createDebugButton() {
            const button = document.createElement('button');
            Object.assign(button.style, {
                position: 'absolute', top: '10px', right: '10px',
                padding: '10px 15px', backgroundColor: '#34495e',
                color: 'white', border: 'none', borderRadius: '5px',
                cursor: 'pointer', fontSize: '14px', zIndex: '20'
            });
            button.textContent = 'Debug模式';
            button.addEventListener('click', toggleDebugMode);
            document.body.appendChild(button);
            return button;
        }
        
        // 数学工具函数
        const MathUtils = {
            // 计算两点间距离
            distance(x1, y1, x2, y2) {
                return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            },
            
            // 计算角度
            angle(x1, y1, x2, y2) {
                return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
            },
            
            // 计算两向量夹角
            vectorAngle(x1, y1, x2, y2) {
                const dot = x1 * x2 + y1 * y2;
                const mag1 = Math.sqrt(x1 * x1 + y1 * y1);
                const mag2 = Math.sqrt(x2 * x2 + y2 * y2);
                const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
                return Math.acos(cos) * (180 / Math.PI);
            },
            
            // 射线与圆交点
            rayCircleIntersection(startX, startY, dirX, dirY, radius) {
                const a = dirX * dirX + dirY * dirY;
                const b = 2 * (startX * dirX + startY * dirY);
                const c = startX * startX + startY * startY - radius * radius;
                const discriminant = b * b - 4 * a * c;
                
                if (discriminant < 0) return null;
                
                const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
                const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
                const t = t1 > 0.01 ? t1 : (t2 > 0.01 ? t2 : -1);
                
                return t > 0 ? { x: startX + t * dirX, y: startY + t * dirY } : null;
            }
        };
        
        // 射线管理
        const RayManager = {
            create(startX, startY, endX, endY, color = '#ff0000', thickness = 3) {
                const ray = document.createElement('div');
                const length = MathUtils.distance(startX, startY, endX, endY);
                const angle = MathUtils.angle(startX, startY, endX, endY);
                
                Object.assign(ray.style, {
                    position: 'absolute', height: `${thickness}px`,
                    backgroundColor: color, transformOrigin: '0 50%',
                    zIndex: '8', boxShadow: `0 0 10px ${color}`,
                    width: `${length}px`,
                    left: `calc(50% + ${startX}px)`,
                    top: `calc(50% + ${startY}px)`,
                    transform: `translate(0, -50%) rotate(${angle}deg)`
                });
                
                container.appendChild(ray);
                return ray;
            },
            
            remove(ray) {
                if (ray && ray.parentNode) {
                    container.removeChild(ray);
                }
            }
        };
        
        // 箭头控制
        function updateArrowPosition() {
            const { arrow: arrowState, mouse } = gameState;
            
            // 约束箭头在圆内
            const distance = MathUtils.distance(0, 0, arrowState.x, arrowState.y);
            if (distance > MAX_DISTANCE) {
                const angle = Math.atan2(arrowState.y, arrowState.x);
                arrowState.x = MAX_DISTANCE * Math.cos(angle);
                arrowState.y = MAX_DISTANCE * Math.sin(angle);
            }
            
            // 计算朝向
            const containerRect = container.getBoundingClientRect();
            const centerX = containerRect.left + containerRect.width / 2;
            const centerY = containerRect.top + containerRect.height / 2;
            const arrowScreenX = centerX + arrowState.x;
            const arrowScreenY = centerY + arrowState.y;
            
            arrowState.rotationAngle = MathUtils.angle(arrowScreenX, arrowScreenY, mouse.x, mouse.y) + 90;
            
            // 更新位置
            arrow.style.left = '50%';
            arrow.style.top = '50%';
            arrow.style.transform = `translate(calc(-50% + ${arrowState.x}px), calc(-50% + ${arrowState.y}px)) rotate(${arrowState.rotationAngle}deg)`;
            
            if (gameState.debug.isActive) updateDebugRays();
        }
        
        // 计算反射角度差
        function calculateReflectionAngle() {
            const { arrow: arrowState } = gameState;
            const bossToArrowX = arrowState.x;
            const bossToArrowY = arrowState.y;
            const arrowDirection = (arrowState.rotationAngle - 90) * Math.PI / 180;
            const arrowDirX = Math.cos(arrowDirection);
            const arrowDirY = Math.sin(arrowDirection);
            
            return MathUtils.vectorAngle(bossToArrowX, bossToArrowY, arrowDirX, arrowDirY) - 90;
        }
        
        // Debug模式
        function toggleDebugMode() {
            gameState.debug.isActive = !gameState.debug.isActive;
            const button = document.querySelector('#debug-button') || createDebugButton();
            
            if (gameState.debug.isActive) {
                button.textContent = '关闭Debug';
                button.style.backgroundColor = '#e74c3c';
                updateDebugRays();
            } else {
                button.textContent = 'Debug模式';
                button.style.backgroundColor = '#34495e';
                clearDebugRays();
            }
        }
        
        function updateDebugRays() {
            if (!gameState.debug.isActive) return;
            
            clearDebugRays();
            const { arrow: arrowState } = gameState;
            const angleDiff = calculateReflectionAngle();
            
            // Boss射线
            gameState.debug.bossRay = RayManager.create(0, 0, arrowState.x, arrowState.y, 'rgba(255, 0, 0, 0.6)', 2);
            
            // 反射射线
            if (angleDiff <= 90 && angleDiff >= 0) {
                const arrowDirection = (arrowState.rotationAngle - 90) * Math.PI / 180;
                const arrowDirX = Math.cos(arrowDirection);
                const arrowDirY = Math.sin(arrowDirection);
                const intersection = MathUtils.rayCircleIntersection(arrowState.x, arrowState.y, arrowDirX, arrowDirY, CIRCLE_RADIUS);
                
                if (intersection) {
                    gameState.debug.reflectedRay = RayManager.create(arrowState.x, arrowState.y, intersection.x, intersection.y, 'rgba(0, 255, 0, 0.6)', 2);
                }
            }
            
            updateDebugInfo(angleDiff);
        }
        
        function clearDebugRays() {
            RayManager.remove(gameState.debug.bossRay);
            RayManager.remove(gameState.debug.reflectedRay);
            gameState.debug.bossRay = null;
            gameState.debug.reflectedRay = null;
            
            const debugInfo = document.getElementById('debug-info');
            if (debugInfo) debugInfo.remove();
        }
        
        function updateDebugInfo(angleDiff) {
            let debugInfo = document.getElementById('debug-info');
            if (!debugInfo) {
                debugInfo = document.createElement('div');
                debugInfo.id = 'debug-info';
                Object.assign(debugInfo.style, {
                    position: 'absolute', top: '60px', right: '10px',
                    padding: '10px', backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white', borderRadius: '5px', fontSize: '12px',
                    zIndex: '20', fontFamily: 'monospace'
                });
                document.body.appendChild(debugInfo);
            }
            
            const { arrow: arrowState } = gameState;
            const status = angleDiff <= 90 && angleDiff >= 0 ? '成功' : '失败';
            const statusColor = angleDiff <= 90 && angleDiff >= 0 ? '#2ecc71' : '#e74c3c';
            const distance = MathUtils.distance(0, 0, arrowState.x, arrowState.y);
            
            debugInfo.innerHTML = `
                <div style="margin-bottom: 8px; font-weight: bold; color: #3498db;">📍 箭头信息</div>
                <div>坐标: (${arrowState.x.toFixed(1)}, ${arrowState.y.toFixed(1)})</div>
                <div>距离: ${distance.toFixed(1)}px</div>
                <div style="margin-top: 8px; margin-bottom: 4px; font-weight: bold; color: #f39c12;">🎯 角度</div>
                <div>朝向: ${arrowState.rotationAngle.toFixed(1)}°</div>
                <div style="margin-top: 8px; margin-bottom: 4px; font-weight: bold; color: #e67e22;">⚡ 反射</div>
                <div>角度差: <span style="color: ${statusColor}">${angleDiff.toFixed(1)}°</span></div>
                <div>状态: <span style="color: ${statusColor}">${status}</span></div>
            `;
        }
        
        // 星移攻击
        function startStarMove() {
            if (gameState.starMove.isActive || gameState.starMove.isCountingDown) return;
            
            gameState.starMove.isCountingDown = true;
            startButton.disabled = true;
            gameStatusElement.textContent = '';
            gameStatusElement.className = 'game-status';
            
            let countdown = 5;
            countdownElement.textContent = countdown;
            countdownElement.classList.remove('hidden');
            
            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    countdownElement.textContent = countdown;
                } else {
                    clearInterval(countdownInterval);
                    countdownElement.classList.add('hidden');
                    gameState.starMove.isCountingDown = false;
                    executeStarMove();
                }
            }, 1000);
        }
        
        function executeStarMove() {
            gameState.starMove.isActive = true;
            const { arrow: arrowState } = gameState;
            const angleDiff = calculateReflectionAngle();
            
            // Boss射线
            const rayToArrow = RayManager.create(0, 0, arrowState.x, arrowState.y);
            
            setTimeout(() => {
                if (angleDiff <= 90 && angleDiff >= 0) {
                    // 成功反射
                    gameStatusElement.textContent = `成功！角度差: ${angleDiff.toFixed(1)}°`;
                    gameStatusElement.className = 'game-status success';
                    
                    // 反射射线
                    const arrowDirection = (arrowState.rotationAngle - 90) * Math.PI / 180;
                    const arrowDirX = Math.cos(arrowDirection);
                    const arrowDirY = Math.sin(arrowDirection);
                    const intersection = MathUtils.rayCircleIntersection(arrowState.x, arrowState.y, arrowDirX, arrowDirY, CIRCLE_RADIUS);
                    
                    const endX = intersection ? intersection.x : arrowState.x + arrowDirX * CIRCLE_RADIUS;
                    const endY = intersection ? intersection.y : arrowState.y + arrowDirY * CIRCLE_RADIUS;
                    const reflectedRay = RayManager.create(arrowState.x, arrowState.y, endX, endY, '#00ff00');
                    
                    setTimeout(() => RayManager.remove(reflectedRay), 2000);
                } else {
                    gameStatusElement.textContent = `失败！角度差: ${angleDiff.toFixed(1)}°`;
                    gameStatusElement.className = 'game-status failure';
                }
                
                setTimeout(() => {
                    RayManager.remove(rayToArrow);
                    gameState.starMove.isActive = false;
                    startButton.disabled = false;
                }, 1000);
            }, 500);
        }
        
        // 事件监听
        function setupEventListeners() {
            // 鼠标移动
            document.addEventListener('mousemove', (e) => {
                gameState.mouse.x = e.clientX;
                gameState.mouse.y = e.clientY;
            });
            
            // 键盘事件
            document.addEventListener('keydown', (e) => {
                const key = e.key.toLowerCase();
                if (gameState.keys.hasOwnProperty(key)) {
                    gameState.keys[key] = true;
                    e.preventDefault();
                }
            });
            
            document.addEventListener('keyup', (e) => {
                const key = e.key.toLowerCase();
                if (gameState.keys.hasOwnProperty(key)) {
                    gameState.keys[key] = false;
                }
            });
            
            // 按钮事件
            startButton.addEventListener('click', startStarMove);
        }
        
        // 游戏循环
        function gameLoop() {
            const { arrow: arrowState, keys } = gameState;
            
            // 移动控制
            if (keys.w) arrowState.y -= arrowState.speed;
            if (keys.a) arrowState.x -= arrowState.speed;
            if (keys.s) arrowState.y += arrowState.speed;
            if (keys.d) arrowState.x += arrowState.speed;
            
            updateArrowPosition();
            requestAnimationFrame(gameLoop);
        }
        
        // 初始化游戏
        function initGame() {
            initializeUI();
            createNumberMarkers();
            createBossMarker();
            createDebugButton();
            setupEventListeners();
            updateArrowPosition();
            gameLoop();
            
            // 初始化P2星移游戏 - 添加重试机制
            function initP2Game() {
                if (window.P2StarMoveGame) {
                    const p2Game = new P2StarMoveGame(gameState, container, MathUtils, RayManager);
                    
                    // 添加P2星移按钮事件监听
                    const p2StartButton = document.getElementById('start-p2-star-move');
                    if (p2StartButton) {
                        p2StartButton.addEventListener('click', () => {
                            p2Game.startP2StarMove();
                        });
                        console.log('P2星移按钮事件监听器已添加');
                    } else {
                        console.warn('P2星移按钮未找到');
                    }
                } else {
                    // 如果P2StarMoveGame还没加载，100ms后重试
                    console.log('P2StarMoveGame未加载，100ms后重试...');
                    setTimeout(initP2Game, 100);
                }
            }
            
            // 开始初始化P2游戏
            initP2Game();
        }
        
        initGame();
    });
})(); 