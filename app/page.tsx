'use client';

import React, { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // 动态加载脚本文件
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    // 加载游戏脚本
    const loadGameScripts = async () => {
      try {
        // 先加载p2-star-move.js，确保P2StarMoveGame类可用
        await loadScript('/p2-star-move.js');
        // 再加载script.js，此时P2StarMoveGame已经可用
        await loadScript('/script.js');
        console.log('所有游戏脚本加载完成');
      } catch (error) {
        console.error('Failed to load game scripts:', error);
      }
    };

    loadGameScripts();

    // 清理函数
    return () => {
      // 移除动态添加的脚本
      const scripts = document.querySelectorAll('script[src="/script.js"], script[src="/p2-star-move.js"]');
      scripts.forEach(script => script.remove());
    };
  }, []);

  return (
    <>
    <div className="main-wrapper">
        <div className="container">
            <div id="circle"></div>
            <div id="ground-indicator"></div>
            <div id="arrow">↑</div>
        </div>
        <div className="instructions">
            <h2>操作说明：</h2>
            <p>李蛋模拟器, by 猛男爱吃饭</p>
            <p>使用 WASD 键移动箭头.</p>
            <div className="game-controls">
                <button id="start-star-move" className="star-move-btn">开始星移</button>
                <button id="start-p2-star-move" className="star-move-btn">开始P2星移</button>
                <div id="countdown" className="countdown hidden">5</div>
                <div id="game-status" className="game-status"></div>
            </div>
        </div>
    </div>
    </>
  );
}
