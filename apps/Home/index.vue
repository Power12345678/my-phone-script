<template>
  <div class="app-home-screen">
    <!-- Widgets -->
    <div class="widget-container">
      <div class="widget widget-clock">
        <div class="time">{{ store.phone.time }}</div>
        <div class="date">{{ store.phone.date }}</div>
      </div>
      <div class="widget widget-weather">
        <div class="temp">{{ store.phone.weather.temp }}</div>
        <div class="condition">{{ store.phone.weather.condition }}</div>
      </div>
    </div>

    <!-- App Grid -->
    <div class="app-grid">
      <div class="app-block" @click="openApp('chat')">
        <div class="icon-container">
          <!-- Chat Icon -->
          <i class="fas fa-comments"></i>
        </div>
        <span>消息</span>
      </div>
      <div class="app-block" @click="openApp('forum')">
        <div class="icon-container">
          <!-- Forum Icon -->
          <i class="fas fa-users"></i>
        </div>
        <span>论坛</span>
      </div>
      <div class="app-block" @click="openApp('dynamic')">
        <div class="icon-container">
          <!-- Dynamic Feed Icon -->
          <i class="fas fa-rss"></i>
        </div>
        <span>动态</span>
      </div>
      <div class="app-block" @click="openApp('map')">
        <div class="icon-container">
          <!-- Map Icon -->
          <i class="fas fa-map-marked-alt"></i>
        </div>
        <span>地图</span>
      </div>
      <div class="app-block" @click="openApp('music')">
        <div class="icon-container">
          <!-- Music Icon -->
          <i class="fas fa-music"></i>
        </div>
        <span>音乐</span>
      </div>
      <div class="app-block" @click="openApp('live')">
        <div class="icon-container">
          <!-- Live Icon -->
          <i class="fas fa-video"></i>
        </div>
        <span>直播</span>
      </div>
      <div class="app-block" @click="openApp('calendar')">
        <div class="icon-container">
          <!-- Calendar Icon -->
          <i class="fas fa-calendar-alt"></i>
        </div>
        <span>日历</span>
      </div>
      <div class="app-block" @click="openApp('diary')">
        <div class="icon-container">
          <!-- Diary Icon -->
          <i class="fas fa-book"></i>
        </div>
        <span>日记</span>
      </div>
    </div>

    <!-- Bottom Dock -->
    <div class="bottom-bar">
      <div class="app" @click="openApp('phone')">
        <div class="icon-container">
          <!-- Phone/Chat Icon -->
          <i class="fas fa-phone-alt"></i>
        </div>
        <span>电话</span>
      </div>
      <div class="app" @click="openApp('email')">
        <div class="icon-container">
          <!-- Mail Icon -->
          <i class="fas fa-envelope"></i>
        </div>
        <span>邮箱</span>
      </div>
      <div class="app" @click="openApp('browser')">
        <div class="icon-container">
          <!-- Compass/Browser Icon -->
          <i class="fas fa-compass"></i>
        </div>
        <span>浏览器</span>
      </div>
      <div class="app" @click="openApp('settings')">
        <div class="icon-container">
          <!-- Settings Icon -->
          <i class="fas fa-cog"></i>
        </div>
        <span>设置</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { store } from '../../store';

const openApp = (app: any) => {
  store.activeApp = app;
};
</script>

<style scoped>
.app-home-screen {
  height: 100%;
  position: relative;
  /* 调整布局 */
}

/* Widgets */
.widget-container {
  position: absolute;
  top: 40px;
  left: 16px;
  right: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  z-index: 1;
}

.widget {
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 12px;
  width: calc(50% - 6px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
  color: #fff;
}

.widget:hover {
  transform: scale(1.05);
}

.widget-clock {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.widget-clock .time {
  font-size: 24px;
  font-weight: bold;
}

.widget-clock .date {
  font-size: 12px;
  opacity: 0.8;
}

.widget-weather {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.widget-weather .temp {
  font-size: 24px;
  font-weight: bold;
}

.widget-weather .condition {
  font-size: 12px;
  opacity: 0.8;
}

/* App Grid */
.app-grid {
  position: absolute;
  top: 150px;
  left: 16px;
  right: 16px;
  bottom: 120px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  justify-content: center;
  align-content: start;
}

.app-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  border-radius: 16px;
  padding: 8px;
  transition: transform 0.2s;
  cursor: pointer;
}

.app-block:hover {
  transform: scale(1.05);
}

.app-block .icon-container {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  margin-bottom: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.app-block .icon-container i {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.app-block span {
  font-size: 12px;
  color: #fff;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3);
}

/* Bottom Dock */
.bottom-bar {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  height: 80px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  border: none;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}

.bottom-bar .app {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s;
  cursor: pointer;
}

.bottom-bar .app:hover {
  transform: translateY(-4px);
}

.bottom-bar .app .icon-container {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.bottom-bar .app .icon-container i {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.bottom-bar .app span {
  font-size: 10px;
  color: #fff;
  text-align: center;
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
</style>
