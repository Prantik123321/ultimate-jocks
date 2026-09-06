const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ==== MongoDB Serverless Connection Caching ====
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/meme_db';
let isConnected = false;

async function connectToDatabase() {
  if (isConnected) return;
  try {
    const db = await mongoose.connect(MONGO_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
  }
}

// Middleware to ensure DB connection before handling requests
app.use(async (req, res, next) => {
  await connectToDatabase();
  next();
});

// Content Schema
const ContentSchema = new mongoose.Schema({
  type: { type: String, enum: ['joke', 'meme', 'gif'], required: true },
  content: String,
  url: String,
  title: String,
  category: String,
  isBangla: { type: Boolean, default: false },
  source: { type: String, default: 'user' },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Content = mongoose.models.Content || mongoose.model('Content', ContentSchema);

// ==== API FUNCTIONS ====

// Helper: Translate to Bangla
async function translateToBangla(text) {
  try {
    const response = await axios.get(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=${encodeURIComponent(text)}`,
      { timeout: 3000 }
    );
    return response.data[0][0][0];
  } catch (error) {
    return text;
  }
}

// 1. DYNAMIC REDDIT API (Fixed User-Agent Header)
async function getRedditMeme() {
  try {
    const subreddits = ['bangladesh_meme', 'bangladesh', 'bangla', 'dankmemes', 'memes'];
    const sub = subreddits[Math.floor(Math.random() * subreddits.length)];
    
    // User-Agent added to prevent Reddit 429 Block
    const response = await axios.get(`https://www.reddit.com/r/${sub}/hot.json?limit=50`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FunnyApp/1.0' },
      timeout: 5000
    });
    
    const posts = response.data.data.children;
    const validPosts = posts.filter(post => {
      const url = post.data.url;
      return url && 
             !post.data.over_18 && 
             (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.gif') || 
              url.includes('i.redd.it') || url.includes('imgur.com'));
    });
    
    if (validPosts.length === 0) throw new Error('No valid memes found');
    
    const randomPost = validPosts[Math.floor(Math.random() * validPosts.length)];
    const data = randomPost.data;
    
    let title = data.title;
    if (Math.random() < 0.8) {
      title = await translateToBangla(data.title);
    }
    
    return {
      type: 'image',
      url: data.url,
      text: title,
      source: 'reddit',
      subreddit: sub
    };
  } catch (error) {
    console.error('Reddit fetch error:', error.message);
    throw new Error('Reddit API failed');
  }
}

// 2. DYNAMIC GIPHY API
async function getGiphyGif() {
  try {
    const tags = ['funny', 'bangladesh', 'cricket', 'dance', 'laugh', 'comedy', 'reaction'];
    const tag = tags[Math.floor(Math.random() * tags.length)];
    
    const response = await axios.get(
      `https://api.giphy.com/v1/gifs/random?api_key=cw9s9699vRO2i2wM31B29z6P4G6222UU&tag=${tag}`,
      { timeout: 5000 }
    );
    
    const gifUrl = response?.data?.data?.images?.original?.url;
    if (!gifUrl) throw new Error('Gif not found');
    
    let title = `😄 ${tag} GIF`;
    if (Math.random() < 0.8) {
      title = await translateToBangla(tag + ' GIF');
    }
    
    return {
      type: 'image',
      url: gifUrl,
      text: title,
      source: 'giphy'
    };
  } catch (error) {
    console.error('Giphy error:', error.message);
    throw new Error('Giphy API failed');
  }
}

// 3. DYNAMIC JOKE APIs
async function getDynamicJoke() {
  const jokeAPIs = [
    async () => {
      const response = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 4000 });
      return { setup: response.data.setup, punchline: response.data.punchline };
    },
    async () => {
      const response = await axios.get('https://official-joke-api.appspot.com/jokes/programming/random', { timeout: 4000 });
      const data = response.data[0];
      return { setup: data.setup, punchline: data.punchline };
    }
  ];
  
  const api = jokeAPIs[Math.floor(Math.random() * jokeAPIs.length)];
  try {
    const joke = await api();
    
    if (Math.random() < 0.8) {
      joke.setup = await translateToBangla(joke.setup);
      joke.punchline = await translateToBangla(joke.punchline);
    }
    
    return {
      type: 'text',
      content: `${joke.setup}\n\n🤣 ${joke.punchline}`,
      source: 'joke_api'
    };
  } catch (error) {
    throw new Error('Joke APIs failed');
  }
}

// 4. BANGLA SPECIFIC JOKE
async function getBanglaJoke() {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/banglajokes/bangla-jokes/main/jokes.txt', { timeout: 4000 });
    const jokes = response.data.split('\n').filter(j => j.trim().length > 10);
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    
    return {
      type: 'text',
      content: `${joke}\n\n😊 হাসতে ভুলবেন না!`,
      source: 'bangla_api'
    };
  } catch (error) {
    return getDynamicJoke();
  }
}

// 5. USER GENERATED CONTENT
async function getUserContent() {
  try {
    if (!isConnected) throw new Error('DB not connected');
    const count = await Content.countDocuments();
    if (count === 0) throw new Error('No user content');
    
    const random = Math.floor(Math.random() * count);
    const content = await Content.findOne().skip(random).exec();
    
    if (content.type === 'joke') {
      return { type: 'text', content: content.content, source: 'user_db' };
    } else {
      return { type: 'image', url: content.url, text: content.title || '😂 মজার মিম', source: 'user_db' };
    }
  } catch (error) {
    throw new Error('User DB failed');
  }
}

// ==== MAIN API ENDPOINT ====
app.get('/api/joke', async (req, res) => {
  const random = Math.random();
  
  const contentSources = [
    { weight: 0.35, fn: getRedditMeme },
    { weight: 0.25, fn: getGiphyGif },
    { weight: 0.20, fn: getDynamicJoke },
    { weight: 0.10, fn: getBanglaJoke },
    { weight: 0.10, fn: getUserContent }
  ];
  
  let selected = null;
  let cumulative = 0;
  for (const source of contentSources) {
    cumulative += source.weight;
    if (random <= cumulative) {
      selected = source;
      break;
    }
  }
  
  if (!selected) selected = contentSources[0];
  
  try {
    const result = await selected.fn();
    return res.json({
      ...result,
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7)
    });
  } catch (error) {
    // Fallback logic
    for (const source of contentSources) {
      if (source.fn !== selected.fn) {
        try {
          const result = await source.fn();
          return res.json({
            ...result,
            timestamp: new Date().toISOString(),
            requestId: Math.random().toString(36).substring(7)
          });
        } catch (e) {}
      }
    }
    
    return res.json({
      type: 'text',
      content: '😊 "কম্পিউটার প্রোগ্রামাররা কেন ডার্ক মোড ব্যবহার করে? কারণ লাইট তাদের বাগ দেখায়!"',
      timestamp: new Date().toISOString()
    });
  }
});

// ==== SUBMISSION & STATS ENDPOINTS ====
app.post('/api/content', async (req, res) => {
  try {
    const { type, content, url, title } = req.body;
    const newContent = await Content.create({ type, content, url, title, isBangla: true, source: 'user' });
    res.json({ success: true, message: 'Content added successfully!', id: newContent._id });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add content' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const total = isConnected ? await Content.countDocuments() : 0;
    res.json({
      totalContent: total,
      activeSources: ['reddit', 'giphy', 'joke_apis', 'bangla_apis', 'user_db']
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Vercel / Local Host Management
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`✅ Server running locally on port ${PORT}`));
}

module.exports = app;
