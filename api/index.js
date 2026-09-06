const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection (for storing user uploaded content)
mongoose.connect('mongodb://localhost:27017/meme_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Content Schema for user submitted jokes/memes
const ContentSchema = new mongoose.Schema({
  type: { type: String, enum: ['joke', 'meme', 'gif'], required: true },
  content: String, // for text jokes
  url: String, // for images/gifs
  title: String,
  category: String,
  isBangla: { type: Boolean, default: false },
  source: { type: String, default: 'user' },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Content = mongoose.model('Content', ContentSchema);

// ==== API FUNCTIONS (Dynamic & Unlimited) ====

// 1. DYNAMIC REDDIT API - Always fetches new memes
async function getRedditMeme() {
  try {
    const subreddits = ['bangladesh_meme', 'bangladesh', 'bangla', 'dankmemes', 'memes'];
    const sub = subreddits[Math.floor(Math.random() * subreddits.length)];
    
    // Fetch latest 50 memes from subreddit
    const response = await axios.get(`https://www.reddit.com/r/${sub}/hot.json?limit=50`);
    const posts = response.data.data.children;
    
    // Filter valid image posts
    const validPosts = posts.filter(post => {
      const url = post.data.url;
      return url && 
             !post.data.over_18 && 
             (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.gif') || 
              url.includes('i.redd.it') || url.includes('imgur.com'));
    });
    
    if (validPosts.length === 0) throw new Error('No valid memes found');
    
    // Pick random meme
    const randomPost = validPosts[Math.floor(Math.random() * validPosts.length)];
    const data = randomPost.data;
    
    // Auto-translate if needed (for Bangla)
    let title = data.title;
    if (Math.random() < 0.8) {
      try {
        const translated = await translateToBangla(data.title);
        title = translated;
      } catch (e) {}
    }
    
    return {
      type: 'image',
      url: data.url,
      text: title,
      source: 'reddit',
      subreddit: sub
    };
  } catch (error) {
    console.error('Reddit fetch error:', error);
    throw new Error('Reddit API failed');
  }
}

// 2. DYNAMIC GIPHY API - Unlimited GIFs
async function getGiphyGif() {
  try {
    const tags = ['funny', 'bangladesh', 'cricket', 'dance', 'laugh', 'comedy', 'reaction'];
    const tag = tags[Math.floor(Math.random() * tags.length)];
    
    const response = await axios.get(
      `https://api.giphy.com/v1/gifs/random?api_key=cw9s9699vRO2i2wM31B29z6P4G6222UU&tag=${tag}`
    );
    
    const gifUrl = response?.data?.data?.images?.original?.url;
    if (!gifUrl) throw new Error('Gif not found');
    
    let title = `😄 ${tag} GIF`;
    if (Math.random() < 0.8) {
      try {
        const translated = await translateToBangla(tag + ' GIF');
        title = translated;
      } catch (e) {}
    }
    
    return {
      type: 'image',
      url: gifUrl,
      text: title,
      source: 'giphy'
    };
  } catch (error) {
    console.error('Giphy error:', error);
    throw new Error('Giphy API failed');
  }
}

// 3. DYNAMIC JOKE APIs - Multiple sources
async function getDynamicJoke() {
  const jokeAPIs = [
    // API 1: Official Joke API
    async () => {
      const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
      const data = response.data;
      return { setup: data.setup, punchline: data.punchline };
    },
    // API 2: JokeAPI (has Bangla jokes)
    async () => {
      const response = await axios.get('https://v2.jokeapi.dev/joke/Any?lang=bn&type=twopart');
      const data = response.data;
      if (data.type === 'twopart') {
        return { setup: data.setup, punchline: data.delivery };
      }
      throw new Error('Invalid joke format');
    },
    // API 3: Programming jokes
    async () => {
      const response = await axios.get('https://official-joke-api.appspot.com/jokes/programming/random');
      const data = response.data[0];
      return { setup: data.setup, punchline: data.punchline };
    }
  ];
  
  // Try random joke API
  const api = jokeAPIs[Math.floor(Math.random() * jokeAPIs.length)];
  try {
    const joke = await api();
    
    // 80% chance to translate to Bangla
    if (Math.random() < 0.8) {
      try {
        joke.setup = await translateToBangla(joke.setup);
        joke.punchline = await translateToBangla(joke.punchline);
      } catch (e) {}
    }
    
    return {
      type: 'text',
      content: `${joke.setup}\n\n🤣 ${joke.punchline}`,
      source: 'joke_api'
    };
  } catch (error) {
    throw new Error('All joke APIs failed');
  }
}

// 4. BANGLA SPECIFIC JOKE API
async function getBanglaJoke() {
  try {
    // Try multiple Bangla joke sources
    const sources = [
      async () => {
        const response = await axios.get('https://bangla-joke-api.vercel.app/api/random');
        return response.data.joke || 'একটি মজার বাংলা জোক!';
      },
      async () => {
        // Scrape from public Bangla joke sources (example)
        const response = await axios.get('https://raw.githubusercontent.com/banglajokes/bangla-jokes/main/jokes.txt');
        const jokes = response.data.split('\n').filter(j => j.trim());
        return jokes[Math.floor(Math.random() * jokes.length)];
      }
    ];
    
    const source = sources[Math.floor(Math.random() * sources.length)];
    const joke = await source();
    
    return {
      type: 'text',
      content: `${joke}\n\n😊 হাসতে ভুলবেন না!`,
      source: 'bangla_api'
    };
  } catch (error) {
    console.error('Bangla joke error:', error);
    // Fallback to dynamic English joke with translation
    return getDynamicJoke();
  }
}

// 5. USER GENERATED CONTENT (Stored in DB)
async function getUserContent() {
  try {
    // Fetch random from database
    const count = await Content.countDocuments();
    if (count === 0) {
      // Add some initial jokes if DB is empty
      await addInitialContent();
      return getUserContent();
    }
    
    const random = Math.floor(Math.random() * count);
    const content = await Content.findOne().skip(random).exec();
    
    if (content.type === 'joke') {
      return {
        type: 'text',
        content: content.content,
        source: 'user_db'
      };
    } else {
      return {
        type: 'image',
        url: content.url,
        text: content.title || '😂 মজার মিম',
        source: 'user_db'
      };
    }
  } catch (error) {
    throw new Error('No user content found');
  }
}

// Helper: Add initial content to DB
async function addInitialContent() {
  const initialJokes = [
    { type: 'joke', content: 'কেন কম্পিউটার ঠান্ডা লাগে? কারণ তার অনেক ফ্যান আছে!' },
    { type: 'joke', content: 'প্রোগ্রামার কেন বিয়ে করে না? কারণ সে ইতিমধ্যে অনেক বাগে আছে!' },
    { type: 'joke', content: 'বাংলাদেশের সবচেয়ে বড় কোম্পানি কোনটা? "হাঁস-মুরগি পালন"!' }
  ];
  
  for (const joke of initialJokes) {
    await Content.create({ ...joke, isBangla: true });
  }
}

// Helper: Translate to Bangla
async function translateToBangla(text) {
  try {
    const response = await axios.get(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=${encodeURIComponent(text)}`
    );
    return response.data[0][0][0];
  } catch (error) {
    return text;
  }
}

// ==== MAIN API ENDPOINT ====
app.get('/api/joke', async (req, res) => {
  const random = Math.random();
  
  // Array of possible content sources
  const contentSources = [
    { weight: 0.30, fn: getRedditMeme },    // 30% Reddit memes
    { weight: 0.20, fn: getGiphyGif },       // 20% GIFs
    { weight: 0.20, fn: getDynamicJoke },    // 20% Dynamic jokes
    { weight: 0.15, fn: getBanglaJoke },     // 15% Pure Bangla jokes
    { weight: 0.15, fn: getUserContent }     // 15% User submitted
  ];
  
  // Select based on weighted probability
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
    // Fallback: Try another source
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
    
    // Ultimate fallback
    return res.json({
      type: 'text',
      content: '😊 কিছু মজার পাচ্ছি না! আবার চেষ্টা করুন।\n\n"কম্পিউটার প্রোগ্রামাররা কেন ডার্ক মোড ব্যবহার করে? কারণ লাইট তাদের বাগ দেখায়!"',
      timestamp: new Date().toISOString()
    });
  }
});

// ==== USER SUBMISSION ENDPOINT ====
app.post('/api/content', async (req, res) => {
  try {
    const { type, content, url, title } = req.body;
    
    const newContent = await Content.create({
      type,
      content,
      url,
      title,
      isBangla: true,
      source: 'user'
    });
    
    res.json({ 
      success: true, 
      message: 'Content added successfully!',
      id: newContent._id 
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add content' });
  }
});

// ==== GET ALL CONTENT (Admin) ====
app.get('/api/content', async (req, res) => {
  try {
    const content = await Content.find().sort({ createdAt: -1 }).limit(50);
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// ==== STATS ENDPOINT ====
app.get('/api/stats', async (req, res) => {
  try {
    const total = await Content.countDocuments();
    const jokes = await Content.countDocuments({ type: 'joke' });
    const memes = await Content.countDocuments({ type: 'meme' });
    
    res.json({
      totalContent: total,
      totalJokes: jokes,
      totalMemes: memes,
      activeSources: ['reddit', 'giphy', 'joke_apis', 'bangla_apis', 'user_db']
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log('📊 Content sources: Reddit, Giphy, Joke APIs, Bangla APIs, User DB');
  console.log('🔄 Everything is dynamic and unlimited!');
});

module.exports = app;
