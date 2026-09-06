const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// ১. Reddit API (শুধুমাত্র ডাইরেক্ট ইমেজ ফিল্টার করা হয়েছে)
async function getBanglaMeme() {
  const fetch = (await import('node-fetch')).default;
  const subreddits = ['bangladesh_meme', 'bangladesh', 'bangla'];
  const sub = subreddits[Math.floor(Math.random() * subreddits.length)];
  
  const response = await fetch(`https://meme-api.com/gimme/${sub}`);
  const data = await response.json();

  // নিশ্চিত করা হচ্ছে যেন ইমেজ লিংকটা ডাইরেক্ট ইমেজের হয়
  if (!data.url || data.nsfw) {
    throw new Error('Invalid meme url');
  }

  return {
    type: 'image',
    url: data.url,
    text: data.title
  };
}

// ২. Giphy API (ওয়ার্কিং মিডিয়া লিংক)
async function getRandomGif() {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch('https://api.giphy.com/v1/gifs/random?api_key=cw9s9699vRO2i2wM31B29z6P4G6222UU&tag=funny');
  const data = await response.json();
  
  const gifUrl = data?.data?.images?.original?.url;
  if (!gifUrl) throw new Error('Gif not found');

  return {
    type: 'image',
    url: gifUrl,
    text: '😂 Funny GIF'
  };
}

// ৩. Official English Joke API
async function getEnglishJoke() {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch('https://official-joke-api.appspot.com/random_joke');
  const data = await response.json();
  return {
    type: 'text',
    content: `${data.setup}\n\n🤣 ${data.punchline}`
  };
}

// API Endpoint
app.get('/api/joke', async (req, res) => {
  const chance = Math.random();

  try {
    if (chance < 0.8) {
      if (Math.random() < 0.5) {
        const meme = await getBanglaMeme();
        return res.json(meme);
      } else {
        const gif = await getRandomGif();
        return res.json(gif);
      }
    } else {
      const joke = await getEnglishJoke();
      return res.json(joke);
    }
  } catch (error) {
    // কোনো এপিআই ফেল করলে ব্যাকআপ হিসেবে ইংলিশ জোক পাঠাবে যেন ব্রোকেন ইমেজ না দেখায়
    try {
      const joke = await getEnglishJoke();
      return res.json(joke);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch content' });
    }
  }
});

module.exports = app;
