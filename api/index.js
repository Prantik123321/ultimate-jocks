const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ১. গুগল ফ্রি অনুবাদের হেল্পার ফাংশন
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

// ==== 7 DYNAMIC API SOURCES (Zero Manual Content) ====

// Source 1: Reddit Memes (PNG/JPG/GIF)
async function getRedditMeme() {
  const subreddits = ['bangladesh_meme', 'bangladesh', 'dankmemes', 'memes', 'wholesomememes'];
  const sub = subreddits[Math.floor(Math.random() * subreddits.length)];
  
  const response = await axios.get(`https://www.reddit.com/r/${sub}/hot.json?limit=50`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JokeApp/1.0' },
    timeout: 3500
  });

  const posts = response.data.data.children;
  const validPosts = posts.filter(post => {
    const url = post.data.url;
    return url && !post.data.over_18 && (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.gif') || url.includes('i.redd.it'));
  });

  if (validPosts.length === 0) throw new Error('Reddit Fail');
  const randomPost = validPosts[Math.floor(Math.random() * validPosts.length)].data;

  let title = randomPost.title;
  if (Math.random() < 0.8) title = await translateToBangla(title);

  return { type: 'image', url: randomPost.url, text: title };
}

// Source 2: Giphy Random GIFs
async function getGiphyGif() {
  const tags = ['funny', 'laugh', 'cricket', 'dance', 'comedy', 'fail', 'reaction'];
  const tag = tags[Math.floor(Math.random() * tags.length)];

  const response = await axios.get(
    `https://api.giphy.com/v1/gifs/random?api_key=cw9s9699vRO2i2wM31B29z6P4G6222UU&tag=${tag}`,
    { timeout: 3500 }
  );

  const gifUrl = response?.data?.data?.images?.original?.url;
  if (!gifUrl) throw new Error('Giphy Fail');

  let title = `😂 ${tag.toUpperCase()} GIF`;
  if (Math.random() < 0.8) title = await translateToBangla(tag + ' reaction GIF');

  return { type: 'image', url: gifUrl, text: title };
}

// Source 3: Official Joke API
async function getOfficialJoke() {
  const response = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 3500 });
  let setup = response.data.setup;
  let punchline = response.data.punchline;

  if (Math.random() < 0.8) {
    setup = await translateToBangla(setup);
    punchline = await translateToBangla(punchline);
  }

  return { type: 'text', content: `${setup}\n\n🤣 ${punchline}` };
}

// Source 4: JokeAPI v2
async function getJokeApiV2() {
  const response = await axios.get('https://v2.jokeapi.dev/joke/Any?type=twopart', { timeout: 3500 });
  if (response.data.error) throw new Error('JokeAPI Fail');

  let setup = response.data.setup;
  let punchline = response.data.delivery;

  if (Math.random() < 0.8) {
    setup = await translateToBangla(setup);
    punchline = await translateToBangla(punchline);
  }

  return { type: 'text', content: `${setup}\n\n🤣 ${punchline}` };
}

// Source 5: Programming Joke API
async function getProgrammingJoke() {
  const response = await axios.get('https://official-joke-api.appspot.com/jokes/programming/random', { timeout: 3500 });
  const data = response.data[0];
  let setup = data.setup;
  let punchline = data.punchline;

  if (Math.random() < 0.8) {
    setup = await translateToBangla(setup);
    punchline = await translateToBangla(punchline);
  }

  return { type: 'text', content: `${setup}\n\n🤣 ${punchline}` };
}

// Source 6: Tech Jokes API
async function getTechJoke() {
  const response = await axios.get('https://v2.jokeapi.dev/joke/Programming,Misc?type=single', { timeout: 3500 });
  if (response.data.error) throw new Error('TechJoke Fail');

  let joke = response.data.joke;
  if (Math.random() < 0.8) joke = await translateToBangla(joke);

  return { type: 'text', content: `😂 ${joke}` };
}

// Source 7: Meme API (Alternative Reddit Wrapper)
async function getMemeApi() {
  const response = await axios.get('https://meme-api.com/gimme', { timeout: 3500 });
  if (!response.data.url || response.data.nsfw) throw new Error('MemeApi Fail');

  let title = response.data.title;
  if (Math.random() < 0.8) title = await translateToBangla(title);

  return { type: 'image', url: response.data.url, text: title };
}

// ==== MAIN API ENDPOINT ====
app.get('/api/joke', async (req, res) => {
  // ৭টি এপিআই এর অ্যারে
  const sources = [
    getRedditMeme,
    getGiphyGif,
    getOfficialJoke,
    getJokeApiV2,
    getProgrammingJoke,
    getTechJoke,
    getMemeApi
  ];

  // র্যান্ডম অর্ডার
  const shuffled = sources.sort(() => 0.5 - Math.random());

  // ৭টি এপিআইয়ের ভেতর যেকোনো একটি সাকসেসফুল হওয়া পর্যন্ত ট্রাই করবে
  for (const fetchSource of shuffled) {
    try {
      const data = await fetchSource();
      return res.json(data);
    } catch (e) {
      // একটি এপিআই কাজ না করলে পরেরটিতে স্কিপ করবে
    }
  }

  // যদি কোনো কারণে ৭টি এপিআইই একসাথে ফেল মারে
  return res.status(503).json({ error: 'এখনই অন্য কোনো API থেকে কন্টেন্ট ফেচ করা যাচ্ছে না।' });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
