// src/views/HomeView.vue <script setup>
import { ref } from 'vue';       // Vue的响应式变量：值变了，界面自动更
import axios from 'axios';       // 发请求的工具
import { useUserStore } from '../stores/user'; // 导入用户数据仓库
import { useRouter } from 'vue-router'; // 导入路由


const userStore = useUserStore(); // 拿到用户仓库的“操作权限”
const router = useRouter();       // 拿到路由的“跳转权限”

// 响应式变量：绑定到输入框，用户输入的内容会实时存在这里
const name = ref('');
const password = ref('');
const loading = ref(false); // 登录按钮的加载状态
const error = ref('');      // 错误提示

// 登录核心函数
const loginUser = async () => {
  // 1. 校验：用户名/密码不能为空
  if (!name.value || !password.value) {
    error.value = '用户名和密码是必填项';
    return;
  }

  loading.value = true; // 按钮显示“Logging in...”
  error.value = '';     // 清空之前的错误

  try {
    // 2. 给后端发POST请求，传用户名密码，拿Token
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_URL}/users/token`, // 后端接口地址（从环境变量来）
      { username: name.value, password: password.value }
    );

    // 3. 登录成功：把后端返回的Token和用户名存到Pinia仓库
    userStore.setUser({
      userId: data.access_token, // Token存在userId字段里
      name: data.username,
    });

    // 4. 跳转到聊天页
    router.push('/chat');
  } catch (err: any) {
    // 登录失败：显示后端返回的错误
    error.value = err.response.data.detail;
  } finally {
    loading.value = false; // 不管成功/失败，加载状态结束
  }
};
/*
核心逻辑（用户操作→代码执行）：
1. 用户在输入框填用户名 / 密码 → name.value/password.value实时更新；
2. 点击 “Start Chat” 按钮 → 触发loginUser函数；
3. 先校验输入，再发请求给后端；
4. 后端返回 Token（身份凭证）→ 存到 Pinia 的 user 仓库（还会持久化，刷新不丢）；
5. 跳转到/chat聊天页。
*/
</script>

<template>
<div class="h-screen flex items-center justify-center bg-gray-900 text-white">
  <div class="p-8 bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
    <img :src="robotImage" alt="" class="mx-auto w-24 h-24 mb-4" />
    <h1 class="text-2xl font-semibold mb-4 text-center">
     欢迎使用图灵AI
    </h1>

    <input
      type="text"
      class="w-full p-2 mb-2 bg-gray-700 text-white rounded-lg focus:outline-none"
      placeholder="Name"
      v-model="name"
      @keyup.enter="loginUser"
    />
    <input
      type="password"
      class="w-full p-2 mb-2 bg-gray-700 text-white rounded-lg focus:outline-none"
      placeholder="password"
      v-model="password"
      @keyup.enter="loginUser"
    />

    <button
      @click="loginUser"
      class="w-full p-2 bg-blue-500 rounded-lg"
      :disabled="loading"
    >
      {{ loading ? 'Logging in...' : 'Start Chat' }}
    </button>

    <p v-if="error" class="text-red-400 text-center mt-2">{{ error }}</p>
  </div>
</div>
</template>