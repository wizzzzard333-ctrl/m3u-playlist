# M3U Telegram Bot - Cloudflare Worker (FREE!)

Deploy your Telegram bot on Cloudflare Workers - **100% FREE** with 100k requests/day!

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Telegram Bot

1. Open Telegram → Search `@BotFather`
2. Send: `/newbot`
3. Name: `M3U Playlist Manager`
4. Username: `your_m3u_bot` (must end with 'bot')
5. **Copy the bot token** (e.g., `123456789:ABC...`)

### Step 2: Deploy to Cloudflare (FREE)

1. **Sign up**: Go to [workers.cloudflare.com](https://workers.cloudflare.com)
2. **Create Worker**:
   - Click "Create a Service"
   - Name: `m3u-telegram-bot`
   - Click "Create Service"

3. **Add Code**:
   - Click "Quick Edit"
   - Delete all code
   - Copy code from `cloudflare-worker/bot.js`
   - Paste it
   - Click "Save and Deploy"

4. **Add KV Storage** (for permanent token storage):
   - Go to "Workers" → "KV"
   - Click "Create namespace"
   - Name: `USER_TOKENS`
   - Copy the ID
   - Go back to your worker → "Settings" → "Variables"
   - Under "KV Namespace Bindings":
     - Variable name: `USER_TOKENS`
     - KV namespace: Select `USER_TOKENS`
   - Click "Save"

5. **Add Environment Variables**:
   - Still in "Settings" → "Variables"
   - Under "Environment Variables":
     - Variable name: `TELEGRAM_BOT_TOKEN`
     - Value: (paste your bot token from Step 1)
   - Click "Save"

6. **Setup Webhook**:
   - Copy your worker URL (e.g., `https://m3u-telegram-bot.your-subdomain.workers.dev`)
   - Visit: `https://m3u-telegram-bot.your-subdomain.workers.dev/setup`
   - You should see: `{"ok":true,"result":true,...}`

### Step 3: Use Your Bot! 🎉

1. Open your bot in Telegram
2. Send: `/start`
3. Send: `/settoken` → Paste your GitHub token
4. **Start sending video URLs!**

## 📱 Usage

### Add Videos:

**Simple:**
```
https://example.com/video.mp4
```

**With Title:**
```
My Awesome Video | https://example.com/video.mp4
```

### Commands:

- `/start` - Welcome message
- `/settoken` - Save GitHub token (one-time, permanent)
- `/list` - Show all videos
- `/cleartoken` - Remove saved token
- `/help` - Show help

## 🔐 Security

- Tokens stored in Cloudflare KV (encrypted, permanent)
- Token messages auto-deleted
- Each user has their own token
- No database needed!

## 💰 Cost

**100% FREE!**
- Cloudflare Workers: 100,000 requests/day free
- KV Storage: 100,000 reads/day free
- Perfect for personal use!

## 🐛 Troubleshooting

**Bot not responding?**
1. Check webhook setup: Visit `/setup` endpoint
2. Verify bot token in environment variables
3. Check worker logs in Cloudflare dashboard

**Token not saving?**
1. Make sure KV namespace is bound as `USER_TOKENS`
2. Check KV namespace is created
3. Verify binding name matches exactly

**Videos not adding?**
1. Make sure GitHub token has 'repo' scope
2. Try `/cleartoken` and `/settoken` again
3. Check GitHub token is valid

## 🔄 Updates

To update the bot:
1. Go to Cloudflare Workers dashboard
2. Click your worker
3. Click "Quick Edit"
4. Update code
5. Click "Save and Deploy"

## 📊 Monitor Usage

- Cloudflare Dashboard → Workers → Your Worker
- See requests, errors, and performance
- Free tier shows last 24 hours

## 🎯 Features

✅ Permanent token storage per user
✅ Auto-extracts video titles from URLs
✅ Custom titles support
✅ List all videos
✅ Secure token handling
✅ 100% serverless
✅ No server maintenance
✅ Instant responses

## 🌐 Your Playlist

After adding videos:
`https://wizzzzard333-ctrl.github.io/m3u-playlist/playlist.m3u`