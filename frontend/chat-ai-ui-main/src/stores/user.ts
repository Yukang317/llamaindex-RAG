// src/stores/user.ts
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: null as string | null, // 存Token（身份凭证）
    name: null as string | null,   // 存用户名
  }),
  actions: {
    // 登录时：更新用户信息
    setUser(data: { userId: string; name: string }) {
      this.userId = data.userId;
      this.name = data.name;
    },
    // 登出时：清空信息
    logout() {
      this.userId = null;
      this.name = null;
    },
  },
  persist: true, // 关键：数据持久化（存在localStorage，刷新页面不丢）
});
/*
这是 Pinia 的 “用户仓库”，专门存登录状态。persist: true是核心 —— 普通变量刷新就丢，
加了这个，数据会存在浏览器本地，下次打开页面还能记住登录状态。
*/ 