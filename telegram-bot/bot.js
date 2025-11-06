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
/addvideo - Add a video URL
/listvideo - List all videos
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
   /listvideo - See all videos
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

// Command: /addvideo
bot.onText(/\/addvideo/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
        '📹 Send me the video URL:\n\n' +
        'Format 1: \`https://example.com/video.mp4\`\n' +
        'Format 2: \`My Video | https://example.com/video.mp4\`',
        { parse_mode: 'Markdown' }
    );
});

// Command: /listvideo
bot.onText(/\/listvideo/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const videos = await fetchVideos();
        
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
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        bot.sendMessage(chatId, '❌ Error fetching videos: ' + error.message);
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
async function fetchVideos() {
    const url = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE}?ref=${BRANCH}`;
    const response = await fetch(url);
    const data = await response.json();
    return JSON.parse(Buffer.from(data.content, 'base64').toString());
}

// Add video to playlist
async function addVideoToPlaylist(token, title, videoUrl) {
    // Get current videos
    const url = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE}?ref=${BRANCH}`;
    const response = await fetch(url);
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

// Error handling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});