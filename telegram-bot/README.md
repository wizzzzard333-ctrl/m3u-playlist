# M3U Playlist Telegram Bot

Manage your M3U playlist directly from Telegram!

## 🚀 Quick Setup

### 1. Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Choose a name: `M3U Playlist Manager`
4. Choose a username: `your_m3u_bot` (must end with 'bot')
5. Copy the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Deploy Bot

#### Option A: Deploy on Render (Free)

1. Fork this repository
2. Go to [render.com](https://render.com)
3. Create new "Web Service"
4. Connect your GitHub repo
5. Settings:
   - **Root Directory**: `telegram-bot`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add Environment Variable:
   - **Key**: `TELEGRAM_BOT_TOKEN`
   - **Value**: Your bot token from BotFather

#### Option B: Run Locally

```bash
cd telegram-bot
npm install
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
npm start
```

#### Option C: Deploy on Railway

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select this repo
4. Add environment variable: `TELEGRAM_BOT_TOKEN`
5. Deploy!

### 3. Use the Bot

1. Open your bot in Telegram
2. Send `/start`
3. Send `/settoken` and paste your GitHub token
4. Start sending video URLs!

## 📱 Bot Commands

- `/start` - Welcome message
- `/settoken` - Save your GitHub token (one-time)
- `/addvideo` - Add a video URL
- `/listvideo` - List all videos in playlist
- `/cleartoken` - Remove saved token
- `/help` - Show help

## 🎯 Quick Add Videos

Just send URLs directly:

```
https://example.com/video1.mp4
```

Or with custom title:

```
My Awesome Video | https://example.com/video1.mp4
```

## 🔐 Security

- Tokens are stored in memory (not persistent)
- Token messages are auto-deleted
- For production, use a database (MongoDB, Redis, etc.)

## 🛠️ Production Setup

For persistent storage, modify `bot.js` to use a database:

```javascript
// Example with MongoDB
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    chatId: Number,
    githubToken: String
});

const User = mongoose.model('User', UserSchema);
```

## 📝 Environment Variables

- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token (required)

## 🎬 Your Playlist URL

After adding videos, your playlist will be available at:
`https://wizzzzard333-ctrl.github.io/m3u-playlist/playlist.m3u`

## 🐛 Troubleshooting

**Bot not responding?**
- Check if bot is running
- Verify bot token is correct
- Check logs for errors

**Videos not adding?**
- Verify GitHub token has 'repo' scope
- Check if token is saved: `/listvideo`
- Try `/settoken` again

## 📦 Dependencies

- `node-telegram-bot-api` - Telegram Bot API
- `node-fetch` - HTTP requests

## 🔄 Updates

The bot automatically updates your playlist on GitHub, which triggers the workflow to regenerate the M3U file.