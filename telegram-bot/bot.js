const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

// Bot token - Get from @BotFather
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';

// GitHub config
const GITHUB_USER = 'wizzzzard333-ctrl';
const REPO = 'm3u-playlist';
const FILE = 'videos.json';
const BRANCH = 'main';

// In-memory storage (use database in production)
const userTokens = new Map();

// Create bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 M3U Telegram Bot started!');

// Command: /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMsg = `
🎬 *M3U Playlist Manager Bot*

Welcome! I can help you manage your M3U playlist directly from Telegram.

*Commands:*
/settoken - Save your GitHub token
/add - Add a video URL
/list - List all videos
/delete - Delete videos
/clear - Clear all videos
/help - Show this help

*Quick Add:*
Just send me a video URL and I'll add it!

Format: \`https://example.com/video.mp4\`
Or with title: \`My Video | https://example.com/video.mp4\`
`;
    bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
});

// Command: /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMsg = `
*How to use:*

1️⃣ *Setup (One-time):*
   /settoken
   Then send your GitHub token

2️⃣ *Add Videos:*
   Just send video URLs:
   \`https://example.com/video.mp4\`
   
   Or with custom title:
   \`My Video | https://example.com/video.mp4\`

3️⃣ *Manage:*
   /list - See all videos
   /delete - Delete specific videos
   /clear - Clear all videos
   /cleartoken - Remove saved token

*Get GitHub Token:*
https://github.com/settings/tokens/new
Select "repo" scope → Generate → Copy → Send to me
`;
    bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
});

// Command: /settoken
bot.onText(/\/settoken/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
        '🔑 Please send me your GitHub Personal Access Token.\n\n' +
        'Get it from: https://github.com/settings/tokens/new\n' +
        'Select "repo" scope and generate.\n\n' +
        '⚠️ Send it as a reply to this message.'
    );
    
    // Wait for token
    bot.once('message', (tokenMsg) => {
        if (tokenMsg.chat.id === chatId && !tokenMsg.text.startsWith('/')) {
            const token = tokenMsg.text.trim();
            
            if (token.length < 20) {
                bot.sendMessage(chatId, '❌ Invalid token. Please try again with /settoken');
                return;
            }
            
            userTokens.set(chatId, token);
            bot.sendMessage(chatId, 
                '✅ Token saved successfully!\n\n' +
                'Now you can send video URLs directly and I\'ll add them to your playlist.'
            );
            
            // Delete the token message for security
            bot.deleteMessage(chatId, tokenMsg.message_id).catch(() => {});
        }
    });
});

// Command: /cleartoken
bot.onText(/\/cleartoken/, (msg) => {
    const chatId = msg.chat.id;
    userTokens.delete(chatId);
    bot.sendMessage(chatId, '✅ Token cleared. Use /settoken to add a new one.');
});

// Command: /add
bot.onText(/\/add/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
        '📹 Send me the video URL:\n\n' +
        'Format 1: \`https://example.com/video.mp4\`\n' +
        'Format 2: \`My Video | https://example.com/video.mp4\`',
        { parse_mode: 'Markdown' }
    );
});

// Command: /list
bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    const token = userTokens.get(chatId);
    
    if (!token) {
        bot.sendMessage(chatId, '⚠️ Please set your GitHub token first using /settoken');
        return;
    }
    
    try {
        const videos = await fetchVideos(token);
        
        if (videos.length === 0) {
            bot.sendMessage(chatId, '📭 No videos in playlist yet.');
            return;
        }
        
        let message = `📹 *Your Playlist (${videos.length} videos):*\n\n`;
        videos.slice(0, 20).forEach((v, i) => {
            message += `${i + 1}. ${v.title}\n`;
        });
        
        if (videos.length > 20) {
            message += `\n... and ${videos.length - 20} more`;
        }
        
        message += '\n\nUse /delete to remove videos';
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        bot.sendMessage(chatId, '❌ Error fetching videos: ' + error.message);
    }
});

// Command: /delete
bot.onText(/\/delete/, async (msg) => {
    const chatId = msg.chat.id;
    const token = userTokens.get(chatId);
    
    if (!token) {
        bot.sendMessage(chatId, '⚠️ Please set your GitHub token first using /settoken');
        return;
    }
    
    try {
        const videos = await fetchVideos(token);
        
        if (videos.length === 0) {
            bot.sendMessage(chatId, '📭 No videos to delete.');
            return;
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
        
        bot.sendMessage(chatId, '🗑️ *Select video to delete:*\n\nClick button below:', {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    } catch (error) {
        bot.sendMessage(chatId, '❌ Error: ' + error.message);
    }
});

// Command: /clear
bot.onText(/\/clear/, (msg) => {
    const chatId = msg.chat.id;
    const token = userTokens.get(chatId);
    
    if (!token) {
        bot.sendMessage(chatId, '⚠️ Please set your GitHub token first using /settoken');
        return;
    }
    
    const buttons = [[
        { text: '✅ Yes, Clear All', callback_data: 'clear_confirm' },
        { text: '❌ Cancel', callback_data: 'clear_cancel' }
    ]];
    
    bot.sendMessage(chatId, '⚠️ *Clear ALL videos?*\n\nThis will delete your entire playlist!', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: buttons
        }
    });
});

// Handle callback queries (button clicks)
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.callback_data;
    const token = userTokens.get(chatId);
    
    if (!token) {
        bot.answerCallbackQuery(query.id, { text: '⚠️ Token not found. Use /settoken' });
        return;
    }
    
    try {
        // Handle delete video
        if (data.startsWith('delete_')) {
            if (data === 'delete_cancel') {
                bot.editMessageText('❌ Cancelled', {
                    chat_id: chatId,
                    message_id: messageId
                });
                bot.answerCallbackQuery(query.id, { text: 'Cancelled' });
                return;
            }
            
            if (data.startsWith('delete_more_')) {
                const offset = parseInt(data.split('_')[2]);
                const videos = await fetchVideos(token);
                
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
                
                bot.editMessageText('🗑️ *Select video to delete:*', {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: buttons
                    }
                });
                
                bot.answerCallbackQuery(query.id);
                return;
            }
            
            const index = parseInt(data.split('_')[1]);
            const videos = await fetchVideos(token);
            
            if (index < 0 || index >= videos.length) {
                bot.answerCallbackQuery(query.id, { text: '❌ Invalid video' });
                return;
            }
            
            const videoToDelete = videos[index];
            
            // Show confirmation
            const buttons = [[
                { text: '✅ Yes, Delete', callback_data: `confirm_delete_${index}` },
                { text: '❌ Cancel', callback_data: 'delete_cancel' }
            ]];
            
            bot.editMessageText(
                `⚠️ *Delete this video?*\n\n📹 ${videoToDelete.title}\n🔗 ${videoToDelete.url}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: buttons
                    }
                }
            );
            
            bot.answerCallbackQuery(query.id);
        }
        
        // Handle delete confirmation
        else if (data.startsWith('confirm_delete_')) {
            const index = parseInt(data.split('_')[2]);
            
            bot.answerCallbackQuery(query.id, { text: '⏳ Deleting...' });
            
            const deletedVideo = await deleteVideo(token, index);
            
            bot.editMessageText(
                `✅ *Video deleted!*\n\n📹 ${deletedVideo.title}\n\nPlaylist updates in ~30 seconds.`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown'
                }
            );
        }
        
        // Handle clear all
        else if (data === 'clear_confirm') {
            bot.answerCallbackQuery(query.id, { text: '⏳ Clearing...' });
            
            await clearAllVideos(token);
            
            bot.editMessageText(
                '✅ *All videos cleared!*\n\nPlaylist is now empty.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown'
                }
            );
        }
        
        else if (data === 'clear_cancel') {
            bot.editMessageText('❌ Cancelled', {
                chat_id: chatId,
                message_id: messageId
            });
            bot.answerCallbackQuery(query.id, { text: 'Cancelled' });
        }
        
    } catch (error) {
        console.error('Callback error:', error);
        bot.answerCallbackQuery(query.id, { text: '❌ Error: ' + error.message });
    }
});

// Handle video URLs
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // Ignore commands
    if (!text || text.startsWith('/')) return;
    
    // Check if it's a URL
    if (!text.includes('http://') && !text.includes('https://')) return;
    
    // Check if user has token
    const token = userTokens.get(chatId);
    if (!token) {
        bot.sendMessage(chatId, 
            '⚠️ Please set your GitHub token first using /settoken'
        );
        return;
    }
    
    try {
        // Parse input
        let title = '';
        let url = '';
        
        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].trim();
            url = parts[1].trim();
        } else {
            url = text.trim();
            // Extract filename as title
            try {
                const urlObj = new URL(url);
                title = urlObj.pathname.split('/').pop() || 'Video';
                title = decodeURIComponent(title);
            } catch {
                title = 'Video';
            }
        }
        
        // Validate URL
        if (!url.startsWith('http')) {
            bot.sendMessage(chatId, '❌ Invalid URL format');
            return;
        }
        
        // Add to playlist
        bot.sendMessage(chatId, '⏳ Adding video to playlist...');
        
        await addVideoToPlaylist(token, title, url);
        
        bot.sendMessage(chatId, 
            `✅ Video added successfully!\n\n` +
            `📹 Title: ${title}\n` +
            `🔗 URL: ${url}\n\n` +
            `Playlist will update in ~30 seconds.`
        );
        
    } catch (error) {
        console.error('Error:', error);
        bot.sendMessage(chatId, '❌ Error: ' + error.message);
    }
});

// Fetch current videos
async function fetchVideos(token) {
    const url = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE}?ref=${BRANCH}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'M3U-Bot'
        }
    });
    const data = await response.json();
    return JSON.parse(Buffer.from(data.content, 'base64').toString());
}

// Add video to playlist
async function addVideoToPlaylist(token, title, videoUrl) {
    // Get current videos
    const url = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE}?ref=${BRANCH}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'M3U-Bot'
        }
    });
    const data = await response.json();
    
    const videos = JSON.parse(Buffer.from(data.content, 'base64').toString());
    const fileSha = data.sha;
    
    // Add new video
    videos.push({
        title: title,
        url: videoUrl,
        duration: -1
    });
    
    // Update file
    const updateResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'M3U-Bot'
            },
            body: JSON.stringify({
                message: `Add video: ${title}`,
                content: Buffer.from(JSON.stringify(videos, null, 2)).toString('base64'),
                sha: fileSha,
                branch: BRANCH
            })
        }
    );
    
    if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || 'Failed to update playlist');
    }
    
    return true;
}

// Delete video from playlist
async function deleteVideo(token, index) {
    // Get current videos
    const url = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE}?ref=${BRANCH}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'M3U-Bot'
        }
    });
    const data = await response.json();
    
    const videos = JSON.parse(Buffer.from(data.content, 'base64').toString());
    
    if (index < 0 || index >= videos.length) {
        throw new Error('Invalid video index');
    }
    
    // Remove video
    const deletedVideo = videos.splice(index, 1)[0];
    
    // Update file
    const updateResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'M3U-Bot'
            },
            body: JSON.stringify({
                message: `Delete video: ${deletedVideo.title}`,
                content: Buffer.from(JSON.stringify(videos, null, 2)).toString('base64'),
                sha: data.sha,
                branch: BRANCH
            })
        }
    );
    
    if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || 'Failed to delete video');
    }
    
    return deletedVideo;
}

// Clear all videos
async function clearAllVideos(token) {
    // Get current file SHA
    const url = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE}?ref=${BRANCH}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'M3U-Bot'
        }
    });
    const data = await response.json();
    
    // Update with empty array
    const updateResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'M3U-Bot'
            },
            body: JSON.stringify({
                message: 'Clear all videos',
                content: Buffer.from(JSON.stringify([], null, 2)).toString('base64'),
                sha: data.sha,
                branch: BRANCH
            })
        }
    );
    
    if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || 'Failed to clear videos');
    }
    
    return true;
}

// Error handling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});