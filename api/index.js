const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ১. গুগল ফ্রি অনুবাদের হেল্পার
async function translateToBangla(text) {
  if (!text) return text;
  try {
    const response = await axios.get(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=${encodeURIComponent(text)}`,
      { timeout: 2500 }
    );
    return response.data[0][0][0];
  } catch (error) {
    return text;
  }
}

// ২. Reddit PNG/JPG মেম
async function getPNGorJPGMeme() {
  const subreddits = ['bangladesh_meme', 'bangladesh', 'dankmemes', 'memes'];
  const sub = subreddits[Math.floor(Math.random() * subreddits.length)];
  
  const response = await axios.get(`https://www.reddit.com/r/${sub}/hot.json?limit=50`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JokeApp/1.0' },
    timeout: 3500
  });

  const posts = response.data.data.children;
  const validPosts = posts.filter(post => {
    const url = post.data.url;
    return url && !post.data.over_18 && (url.endsWith('.jpg') || url.endsWith('.png') || url.includes('i.redd.it'));
  });

  if (validPosts.length === 0) throw new Error('No valid PNG/JPG');
  const randomPost = validPosts[Math.floor(Math.random() * validPosts.length)].data;

  let title = randomPost.title;
  if (Math.random() < 0.8) {
    title = await translateToBangla(title);
  }

  return { type: 'image', url: randomPost.url, text: title };
}

// ৩. Giphy GIF
async function getGIF() {
  const tags = ['funny', 'laugh', 'bangladesh', 'cricket', 'dance', 'reaction'];
  const tag = tags[Math.floor(Math.random() * tags.length)];

  const response = await axios.get(
    `https://api.giphy.com/v1/gifs/random?api_key=cw9s9699vRO2i2wM31B29z6P4G6222UU&tag=${tag}`,
    { timeout: 3500 }
  );

  const gifUrl = response?.data?.data?.images?.original?.url;
  if (!gifUrl) throw new Error('GIF not found');

  let title = `😂 ${tag.toUpperCase()} GIF`;
  if (Math.random() < 0.8) {
    title = await translateToBangla(tag + ' reaction GIF');
  }

  return { type: 'image', url: gifUrl, text: title };
}

// ৪. Text Joke
async function getTextJoke() {
  const response = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 3500 });
  let setup = response.data.setup;
  let punchline = response.data.punchline;

  if (Math.random() < 0.8) {
    setup = await translateToBangla(setup);
    punchline = await translateToBangla(punchline);
  }

  return { type: 'text', content: `${setup}\n\n🤣 ${punchline}` };
}

// ==== MAIN API ENDPOINT ====
app.get('/api/joke', async (req, res) => {
  const sources = [getGIF, getPNGorJPGMeme, getTextJoke];
  const shuffled = sources.sort(() => 0.5 - Math.random());

  for (const fetchSource of shuffled) {
    try {
      const data = await fetchSource();
      return res.json(data);
    } catch (e) {
      // Continue to next source
    }
  }

  // Guaranteed Backup Response (Never Fails)
  return res.json({
    type: 'text',
    content: '😊 কেন কম্পিউটার ঠান্ডা থাকে?\n\n🤣 কারণ এতে অনেক ফ্যান আছে!'
  });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
