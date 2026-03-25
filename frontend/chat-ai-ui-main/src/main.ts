// src/main.ts
import { createApp } from 'vue';       // 导入Vue核心：创建应用
import { createPinia } from 'pinia';   // 导入Pinia：创建数据仓库
import piniaPluginPersistedState from 'pinia-plugin-persistedstate'; // Pinia持久化插件
import { router } from './router';     // 导入路由规则
import './style.css';
import App from './App.vue';

const pinia = createPinia();
pinia.use(piniaPluginPersistedState); // 给Pinia加“持久化”：刷新页面登录状态不丢

const app = createApp(App);           // 创建Vue应用实例
app.use(router);                      // 挂载路由：让页面能跳转
app.use(pinia);                       // 挂载Pinia：让所有组件能访问数据仓库
app.mount('#app');                    // 把应用挂载到HTML的#app标签上（页面显示）
/*
核心逻辑：
项目启动时，先创建 Vue 应用，再把「路由、数据仓库」这些 “全局工具” 挂载好，最后把应用渲染到页面上。
就像开餐厅前，先把桌椅、后厨工具都准备好。
*/