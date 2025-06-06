// P2星移游戏逻辑
class P2StarMoveGame {
    constructor(gameState, container, MathUtils, RayManager) {
        this.gameState = gameState;
        this.container = container;
        this.MathUtils = MathUtils;
        this.RayManager = RayManager;
        
        // P2游戏状态
        this.p2State = {
            isActive: false,
            isCountingDown: false,
            portal: null, // 传送门位置 (1-8)
            roles: {
                named: null,    // 被点名玩家
                relay1: null,   // 一传
                relay2: null,   // 二传
                relay3: null,   // 三传
                teleporter: null // 传送者
            },
            playerRole: null, // 玩家扮演的角色
            aiPositions: {}, // AI角色的位置
            reflectionChain: [], // 反射链条
            gameElements: [] // 游戏元素（用于清理）
        };
        
        // 8个点的位置（对应数字1-8）
        this.numberPositions = this.calculateNumberPositions();
    }
    
    // 计算8个数字点的位置
    calculateNumberPositions() {
        const positions = {};
        const radius = 320;
        
        for (let i = 1; i <= 8; i++) {
            const angle = ((i - 1) * 45 - 90) * (Math.PI / 180);
            positions[i] = {
                x: radius * Math.cos(angle),
                y: radius * Math.sin(angle)
            };
        }
        return positions;
    }
    
    // 开始P2星移
    startP2StarMove() {
        if (this.p2State.isActive || this.p2State.isCountingDown) return;
        
        this.p2State.isCountingDown = true;
        const startButton = document.getElementById('start-p2-star-move');
        const countdownElement = document.getElementById('countdown');
        const gameStatusElement = document.getElementById('game-status');
        
        startButton.disabled = true;
        gameStatusElement.textContent = '';
        gameStatusElement.className = 'game-status';
        
        // 初始化游戏设置
        this.initializeP2Game();
        
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
                this.p2State.isCountingDown = false;
                this.executeP2StarMove();
            }
        }, 1000);
    }
    
    // 初始化P2游戏
    initializeP2Game() {
        // 随机选择传送门位置
        this.p2State.portal = Math.floor(Math.random() * 8) + 1;
        
        // 随机分配角色
        this.assignRoles();
        
        // 设置AI位置
        this.setupAIPositions();
        
        // 创建游戏UI元素
        this.createGameElements();
        
        console.log('P2星移初始化完成:', {
            portal: this.p2State.portal,
            playerRole: this.p2State.playerRole,
            roles: this.p2State.roles
        });
    }
    
    // 分配角色
    assignRoles() {
        const roleNames = ['named', 'relay1', 'relay2', 'relay3', 'teleporter'];
        const shuffledRoles = [...roleNames].sort(() => Math.random() - 0.5);
        
        // 玩家随机获得一个角色
        this.p2State.playerRole = shuffledRoles[0];
        
        // 分配所有角色
        shuffledRoles.forEach((role, index) => {
            this.p2State.roles[role] = index === 0 ? 'player' : 'ai';
        });
    }
    
    // 设置AI位置
    setupAIPositions() {
        const portalPos = this.numberPositions[this.p2State.portal];
        const CIRCLE_RADIUS = 300;
        const MAX_DISTANCE = CIRCLE_RADIUS - 20;
        
        Object.keys(this.p2State.roles).forEach(role => {
            if (this.p2State.roles[role] === 'ai') {
                let position;
                
                switch (role) {
                    case 'named':
                        // 站在boss、传送门连线的延长线上
                        position = this.calculateNamedPosition(portalPos);
                        break;
                    case 'relay1':
                        position = this.calculateRelay1Position(portalPos);
                        break;
                    case 'relay2':
                        position = this.calculateRelay2Position(portalPos);
                        break;
                    case 'relay3':
                        // 站在传送门前面
                        position = this.calculateRelay3Position(portalPos);
                        break;
                    case 'teleporter':
                        // 站在传送门前面，确保射线能穿过
                        position = this.calculateTeleporterPosition(portalPos);
                        break;
                }
                
                // 确保位置在圆内
                const distance = this.MathUtils.distance(0, 0, position.x, position.y);
                if (distance > MAX_DISTANCE) {
                    const angle = Math.atan2(position.y, position.x);
                    position.x = MAX_DISTANCE * Math.cos(angle);
                    position.y = MAX_DISTANCE * Math.sin(angle);
                }
                
                this.p2State.aiPositions[role] = position;
            }
        });
    }
    
    // 计算被点名玩家位置
    calculateNamedPosition(portalPos) {
        // 在boss(0,0)和传送门连线的延长线上
        const angle = Math.atan2(portalPos.y, portalPos.x);
        const distance = 200; // 距离boss的距离
        return {
            x: -distance * Math.cos(angle), // 反方向
            y: -distance * Math.sin(angle)
        };
    }
    
    // 计算一传位置
    calculateRelay1Position(portalPos) {
        const perpAngle = Math.atan2(portalPos.y, portalPos.x) - Math.PI / 2;
        const offset = 120;
        return {
            x: portalPos.x + offset * Math.cos(perpAngle),
            y: portalPos.y + offset * Math.sin(perpAngle)
        };
    }
    
    // 计算二传位置
    calculateRelay2Position(portalPos) {
        const perpAngle = Math.atan2(portalPos.y, portalPos.x) + Math.PI / 2;
        const offset = 120;
        return {
            x: portalPos.x + offset * Math.cos(perpAngle),
            y: portalPos.y + offset * Math.sin(perpAngle)
        };
    }
    
    // 计算三传位置
    calculateRelay3Position(portalPos) {
        // 传送门前面（朝向中心方向）
        const angle = Math.atan2(portalPos.y, portalPos.x);
        const offset = 100;
        return {
            x: portalPos.x - offset * Math.cos(angle),
            y: portalPos.y - offset * Math.sin(angle)
        };
    }
    
    // 计算传送者位置
    calculateTeleporterPosition(portalPos) {
        // 获取三传的位置
        const relay3Pos = this.calculateRelay3Position(portalPos);
        
        // 传送者位于三传和传送门之间的射线路径上
        const midX = (relay3Pos.x + portalPos.x) / 2;
        const midY = (relay3Pos.y + portalPos.y) / 2;
        
        return {
            x: midX,
            y: midY
        };
    }
    
    // 创建游戏元素
    createGameElements() {
        // 创建AI角色标记（跳过玩家扮演的角色）
        Object.keys(this.p2State.aiPositions).forEach(role => {
            // 只为AI角色创建标记，跳过玩家角色
            if (this.p2State.roles[role] === 'ai') {
                const position = this.p2State.aiPositions[role];
                const roleInfo = this.getRoleInfo(role);
                const marker = this.createMarker(roleInfo.emoji, 35, roleInfo.color, position);
                marker.title = roleInfo.name;
                this.p2State.gameElements.push(marker);
            }
        });
        
        // 显示玩家角色信息
        this.showPlayerRoleInfo();
    }
    
    // 获取角色信息
    getRoleInfo(role) {
        const roleMap = {
            named: { name: '被点名', emoji: '🎯', color: '#e74c3c' },
            relay1: { name: '一传', emoji: '1️⃣', color: '#3498db' },
            relay2: { name: '二传', emoji: '2️⃣', color: '#2ecc71' },
            relay3: { name: '三传', emoji: '3️⃣', color: '#f39c12' },
            teleporter: { name: '传送者', emoji: '✨', color: '#9b59b6' }
        };
        return roleMap[role];
    }
    
    // 创建标记元素
    createMarker(text, size, bgColor, position) {
        const element = document.createElement('div');
        Object.assign(element.style, {
            position: 'absolute', width: `${size}px`, height: `${size}px`,
            borderRadius: '50%', backgroundColor: bgColor, color: 'white',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontSize: '16px', fontWeight: 'bold',
            left: '50%', top: '50%', zIndex: '15',
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)'
        });
        element.textContent = text;
        this.container.appendChild(element);
        return element;
    }
    
    // 显示玩家角色信息
    showPlayerRoleInfo() {
        const roleInfo = this.getRoleInfo(this.p2State.playerRole);
        const infoElement = document.createElement('div');
        infoElement.id = 'player-role-info';
        Object.assign(infoElement.style, {
            position: 'absolute', top: '10px', left: '10px',
            padding: '10px 15px', backgroundColor: roleInfo.color,
            color: 'white', borderRadius: '5px', fontSize: '16px',
            fontWeight: 'bold', zIndex: '20',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
        });
        infoElement.innerHTML = `你的角色: ${roleInfo.emoji} ${roleInfo.name}`;
        document.body.appendChild(infoElement);
        this.p2State.gameElements.push(infoElement);
    }
    
    // 执行P2星移
    executeP2StarMove() {
        this.p2State.isActive = true;
        this.p2State.reflectionChain = [];
        
        // 开始反射链条
        this.startReflectionChain();
    }
    
    // 开始反射链条
    startReflectionChain() {
        const gameStatusElement = document.getElementById('game-status');
        gameStatusElement.textContent = '开始P2星移...';
        gameStatusElement.className = 'game-status';
        
        // 延迟开始，让玩家准备
        setTimeout(() => {
            this.executeReflectionSequence();
        }, 1000);
    }
    
    // 执行反射序列
    executeReflectionSequence() {
        // 反射序列：boss -> 被点名 -> 一传 -> 二传 -> 三传 -> 传送门（穿过传送者）
        const sequence = [
            { from: 'boss', to: 'named' },
            { from: 'named', to: 'relay1' },
            { from: 'relay1', to: 'relay2' },
            { from: 'relay2', to: 'relay3' },
            { from: 'relay3', to: 'portal' } // 直接从三传到传送门，穿过传送者
        ];
        
        // 显示星移发动状态
        const gameStatusElement = document.getElementById('game-status');
        gameStatusElement.textContent = '星移发动中...';
        gameStatusElement.className = 'game-status';
        
        // 顺序执行反射，如果某一步失败就中断
        let chainBroken = false;
        for (let i = 0; i < sequence.length; i++) {
            if (chainBroken) break;
            
            const { from, to } = sequence[i];
            const reflectionResult = this.executeReflection(from, to);
            
            // 如果这一步反射失败，中断链条
            if (!reflectionResult.success) {
                chainBroken = true;
                console.log(`反射链条在 ${from} -> ${to} 处中断`);
            }
        }
        
        // 延迟检查结果，让射线显示一会儿
        setTimeout(() => {
            this.checkGameResult();
        }, 1500);
    }
    
    // 执行单次反射
    executeReflection(fromRole, toRole) {
        let fromPos, toPos;
        
        // 获取起始位置
        if (fromRole === 'boss') {
            fromPos = { x: 0, y: 0 };
        } else if (this.p2State.roles[fromRole] === 'player') {
            fromPos = { x: this.gameState.arrow.x, y: this.gameState.arrow.y };
        } else {
            fromPos = this.p2State.aiPositions[fromRole];
        }
        
        // 获取目标位置
        if (toRole === 'portal') {
            toPos = this.numberPositions[this.p2State.portal];
        } else if (this.p2State.roles[toRole] === 'player') {
            toPos = { x: this.gameState.arrow.x, y: this.gameState.arrow.y };
        } else {
            toPos = this.p2State.aiPositions[toRole];
        }
        
        let ray = null;
        let reflectionSuccess = true;
        let isReflection = false;
        
        // 如果起始角色是玩家，不创建入射射线，由玩家自己处理反射
        if (this.p2State.roles[fromRole] === 'player' && fromRole !== 'boss') {
            // 这是玩家的反射，由玩家自己创建反射射线
            isReflection = true;
            reflectionSuccess = this.checkPlayerReflection(fromPos, toPos, toRole);
        } else {
            // 创建射线（boss到任何角色，或AI到任何角色）
            ray = this.RayManager.create(fromPos.x, fromPos.y, toPos.x, toPos.y, '#ff0000', 3);
            
            if (toRole === 'portal') {
                // 这是最后一段射线到传送门，检查是否穿过传送者
                reflectionSuccess = this.checkRayPassesThroughTeleporter(fromPos, toPos);
            } else {
                // 这是一次反射
                isReflection = true;
                reflectionSuccess = this.checkReflection(fromPos, toPos, toRole);
            }
        }
        
        // 记录反射结果
        this.p2State.reflectionChain.push({
            from: fromRole,
            to: toRole,
            success: reflectionSuccess,
            isReflection: isReflection,
            ray: ray
        });
        
        return { success: reflectionSuccess, isReflection: isReflection, ray: ray };
    }
    
    // 检查反射是否成功
    checkReflection(fromPos, toPos, role) {
        // 如果是玩家角色，检查实际角度
        if (this.p2State.roles[role] === 'player') {
            const arrowState = this.gameState.arrow;
            // 修正：入射射线方向应该是从起始位置到玩家位置
            const bossToArrowX = toPos.x - fromPos.x;
            const bossToArrowY = toPos.y - fromPos.y;
            // 玩家箭头的朝向方向
            const arrowDirection = (arrowState.rotationAngle - 90) * Math.PI / 180;
            const arrowDirX = Math.cos(arrowDirection);
            const arrowDirY = Math.sin(arrowDirection);
            
            const angleDiff = this.MathUtils.vectorAngle(bossToArrowX, bossToArrowY, arrowDirX, arrowDirY) - 90;
            const isSuccess = angleDiff <= 90 && angleDiff >= 0;
            
            // 如果反射成功，创建反射射线到下一个目标
            if (isSuccess) {
                this.createPlayerReflectionRayToTarget(toPos, arrowDirX, arrowDirY);
            }
            
            return isSuccess;
        }
        
        // AI角色总是成功反射
        return true;
    }
    
    // 检查玩家反射（玩家作为起始角色）
    checkPlayerReflection(playerPos, targetPos, targetRole) {
        const arrowState = this.gameState.arrow;
        // 玩家箭头的朝向方向
        const arrowDirection = (arrowState.rotationAngle - 90) * Math.PI / 180;
        const arrowDirX = Math.cos(arrowDirection);
        const arrowDirY = Math.sin(arrowDirection);
        
        // 检查玩家射线是否指向目标
        let isSuccess = false;
        
        if (targetRole === 'portal') {
            // 射向传送门，检查射线是否穿过传送者
            const CIRCLE_RADIUS = 300;
            const intersection = this.MathUtils.rayCircleIntersection(
                playerPos.x, playerPos.y, 
                arrowDirX, arrowDirY, 
                CIRCLE_RADIUS
            );
            
            if (intersection) {
                // 检查射线是否穿过传送者
                isSuccess = this.checkRayPassesThroughTeleporter(playerPos, intersection);
                
                if (isSuccess) {
                    // 如果成功穿过传送者，创建到传送门的连线
                    const playerRay = this.RayManager.create(
                        playerPos.x, playerPos.y, 
                        targetPos.x, targetPos.y, 
                        '#00ff00', 3
                    );
                    this.p2State.gameElements.push(playerRay);
                } else {
                    // 如果没有穿过传送者，创建到边界的射线
                    const playerRay = this.RayManager.create(
                        playerPos.x, playerPos.y, 
                        intersection.x, intersection.y, 
                        '#ff0000', 3
                    );
                    this.p2State.gameElements.push(playerRay);
                }
            }
        } else {
            // 射向其他角色，检查玩家箭头方向是否指向目标
            const toTargetX = targetPos.x - playerPos.x;
            const toTargetY = targetPos.y - playerPos.y;
            const toTargetDistance = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);
            
            // 标准化方向向量
            const toTargetDirX = toTargetX / toTargetDistance;
            const toTargetDirY = toTargetY / toTargetDistance;
            
            // 计算玩家箭头方向与目标方向的夹角
            const dotProduct = arrowDirX * toTargetDirX + arrowDirY * toTargetDirY;
            const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct))) * (180 / Math.PI);
            
            // 如果角度小于阈值，认为射中了目标
            isSuccess = angle < 15; // 15度的容错范围
            
            if (isSuccess) {
                // 命中目标，创建到目标的连线
                const playerRay = this.RayManager.create(
                    playerPos.x, playerPos.y, 
                    targetPos.x, targetPos.y, 
                    '#00ff00', 3
                );
                this.p2State.gameElements.push(playerRay);
            } else {
                // 未命中目标，创建延展到边界的射线
                const CIRCLE_RADIUS = 300;
                const intersection = this.MathUtils.rayCircleIntersection(
                    playerPos.x, playerPos.y, 
                    arrowDirX, arrowDirY, 
                    CIRCLE_RADIUS
                );
                
                if (intersection) {
                    const playerRay = this.RayManager.create(
                        playerPos.x, playerPos.y, 
                        intersection.x, intersection.y, 
                        '#ff0000', 3
                    );
                    this.p2State.gameElements.push(playerRay);
                }
            }
        }
        
        return isSuccess;
    }
    
    // 创建玩家反射射线到下一个目标
    createPlayerReflectionRayToTarget(playerPos, arrowDirX, arrowDirY) {
        // 根据玩家角色确定下一个目标
        let nextTarget = null;
        let nextTargetPos = null;
        
        switch (this.p2State.playerRole) {
            case 'named':
                nextTarget = 'relay1';
                break;
            case 'relay1':
                nextTarget = 'relay2';
                break;
            case 'relay2':
                nextTarget = 'relay3';
                break;
            case 'relay3':
                nextTarget = 'portal';
                break;
            case 'teleporter':
                // 传送者不需要反射
                return;
        }
        
        // 获取下一个目标的位置
        if (nextTarget === 'portal') {
            nextTargetPos = this.numberPositions[this.p2State.portal];
        } else if (this.p2State.roles[nextTarget] === 'player') {
            nextTargetPos = { x: this.gameState.arrow.x, y: this.gameState.arrow.y };
        } else {
            nextTargetPos = this.p2State.aiPositions[nextTarget];
        }
        
        // 检查玩家箭头方向是否指向下一个目标
        const toTargetX = nextTargetPos.x - playerPos.x;
        const toTargetY = nextTargetPos.y - playerPos.y;
        const toTargetDistance = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);
        
        // 标准化方向向量
        const toTargetDirX = toTargetX / toTargetDistance;
        const toTargetDirY = toTargetY / toTargetDistance;
        
        // 计算玩家箭头方向与目标方向的夹角
        const dotProduct = arrowDirX * toTargetDirX + arrowDirY * toTargetDirY;
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct))) * (180 / Math.PI);
        
        // 如果角度小于阈值，创建到目标的线段
        if (angle < 15) { // 15度的容错范围
            const reflectedRay = this.RayManager.create(
                playerPos.x, playerPos.y, 
                nextTargetPos.x, nextTargetPos.y, 
                '#00ff00', 3
            );
            
            // 将反射射线添加到游戏元素中，以便后续清理
            this.p2State.gameElements.push(reflectedRay);
        } else {
            // 如果没有指向目标，创建延展到边界的射线
            const CIRCLE_RADIUS = 300;
            const intersection = this.MathUtils.rayCircleIntersection(
                playerPos.x, playerPos.y, 
                arrowDirX, arrowDirY, 
                CIRCLE_RADIUS
            );
            
            if (intersection) {
                const reflectedRay = this.RayManager.create(
                    playerPos.x, playerPos.y, 
                    intersection.x, intersection.y, 
                    '#ff0000', 3
                );
                
                // 将反射射线添加到游戏元素中，以便后续清理
                this.p2State.gameElements.push(reflectedRay);
            }
        }
    }
    
    // 检查射线是否穿过传送者
    checkRayPassesThroughTeleporter(fromPos, toPos) {
        // 获取传送者位置
        let teleporterPos;
        if (this.p2State.roles['teleporter'] === 'player') {
            teleporterPos = { x: this.gameState.arrow.x, y: this.gameState.arrow.y };
        } else {
            teleporterPos = this.p2State.aiPositions['teleporter'];
        }
        
        // 计算射线到传送者的最短距离
        const distance = this.calculatePointToLineDistance(teleporterPos, fromPos, toPos);
        
        // 如果距离小于一定阈值，认为射线穿过了传送者
        return distance < 15;
    }
    
    // 计算点到直线的距离
    calculatePointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // 检查游戏结果
    checkGameResult() {
        const gameStatusElement = document.getElementById('game-status');
        
        // 分离反射和最后一段射线
        const reflections = this.p2State.reflectionChain.filter(chain => chain.isReflection);
        const finalRay = this.p2State.reflectionChain.find(chain => !chain.isReflection);
        
        const allReflectionsSuccess = reflections.every(chain => chain.success);
        const correctReflectionCount = reflections.length === 4; // 应该有4次反射
        
        const rayPassesThroughTeleporter = finalRay && finalRay.success;
        
        // 生成详细的失败信息
        const failureReasons = [];
        if (!allReflectionsSuccess) {
            failureReasons.push('反射失败');
        }
        if (!correctReflectionCount) {
            failureReasons.push(`反射次数错误(${reflections.length}/4)`);
        }
        if (!rayPassesThroughTeleporter) {
            failureReasons.push('射线未穿过传送者');
        }
        
        // 判断最终结果
        if (allReflectionsSuccess && correctReflectionCount && rayPassesThroughTeleporter) {
            gameStatusElement.textContent = 'P2星移成功！完美的反射链条！';
            gameStatusElement.className = 'game-status success';
        } else {
            gameStatusElement.textContent = `P2星移失败！${failureReasons.join('，')}`;
            gameStatusElement.className = 'game-status failure';
        }
        
        // 清理游戏
        setTimeout(() => {
            this.cleanupP2Game();
        }, 3000);
    }
    
    // 清理P2游戏
    cleanupP2Game() {
        // 清理射线
        this.p2State.reflectionChain.forEach(chain => {
            if (chain.ray) {
                this.RayManager.remove(chain.ray);
            }
        });
        
        // 清理游戏元素
        this.p2State.gameElements.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        // 重置状态
        this.p2State.isActive = false;
        this.p2State.gameElements = [];
        this.p2State.reflectionChain = [];
        
        // 重新启用按钮
        const startButton = document.getElementById('start-p2-star-move');
        startButton.disabled = false;
    }
}

// 导出P2StarMoveGame类
window.P2StarMoveGame = P2StarMoveGame; 