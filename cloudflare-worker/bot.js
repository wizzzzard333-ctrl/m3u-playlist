// Cloudflare Worker for Telegram Bot
// Deploy at: workers.cloudflare.com (Free tier: 100k requests/day)

const GITHUB_USER = 'wizzzzard333-ctrl';
const GITHUB_REPO = 'm3u-playlist';
const GITHUB_FILE = 'videos.json';
const GITHUB_BRANCH = 'main';

// KV namespace for storing user tokens (create in Cloudflare dashboard)
// Bind as: USER_TOKENS

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Webhook endpoint
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleTelegramUpdate(await request.json(), env);
    }
    
    // Setup webhook
    if (url.pathname === '/setup') {
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const webhookUrl = `${url.origin}/webhook`;
      
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`
      );
      
      return new Response(await response.text(), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('M3U Telegram Bot is running!');
  }
};

async function handleTelegramUpdate(update, env) {
  if (!update.message) {
    return new Response('OK');
  }
  
  const chatId = update.message.chat.id;
  const text = update.message.text || '';
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  try {
    // Command: /start
    if (text === '/start') {
      await sendMessage(botToken, chatId, 
        '🎬 *M3U Playlist Bot*\n\n' +
        'Commands:\n' +
        '/settoken - Save GitHub token\n' +
        '/addvideo - Add video URL\n' +
        '/list - List videos\n' +
        '/help - Show help\n\n' +
        'Or just send video URLs directly!'
      );
    }
    
    // Command: /settoken
    else if (text === '/settoken') {
      await sendMessage(botToken, chatId,
        '🔑 Send me your GitHub token.\n\n' +
        'Get it from: https://github.com/settings/tokens/new\n' +
        'Select "repo" scope.\n\n' +
        '⚠️ I\'ll save it permanently for you.'
      );
      
      // Set state to wait for token
      await env.USER_TOKENS.put(`state_${chatId}`, 'waiting_token');
    }
    
    // Command: /list
    else if (text === '/list') {
      const videos = await fetchVideos(env.GITHUB_TOKEN);
      let msg = `📹 *Playlist (${videos.length} videos):*\n\n`;
      
      videos.slice(0, 15).forEach((v, i) => {
        msg += `${i + 1}. ${v.title}\n`;
      });
      
      if (videos.length > 15) {
        msg += `\n... and ${videos.length - 15} more`;
      }
      
      await sendMessage(botToken, chatId, msg);
    }
    
    // Command: /cleartoken
    else if (text === '/cleartoken') {
      await env.USER_TOKENS.delete(`token_${chatId}`);
      await sendMessage(botToken, chatId, '✅ Token cleared!');
    }
    
    // Command: /help
    else if (text === '/help') {
      await sendMessage(botToken, chatId,
        '*How to use:*\n\n' +
        '1️⃣ Setup (one-time):\n' +
        '   /settoken → Send your GitHub token\n\n' +
        '2️⃣ Add videos:\n' +
        '   Just send URLs:\n' +
        '   `https://example.com/video.mp4`\n\n' +
        '   Or with title:\n' +
        '   `My Video | https://example.com/video.mp4`\n\n' +
        '3️⃣ Manage:\n' +
        '   /list - View all videos\n' +
        '   /cleartoken - Remove token'
      );
    }
    
    // Handle token input
    else if (await env.USER_TOKENS.get(`state_${chatId}`) === 'waiting_token') {
      const token = text.trim();
      
      if (token.length < 20) {
        await sendMessage(botToken, chatId, '❌ Invalid token. Try /settoken again.');
        return new Response('OK');
      }
      
      // Save token permanently
      await env.USER_TOKENS.put(`token_${chatId}`, token);
      await env.USER_TOKENS.delete(`state_${chatId}`);
      
      await sendMessage(botToken, chatId,
        '✅ *Token saved permanently!*\n\n' +
        'Now send video URLs and I\'ll add them automatically.'
      );
      
      // Delete token message for security
      await deleteMessage(botToken, chatId, update.message.message_id);
    }
    
    // Handle video URLs
    else if (text.includes('http://') || text.includes('https://')) {
      const userToken = await env.USER_TOKENS.get(`token_${chatId}`);
      
      if (!userToken) {
        await sendMessage(botToken, chatId,
          '⚠️ Please set your GitHub token first:\n/settoken'
        );
        return new Response('OK');
      }
      
      // Parse URL
      let title = '';
      let url = '';
      
      if (text.includes('|')) {
        const parts = text.split('|');
        title = parts[0].trim();
        url = parts[1].trim();
      } else {
        url = text.trim();
        try {
          const urlObj = new URL(url);
          title = urlObj.pathname.split('/').pop() || 'Video';
          title = decodeURIComponent(title);
        } catch {
          title = 'Video';
        }
      }
      
      // Add to playlist
      await sendMessage(botToken, chatId, '⏳ Adding video...');
      
      try {
        await addVideo(userToken, title, url);
        await sendMessage(botToken, chatId,
          `✅ *Video added!*\n\n` +
          `📹 ${title}\n` +
          `🔗 ${url}\n\n` +
          `Playlist updates in ~30 seconds.`
        );
      } catch (error) {
        await sendMessage(botToken, chatId, '❌ Error: ' + error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    await sendMessage(botToken, chatId, '❌ Error: ' + error.message);
  }
  
  return new Response('OK');
}

async function sendMessage(botToken, chatId, text) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });
}

async function deleteMessage(botToken, chatId, messageId) {
  await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId
    })
  });
}

async function fetchVideos(githubToken) {
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${githubToken}`,
      'User-Agent': 'M3U-Bot'
    }
  });
  
  const data = await response.json();
  const content = atob(data.content);
  return JSON.parse(content);
}

async function addVideo(userToken, title, videoUrl) {
  // Get current videos
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${userToken}`,
      'User-Agent': 'M3U-Bot'
    }
  });
  
  const data = await response.json();
  const videos = JSON.parse(atob(data.content));
  
  // Add new video
  videos.push({
    title: title,
    url: videoUrl,
    duration: -1
  });
  
  // Update file
  const updateResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${userToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'M3U-Bot'
      },
      body: JSON.stringify({
        message: `Add video: ${title}`,
        content: btoa(JSON.stringify(videos, null, 2)),
        sha: data.sha,
        branch: GITHUB_BRANCH
      })
    }
  );
  
  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    throw new Error(error.message || 'Failed to update');
  }
  
  return true;
}