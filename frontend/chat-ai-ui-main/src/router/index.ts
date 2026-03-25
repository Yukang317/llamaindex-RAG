// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue'; // 登录页
import ChatView from '../views/ChatView.vue'; // 聊天页

const routes = [
  { path: '/', component: HomeView },   // 访问根路径 → 显示登录页
  { path: '/chat', component: ChatView },// 访问/chat → 显示聊天页
];

export const router = createRouter({
  history: createWebHistory(), // 用H5的路由模式（URL没有#）
  routes,
});

/*
核心逻辑：
用户打开页面，浏览器 URL 是/，路由就匹配到HomeView（登录页）；
登录成功后跳/chat，就匹配到ChatView（聊天页）。相当于餐厅的 “导航牌”，指引用户到不同区域。
*/