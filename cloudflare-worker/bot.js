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
  // Handle callback queries (button clicks)
  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query, env);
  }
  
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
        '/add - Add video URL\n' +
        '/list - List all videos\n' +
        '/delete - Delete videos\n' +
        '/clear - Clear all videos\n' +
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
      const userToken = await env.USER_TOKENS.get(`token_${chatId}`);
      if (!userToken) {
        await sendMessage(botToken, chatId, '⚠️ Set token first: /settoken');
        return new Response('OK');
      }
      
      const videos = await fetchVideos(userToken);
      
      if (videos.length === 0) {
        await sendMessage(botToken, chatId, '📭 No videos in playlist yet.');
        return new Response('OK');
      }
      
      let msg = `📹 *Playlist (${videos.length} videos):*\n\n`;
      
      videos.slice(0, 20).forEach((v, i) => {
        msg += `${i + 1}. ${v.title}\n`;
      });
      
      if (videos.length > 20) {
        msg += `\n... and ${videos.length - 20} more`;
      }
      
      msg += '\n\nUse /delete to remove videos';
      
      await sendMessage(botToken, chatId, msg);
    }
    
    // Command: /delete
    else if (text === '/delete') {
      const userToken = await env.USER_TOKENS.get(`token_${chatId}`);
      if (!userToken) {
        await sendMessage(botToken, chatId, '⚠️ Set token first: /settoken');
        return new Response('OK');
      }
      
      const videos = await fetchVideos(userToken);
      
      if (videos.length === 0) {
        await sendMessage(botToken, chatId, '📭 No videos to delete.');
        return new Response('OK');
      }
      
      // Show videos with delete buttons (max 10 at a time)
      const buttons = videos.slice(0, 10).map((v, i) => [{
        text: `❌ ${i + 1}. ${v.title.substring(0, 30)}${v.title.length > 30 ? '...' : ''}`,
        callback_data: `delete_${i}`
      }]);
      
      if (videos.length > 10) {
        buttons.push([{
          text: '➡️ Show More',
          callback_data: 'delete_more_10'
        }]);
      }
      
      await sendMessageWithButtons(botToken, chatId,
        '🗑️ *Select video to delete:*\n\nClick button below:',
        buttons
      );
    }
    
    // Command: /clear
    else if (text === '/clear') {
      const userToken = await env.USER_TOKENS.get(`token_${chatId}`);
      if (!userToken) {
        await sendMessage(botToken, chatId, '⚠️ Set token first: /settoken');
        return new Response('OK');
      }
      
      const buttons = [[
        { text: '✅ Yes, Clear All', callback_data: 'clear_confirm' },
        { text: '❌ Cancel', callback_data: 'clear_cancel' }
      ]];
      
      await sendMessageWithButtons(botToken, chatId,
        '⚠️ *Clear ALL videos?*\n\nThis will delete your entire playlist!',
        buttons
      );
    }
    
    // Command: /cleartoken
    else if (text === '/cleartoken') {
      await env.USER_TOKENS.delete(`token_${chatId}`);
      await sendMessage(botToken, chatId, '✅ Token cleared!');
    }
    
    // Command: /add
    else if (text === '/add') {
      await sendMessage(botToken, chatId,
        '📹 Send me video URL:\n\n' +
        'Format 1: `https://example.com/video.mp4`\n' +
        'Format 2: `My Video | https://example.com/video.mp4`'
      );
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
        '   /delete - Delete specific videos\n' +
        '   /clear - Clear all videos\n' +
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

async function handleCallbackQuery(query, env) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.callback_data;
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  try {
    const userToken = await env.USER_TOKENS.get(`token_${chatId}`);
    
    if (!userToken) {
      await answerCallback(botToken, query.id, '⚠️ Token not found. Use /settoken');
      return new Response('OK');
    }
    
    // Handle delete video
    if (data.startsWith('delete_')) {
      if (data === 'delete_cancel') {
        await editMessage(botToken, chatId, messageId, '❌ Cancelled');
        await answerCallback(botToken, query.id, 'Cancelled');
        return new Response('OK');
      }
      
      if (data.startsWith('delete_more_')) {
        const offset = parseInt(data.split('_')[2]);
        const videos = await fetchVideos(userToken);
        
        const buttons = videos.slice(offset, offset + 10).map((v, i) => [{
          text: `❌ ${offset + i + 1}. ${v.title.substring(0, 30)}${v.title.length > 30 ? '...' : ''}`,
          callback_data: `delete_${offset + i}`
        }]);
        
        if (videos.length > offset + 10) {
          buttons.push([{
            text: '➡️ Show More',
            callback_data: `delete_more_${offset + 10}`
          }]);
        }
        
        if (offset > 0) {
          buttons.push([{
            text: '⬅️ Previous',
            callback_data: `delete_more_${Math.max(0, offset - 10)}`
          }]);
        }
        
        await editMessageWithButtons(botToken, chatId, messageId,
          '🗑️ *Select video to delete:*',
          buttons
        );
        
        await answerCallback(botToken, query.id);
        return new Response('OK');
      }
      
      const index = parseInt(data.split('_')[1]);
      const videos = await fetchVideos(userToken);
      
      if (index < 0 || index >= videos.length) {
        await answerCallback(botToken, query.id, '❌ Invalid video');
        return new Response('OK');
      }
      
      const videoToDelete = videos[index];
      
      // Show confirmation
      const buttons = [[
        { text: '✅ Yes, Delete', callback_data: `confirm_delete_${index}` },
        { text: '❌ Cancel', callback_data: 'delete_cancel' }
      ]];
      
      await editMessageWithButtons(botToken, chatId, messageId,
        `⚠️ *Delete this video?*\n\n📹 ${videoToDelete.title}\n🔗 ${videoToDelete.url}`,
        buttons
      );
      
      await answerCallback(botToken, query.id);
    }
    
    // Handle delete confirmation
    else if (data.startsWith('confirm_delete_')) {
      const index = parseInt(data.split('_')[2]);
      
      await answerCallback(botToken, query.id, '⏳ Deleting...');
      
      try {
        const deletedVideo = await deleteVideo(userToken, index);
        
        await editMessage(botToken, chatId, messageId,
          `✅ *Video deleted!*\n\n📹 ${deletedVideo.title}\n\nPlaylist updates in ~30 seconds.`
        );
      } catch (error) {
        await editMessage(botToken, chatId, messageId, '❌ Error: ' + error.message);
      }
    }
    
    // Handle clear all
    else if (data === 'clear_confirm') {
      await answerCallback(botToken, query.id, '⏳ Clearing...');
      
      try {
        await clearAllVideos(userToken);
        await editMessage(botToken, chatId, messageId,
          '✅ *All videos cleared!*\n\nPlaylist is now empty.'
        );
      } catch (error) {
        await editMessage(botToken, chatId, messageId, '❌ Error: ' + error.message);
      }
    }
    
    else if (data === 'clear_cancel') {
      await editMessage(botToken, chatId, messageId, '❌ Cancelled');
      await answerCallback(botToken, query.id, 'Cancelled');
    }
    
  } catch (error) {
    console.error('Callback error:', error);
    await answerCallback(botToken, query.id, '❌ Error: ' + error.message);
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

async function sendMessageWithButtons(botToken, chatId, text, buttons) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    })
  });
}

async function editMessage(botToken, chatId, messageId, text) {
  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'Markdown'
    })
  });
}

async function editMessageWithButtons(botToken, chatId, messageId, text, buttons) {
  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    })
  });
}

async function answerCallback(botToken, callbackId, text = '') {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text: text
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

async function fetchVideos(userToken) {
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${userToken}`,
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

async function deleteVideo(userToken, index) {
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
  
  if (index < 0 || index >= videos.length) {
    throw new Error('Invalid video index');
  }
  
  // Remove video
  const deletedVideo = videos.splice(index, 1)[0];
  
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
        message: `Delete video: ${deletedVideo.title}`,
        content: btoa(JSON.stringify(videos, null, 2)),
        sha: data.sha,
        branch: GITHUB_BRANCH
      })
    }
  );
  
  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    throw new Error(error.message || 'Failed to delete');
  }
  
  return deletedVideo;
}

async function clearAllVideos(userToken) {
  // Get current file SHA
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${userToken}`,
      'User-Agent': 'M3U-Bot'
    }
  });
  
  const data = await response.json();
  
  // Update with empty array
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
        message: 'Clear all videos',
        content: btoa(JSON.stringify([], null, 2)),
        sha: data.sha,
        branch: GITHUB_BRANCH
      })
    }
  );
  
  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    throw new Error(error.message || 'Failed to clear');
  }
  
  return true;
}