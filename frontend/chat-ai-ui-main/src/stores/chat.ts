import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import { useUserStore } from './user';

interface FormattedMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<{ role: string; content: string }[]>([]);
  const isLoading = ref(false);

  const userStore = useUserStore();

  // 获取历史消息接口调用
  const loadChatHistory = async () => {
    if (!userStore.userId) return; // 没登录就不加载

    try {
      //给后端发GET请求，带Token认证
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/chat/history`,
        {
          headers: {
          'Authorization': `Bearer ${userStore.userId}`, // 添加认证头，即带Token
          'Content-Type': 'application/json'
          }
        }
      );

      // 过滤掉空消息，存到messages里（界面会自动更新）
      messages.value = data.filter((msg: FormattedMessage) => msg.content);
    } catch (error) {
      console.error('Error loading chat history: ', error);
    }
  };
/** 
 * 核心逻辑：
页面加载后，给后端发请求，带上登录的 Token，后端验证身份后返回该用户的历史聊天记录，
存到messages里，ChatView 页面就会显示这些记录。
*/


  // 对话接口调用
  const sendMessage = async (message: string, model: string, temperature: number, max_tokens: number, stream: boolean) => {
    console.log(123);
    if (!message.trim() || !userStore.userId) return;

    // 1. 先把用户消息加到列表里（界面先显示用户发的内容）
    messages.value.push({ role: 'user', content: message });

    isLoading.value = true; // 显示正在思考中

    try {
      if (stream) {
      // 流式处理
      await handleStreamResponse(model, temperature, max_tokens);
    } else {
      // 非流式处理（保持原有逻辑）：发POST请求给后端
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/chat/chat`,
        {
          // 请求体数据
          messages: messages.value, // 完整聊天记录
          model: model,             // 选择的模型
          temperature: temperature, // 温度
          max_tokens: max_tokens,   // 最大Token
          stream: false,            // 非流式
        },
        {
          // axios 配置选项
          headers: {
            'Authorization': `Bearer ${userStore.userId}`, // 认证头
            'Content-Type': 'application/json', // 可选，axios通常会自动设置
          }
        }
      );
      // 后端返回AI回复 → 加到消息列表里（界面显示AI的回复）
      messages.value.push({ role: data.message.role, content: data.message.content });
    }
    } catch (error) {
      console.error('Error sending message: ', error);
      messages.value.push({
        role: 'ai',
        content: 'Error: unable to process request',
      });
    } finally {
      isLoading.value = false; // 关闭加载状态
    }
  };
/**
 * 核心逻辑（非流式）：
1. 先把用户消息加到messages → 界面先显示用户发的内容；
2. 发 POST 请求给后端，带聊天记录、模型参数、Token；
3. 后端一次性返回 AI 的完整回复 → 加到messages → 界面显示 AI 回复；
4. 不管成功 / 失败，都关闭 “正在思考中” 的加载状态。
 */



/**
 * 处理流式响应
 * @param model - AI模型名称
 * @param temperature - 温度参数，控制回复的随机性
 * @param max_tokens - 最大token数量限制
 */
const handleStreamResponse = async (model: string, temperature: number, max_tokens: number) => {
  // 1. 先加一个空的AI消息占位（后面逐字更新）
  // 获取即将添加的AI消息在数组中的索引位置
  const aiMessageIndex = messages.value.length;
  // 预先添加一个空的AI消息占位，用于后续实时更新内容
  messages.value.push({ role: 'assistant', content: '' });
  try {
    // 2. 用Fetch发POST请求（Axios处理流式不方便，Fetch更合适）
    // 发起流式请求到后端API
    const response = await fetch(`${import.meta.env.VITE_API_URL}/chat/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.userId}`, // 认证头
      },
      body: JSON.stringify({
        messages: messages.value,           // 完整的对话历史
        model: model,                       // AI模型
        temperature: temperature,           // 温度参数
        max_tokens: max_tokens,            // token限制
        stream: true                       // 开启流式响应
      }
    )
    });
    // 检查HTTP响应状态
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
     // 检查浏览器是否支持ReadableStream
    if (!response.body) {
      throw new Error('ReadableStream not supported');
    }
     // 3. 获取“流读取器”：逐块读取后端返回的数据
     // 获取流式数据读取器
    const reader = response.body.getReader();
    // 创建文本解码器，用于将字节流转换为文本
    const decoder = new TextDecoder(); // 把字节转换成文字
    // 缓冲区，用于处理可能被分割的数据行
    let buffer = '';

    // 4. 循环读流：直到流结束
    // 持续读取流式数据
    while (true) {
       // 读取数据块
      const { done, value } = await reader.read();
      // 如果流结束，跳出循环
      if (done) break;

      // 5. 解码字节→文字，加到缓冲区
       // 将字节数据解码为文本并添加到缓冲区
      buffer += decoder.decode(value, { stream: true });
      // 按换行符分割数据，处理SSE格式的数据行
      const lines = buffer.split('\n');
      // 保留最后一行（可能是不完整的），其余行进行处理
      buffer = lines.pop() || '';

      // 6. 逐行解析后端返回的SSE格式数据
      // 逐行处理SSE数据
      for (const line of lines) {
        const trimmedLine = line.trim();
         // 检查是否是SSE数据行（以"data: "开头）
        if (trimmedLine.startsWith('data: ')) {
          // 提取JSON数据部分，移除"data: "前缀
          const jsonStr = trimmedLine.slice(6);
          
          // 跳过空数据行或结束标记
          if (jsonStr.trim() === '' || jsonStr.trim() === '[DONE]') continue;

          // 7. 解析JSON，拿到AI的逐字回复
          try {
             // 解析JSON数据
            const data = JSON.parse(jsonStr);
            // 如果包含内容数据，实时更新AI消息
            if (data.content) {
              // 8. 把新内容追加到空消息里 → 界面实时更新（打字机效果）
              // 将新内容追加到AI消息中，实现打字机效果
              messages.value[aiMessageIndex].content += data.content;
            }
            // 如果收到结束信号，跳出数据处理循环
            if (data.finished) {
              break;
            }
          } catch (e) {
            console.warn('Failed to parse JSON:', jsonStr, e);
          }
        }
      }
    }
    // 释放读取器资源
    reader.releaseLock();
    
  } catch (error) {
    console.error('Stream error:', error);
    messages.value.splice(aiMessageIndex, 1);
    throw error;
  }
};

  return { messages, isLoading, loadChatHistory, sendMessage };
});
/**
 * 核心逻辑（流式）—— 为什么能实现 “打字机效果”？
1. 先在消息列表里加一个 “空的 AI 消息”（占位）；
2. 用 Fetch 发请求，拿到后端的 “数据流”（不是一次性返回，而是一点点发）；
3. 用reader.read()逐块读数据，每读一块就解码成文字；
4. 解析后端返回的 SSE 格式数据（每行以data: 开头），拿到 AI 的 “单个字 / 词”；
5. 把这个字 / 词追加到空消息里 → messages变化 → ChatView 页面实时更新 → 看起来就是 “AI 在逐字打字”；
6. 直到后端发[DONE]，流结束，打字机效果停止。
 * 
 * 
 */