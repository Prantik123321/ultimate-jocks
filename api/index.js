const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ১. গুগল ফ্রি এপিআই দিয়ে অটোমেটিক বাংলা অনুবাদের ফানশন
async function translateToBangla(text) {
  if (!text) return text;
  try {
    const response = await axios.get(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=${encodeURIComponent(text)}`,
      { timeout: 3000 }
    );
    return response.data[0][0][0];
  } catch (error) {
    return text; // অনুবাদ ব্যর্থ হলে মূল টেক্সট থাকবে
  }
}

// ২. Reddit থেকে PNG / JPG ইমেজ মেম
async function getPNGorJPGMeme() {
  const subreddits = ['bangladesh_meme', 'bangladesh', 'dankmemes', 'memes'];
  const sub = subreddits[Math.floor(Math.random() * subreddits.length)];
  
  const response = await axios.get(`https://www.reddit.com/r/${sub}/hot.json?limit=50`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JokeApp/1.0' },
    timeout: 4000
  });

  const posts = response.data.data.children;
  const validPosts = posts.filter(post => {
    const url = post.data.url;
    return url && !post.data.over_18 && (url.endsWith('.jpg') || url.endsWith('.png') || url.includes('i.redd.it'));
  });

  if (validPosts.length === 0) throw new Error('No valid PNG/JPG');
  const randomPost = validPosts[Math.floor(Math.random() * validPosts.length)].data;

  let title = randomPost.title;
  // ৮০% ক্ষেত্রে বাংলায় ট্রান্সলেট হবে
  if (Math.random() < 0.8) {
    title = await translateToBangla(title);
  }

  return { type: 'image', url: randomPost.url, text: title, format: 'PNG/JPG' };
}

// ৩. Giphy থেকে GIF কনটেন্ট
async function getGIF() {
  const tags = ['funny', 'laugh', 'bangladesh', 'cricket', 'dance', 'reaction'];
  const tag = tags[Math.floor(Math.random() * tags.length)];

  const response = await axios.get(
    `https://api.giphy.com/v1/gifs/random?api_key=cw9s9699vRO2i2wM31B29z6P4G6222UU&tag=${tag}`,
    { timeout: 4000 }
  );

  const gifUrl = response?.data?.data?.images?.original?.url;
  if (!gifUrl) throw new Error('GIF not found');

  let title = `😂 ${tag.toUpperCase()} GIF`;
  // ৮০% ক্ষেত্রে বাংলায় ট্রান্সলেট হবে
  if (Math.random() < 0.8) {
    title = await translateToBangla(tag + ' reaction GIF');
  }

  return { type: 'image', url: gifUrl, text: title, format: 'GIF' };
}

// ৪. Official Joke API থেকে টেক্সট জোকস
async function getTextJoke() {
  const response = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 4000 });
  let setup = response.data.setup;
  let punchline = response.data.punchline;

  // ৮০% ক্ষেত্রে বাংলায় ট্রান্সলেট হবে
  if (Math.random() < 0.8) {
    setup = await translateToBangla(setup);
    punchline = await translateToBangla(punchline);
  }

  return { type: 'text', content: `${setup}\n\n🤣 ${punchline}`, format: 'TEXT' };
}

// ==== MAIN ROUTE ====
app.get('/api/joke', async (req, res) => {
  // GIF, PNG/JPG এবং Text - ৩ ধরনের কনটেন্ট থেকে র্যান্ডম চয়েস
  const sources = [getGIF, getPNGorJPGMeme, getTextJoke];
  const shuffled = sources.sort(() => 0.5 - Math.random());

  for (const fetchSource of shuffled) {
    try {
      const data = await fetchSource();
      return res.json(data);
    } catch (e) {
      // একটি ফেল করলে পরেরটিতে স্কিপ করবে
    }
  }

  // Fallback text
  return res.json({
    type: 'text',
    content: '😊 কেন কম্পিউটার ঠান্ডা থাকে?\n\n🤣 কারণ এতে অনেক ফ্যান আছে!',
    format: 'TEXT'
  });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
