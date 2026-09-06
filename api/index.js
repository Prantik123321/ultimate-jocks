const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Helper: Google Translate (80% chance)
async function translateToBangla(text) {
    if (!text || Math.random() >= 0.8) return text;
    try {
        const url = 'https://translate.googleapis.com/translate_a/single';
        const response = await axios.get(url, {
            params: {
                client: 'gtx',
                sl: 'en',
                tl: 'bn',
                dt: 't',
                q: text
            },
            timeout: 3000
        });
        if (response.data && response.data[0]) {
            return response.data[0].map(t => t[0]).join('');
        }
        return text;
    } catch (e) {
        return text;
    }
}

// Enhanced API Sources with better jokes
const sources = [
    // Reddit Memes
    async () => {
        const subreddits = ['funny', 'dankmemes', 'memes', 'jokes', 'bangladesh_meme'];
        const sub = subreddits[Math.floor(Math.random() * subreddits.length)];
        const response = await axios.get(`https://www.reddit.com/r/${sub}/random.json`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MemeApp/1.0)' },
            timeout: 4000
        });
        const post = response.data[0]?.data?.children[0]?.data;
        if (post && (post.url?.match(/\.(jpg|jpeg|png|gif)$/i))) {
            return { type: 'image', content: post.url };
        }
        throw new Error('No image found');
    },
    // Giphy with funny tags
    async () => {
        const tags = ['funny', 'hilarious', 'lol', 'comedy', 'joke', 'crazy', 'silly', 'fail'];
        const tag = tags[Math.floor(Math.random() * tags.length)];
        const response = await axios.get('https://api.giphy.com/v1/gifs/random', {
            params: {
                api_key: 'dc6zaTOxFJmzC',
                tag: tag,
                rating: 'g'
            },
            timeout: 4000
        });
        const url = response.data?.data?.images?.original?.url;
        if (url) return { type: 'image', content: url };
        throw new Error('No GIF found');
    },
    // Official Joke API - Best jokes
    async () => {
        const response = await axios.get('https://official-joke-api.appspot.com/random_joke', {
            timeout: 4000
        });
        const joke = response.data;
        if (joke.setup && joke.punchline) {
            const setup = await translateToBangla(joke.setup);
            const punchline = await translateToBangla(joke.punchline);
            return { type: 'text', content: { setup, delivery: punchline } };
        }
        throw new Error('No joke found');
    },
    // JokeAPI v2 - Multiple categories
    async () => {
        const categories = ['Programming', 'Misc', 'Dark', 'Pun', 'Spooky', 'Christmas'];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const response = await axios.get('https://v2.jokeapi.dev/joke/' + category, {
            params: { 
                format: 'json', 
                type: 'twopart',
                safe: 'true'
            },
            timeout: 4000
        });
        const joke = response.data;
        if (joke.setup && joke.delivery) {
            const setup = await translateToBangla(joke.setup);
            const delivery = await translateToBangla(joke.delivery);
            return { type: 'text', content: { setup, delivery } };
        }
        throw new Error('No joke found');
    },
    // Dad Jokes - Super funny
    async () => {
        const response = await axios.get('https://icanhazdadjoke.com/', {
            headers: { 'Accept': 'application/json' },
            timeout: 4000
        });
        const joke = response.data;
        if (joke.joke) {
            const translated = await translateToBangla(joke.joke);
            return { type: 'text', content: translated };
        }
        throw new Error('No joke found');
    },
    // Programming Jokes
    async () => {
        const response = await axios.get('https://programming-jokes.com/api/v1/jokes/random', {
            timeout: 4000
        });
        const joke = response.data;
        if (joke.question && joke.answer) {
            const question = await translateToBangla(joke.question);
            const answer = await translateToBangla(joke.answer);
            return { type: 'text', content: { setup: question, delivery: answer } };
        }
        throw new Error('No joke found');
    },
    // Meme-API
    async () => {
        const response = await axios.get('https://meme-api.com/gimme', {
            timeout: 4000
        });
        const meme = response.data;
        if (meme.url && meme.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return { type: 'image', content: meme.url };
        }
        throw new Error('No meme found');
    },
    // Extra: Random Joke API
    async () => {
        const response = await axios.get('https://v2.jokeapi.dev/joke/Any', {
            params: { 
                format: 'json',
                type: 'twopart',
                safe: 'true'
            },
            timeout: 4000
        });
        const joke = response.data;
        if (joke.setup && joke.delivery) {
            const setup = await translateToBangla(joke.setup);
            const delivery = await translateToBangla(joke.delivery);
            return { type: 'text', content: { setup, delivery } };
        }
        throw new Error('No joke found');
    }
];

// Shuffle array
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// API endpoint
app.get('/api/joke', async (req, res) => {
    const shuffled = shuffleArray([...sources]);
    
    for (const source of shuffled) {
        try {
            const result = await source();
            if (result) {
                return res.json(result);
            }
        } catch (error) {
            console.warn('API source failed:', error.message);
            continue;
        }
    }
    
    // Fallback if all sources fail
    res.status(503).json({
        type: 'text',
        content: 'ক্ষমা করবেন, এখনই কোনো কন্টেন্ট পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

module.exports = app;
