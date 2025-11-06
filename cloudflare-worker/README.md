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
4. **Start managing your playlist!**

## 📱 Bot Commands

### Setup:
- `/start` - Welcome message & command list
- `/settoken` - Save GitHub token (one-time, permanent)
- `/cleartoken` - Remove saved token
- `/help` - Show detailed help

### Add Videos:
- `/add` - Prompt to add video
- Or just send URLs directly:
  - `https://example.com/video.mp4`
  - `My Video | https://example.com/video.mp4`

### Manage Videos:
- `/list` - Show all videos in playlist
- `/delete` - Delete specific videos (interactive buttons)
- `/clear` - Clear entire playlist (with confirmation)

## 🎯 Usage Examples

### Add a Video:

**Simple URL:**
```
https://example.com/video.mp4
```
Bot extracts filename as title automatically.

**Custom Title:**
```
My Awesome Video | https://example.com/video.mp4
```

### Delete Videos:

1. Send `/delete`
2. Bot shows list with ❌ buttons
3. Click button to select video
4. Confirm deletion
5. Done! ✅

**Features:**
- Shows 10 videos at a time
- "Show More" button for pagination
- Confirmation before deleting
- Shows video title & URL before deletion

### Clear All Videos:

1. Send `/clear`
2. Bot asks for confirmation
3. Click "✅ Yes, Clear All"
4. All videos deleted! 🗑️

## 🔐 Security

- Tokens stored in Cloudflare KV (encrypted, permanent)
- Token messages auto-deleted after saving
- Each user has their own isolated token
- Confirmation required for destructive actions
- No database needed!

## 💰 Cost

**100% FREE!**
- Cloudflare Workers: 100,000 requests/day free
- KV Storage: 100,000 reads/day free
- KV Writes: 1,000/day free
- Perfect for personal use!

## ✨ Features

✅ **Add Videos**
- Send URLs directly
- Auto-extract titles from URLs
- Custom title support
- Instant confirmation

✅ **Delete Videos**
- Interactive button interface
- Pagination (10 videos per page)
- Confirmation before deletion
- Shows video details

✅ **Clear Playlist**
- Delete all videos at once
- Safety confirmation
- Quick reset

✅ **Token Management**
- Permanent storage per user
- Secure token handling
- Auto-delete token messages
- Easy token reset

✅ **User Experience**
- Instant responses
- Clear feedback messages
- Interactive buttons
- Error handling

## 🐛 Troubleshooting

**Bot not responding?**
1. Check webhook setup: Visit `/setup` endpoint
2. Verify bot token in environment variables
3. Check worker logs in Cloudflare dashboard
4. Make sure KV namespace is bound

**Token not saving?**
1. Verify KV namespace is created
2. Check binding name is exactly `USER_TOKENS`
3. Try `/cleartoken` then `/settoken` again

**Videos not adding/deleting?**
1. Verify GitHub token has 'repo' scope
2. Check token is saved: Send `/list`
3. Try refreshing token: `/cleartoken` → `/settoken`

**Delete buttons not working?**
1. Make sure you clicked "Save and Deploy" after updating code
2. Check worker logs for errors
3. Try `/delete` command again

## 🔄 Update Bot Code

To update the bot with new features:
1. Go to Cloudflare Workers dashboard
2. Click your worker
3. Click "Quick Edit"
4. Copy new code from `cloudflare-worker/bot.js`
5. Paste and replace all code
6. Click "Save and Deploy"
7. Test with `/start` command

## 📊 Monitor Usage

- Cloudflare Dashboard → Workers → Your Worker
- View requests, errors, and performance
- Check KV storage usage
- Free tier shows last 24 hours of data

## 🎬 Your Playlist URL

After managing videos, your playlist is available at:
`https://wizzzzard333-ctrl.github.io/m3u-playlist/playlist.m3u`

Use this URL in any M3U-compatible player!

## 🌟 Pro Tips

1. **Bulk Add**: Send multiple URLs in separate messages quickly
2. **Quick Delete**: Use `/delete` to remove videos without opening web interface
3. **Fresh Start**: Use `/clear` to reset playlist completely
4. **Token Security**: Bot auto-deletes your token message for security
5. **Pagination**: If you have many videos, use "Show More" button in `/delete`

## 📝 Command Summary

| Command | Description |
|---------|-------------|
| `/start` | Show welcome & commands |
| `/settoken` | Save GitHub token (permanent) |
| `/add` | Add video prompt |
| `/list` | Show all videos |
| `/delete` | Delete videos (interactive) |
| `/clear` | Clear all videos |
| `/cleartoken` | Remove saved token |
| `/help` | Show help |

## 🎯 Next Steps

1. Deploy the bot following steps above
2. Set your GitHub token once
3. Start managing your playlist from Telegram!
4. Share your playlist URL with friends

**No app needed, no web interface required - just Telegram!** 🚀