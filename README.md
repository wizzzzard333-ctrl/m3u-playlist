# 🎬 M3U Playlist Generator

Dynamic M3U playlist that auto-updates when you edit videos.

## 🔗 Your Links

- **M3U Playlist**: `https://wizzzzard333-ctrl.github.io/m3u-playlist/playlist.m3u`
- **Web Editor**: `https://wizzzzard333-ctrl.github.io/m3u-playlist/`

## 📝 How to Edit

### Option 1: Web Interface (Easiest)
1. Go to: https://wizzzzard333-ctrl.github.io/m3u-playlist/
2. Edit videos directly in the table
3. Click "Save & Update Playlist"
4. Enter your GitHub token when prompted

### Option 2: Direct File Edit
1. Edit `videos.json` on GitHub
2. Commit changes
3. Playlist auto-updates in ~30 seconds

## 🔑 GitHub Token Setup

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scope: `repo`
4. Copy the token
5. Use it in the web interface

## 📋 Video Format

```json
{
  "title": "Video Name",
  "url": "https://example.com/video.mp4",
  "duration": 120
}
```