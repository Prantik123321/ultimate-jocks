const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// ১. Reddit API থেকে বাংলা মেমস/জোকস পিকচার ফেচ করা
async function getBanglaMeme() {
  const fetch = (await import('node-fetch')).default;
  const subreddits = ['bangladesh', 'bangladesh_meme', 'bangla'];
  const sub = subreddits[Math.floor(Math.random() * subreddits.length)];
  const response = await fetch(`https://meme-api.com/gimme/${sub}`);
  const data = await response.json();
  return {
    type: 'image',
    url: data.url,
    text: data.title
  };
}

// ২. Giphy API থেকে র্যান্ডম ফানি GIF ফেচ করা
async function getRandomGif() {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch('https://api.giphy.com/v1/gifs/random?api_key=cw9s9699vRO2i2wM31B29z6P4G6222UU&tag=funny');
  const data = await response.json();
  return {
    type: 'image',
    url: data.data.images.downsized_medium.url,
    text: '😂 Funny Reaction GIF'
  };
}

// ৩. Official Joke API থেকে র্যান্ডম ইংলিশ জোকস ফেচ করা
async function getEnglishJoke() {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch('https://official-joke-api.appspot.com/random_joke');
  const data = await response.json();
  return {
    type: 'text',
    content: `${data.setup}\n\n🤣 ${data.punchline}`
  };
}

// Vercel Serverless Route
app.get('/api/joke', async (req, res) => {
  try {
    const chance = Math.random();

    if (chance < 0.8) {
      if (Math.random() < 0.5) {
        const meme = await getBanglaMeme();
        res.json(meme);
      } else {
        const gif = await getRandomGif();
        res.json(gif);
      }
    } else {
      const joke = await getEnglishJoke();
      res.json(joke);
    }
  } catch (error) {
    try {
      const backupGif = await getRandomGif();
      res.json(backupGif);
    } catch (e) {
      res.status(500).json({ error: 'Serverless execution error' });
    }
  }
});

// Vercel Serverless Function Export
module.exports = app;
