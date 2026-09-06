```js
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

const TIMEOUT = 7000;
const recentItems = new Set();
const MAX_CACHE = 300;

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || "";

function remember(value) {
    if (!value) return;

    const key = String(value).toLowerCase().trim();

    recentItems.add(key);

    if (recentItems.size > MAX_CACHE) {
        const first = recentItems.values().next().value;
        recentItems.delete(first);
    }
}

function seen(value) {
    if (!value) return false;

    return recentItems.has(
        String(value).toLowerCase().trim()
    );
}

async function request(url, options = {}) {
    return axios.get(url, {
        timeout: TIMEOUT,
        ...options
    });
}

/* =====================================================
   TRANSLATE ENGLISH -> BANGLA
===================================================== */

async function translate(text) {
    if (!text || typeof text !== "string") {
        return text;
    }

    // Already Bangla
    if (/[\u0980-\u09FF]/.test(text)) {
        return text;
    }

    try {
        const response = await request(
            "https://translate.googleapis.com/translate_a/single",
            {
                params: {
                    client: "gtx",
                    sl: "auto",
                    tl: "bn",
                    dt: "t",
                    q: text
                }
            }
        );

        const data = response.data?.[0];

        if (!Array.isArray(data)) {
            return text;
        }

        const result = data
            .map(item => item?.[0] || "")
            .join("");

        return result || text;

    } catch {
        return text;
    }
}

/* =====================================================
   TEXT JOKE
===================================================== */

async function makeJoke(setup, delivery, source) {

    if (!setup || !delivery) {
        throw new Error("Invalid joke");
    }

    const original =
        `${setup} ${delivery}`.trim();

    if (
        original.length < 10 ||
        original.length > 1500
    ) {
        throw new Error("Bad joke length");
    }

    if (seen(original)) {
        throw new Error("Duplicate joke");
    }

    const banglaSetup =
        await translate(setup);

    const banglaDelivery =
        await translate(delivery);

    remember(original);

    return {
        type: "text",

        content: {
            setup: banglaSetup,
            delivery: banglaDelivery
        },

        meta: {
            source
        }
    };
}

/* =====================================================
   JOKE API
===================================================== */

async function jokeAPI() {

    const response = await request(
        "https://v2.jokeapi.dev/joke/Misc,Programming,Pun",
        {
            params: {
                type: "twopart",
                safeMode: "true",
                blacklistFlags:
                    "nsfw,religious,political,racist,sexist,explicit"
            }
        }
    );

    const joke = response.data;

    if (
        joke?.type === "twopart" &&
        joke.setup &&
        joke.delivery
    ) {
        return makeJoke(
            joke.setup,
            joke.delivery,
            "JokeAPI"
        );
    }

    throw new Error("No JokeAPI joke");
}

/* =====================================================
   OFFICIAL JOKE API
===================================================== */

async function officialJoke() {

    const response = await request(
        "https://official-joke-api.appspot.com/random_joke"
    );

    const joke = response.data;

    if (
        joke?.setup &&
        joke?.punchline
    ) {
        return makeJoke(
            joke.setup,
            joke.punchline,
            "Official Joke API"
        );
    }

    throw new Error("No official joke");
}

/* =====================================================
   ICANHAZDADJOKE
===================================================== */

async function dadJoke() {

    const response = await request(
        "https://icanhazdadjoke.com/",
        {
            headers: {
                Accept: "application/json",
                "User-Agent":
                    "FunnyBanglaApp/1.0"
            }
        }
    );

    const joke = response.data?.joke;

    if (!joke) {
        throw new Error("No dad joke");
    }

    if (seen(joke)) {
        throw new Error("Duplicate joke");
    }

    const translated =
        await translate(joke);

    remember(joke);

    return {
        type: "text",

        content: translated,

        meta: {
            source: "iCanHazDadJoke"
        }
    };
}

/* =====================================================
   CHUCK NORRIS
===================================================== */

async function chuckJoke() {

    const response = await request(
        "https://api.chucknorris.io/jokes/random"
    );

    const joke = response.data?.value;

    if (!joke) {
        throw new Error("No Chuck joke");
    }

    if (seen(joke)) {
        throw new Error("Duplicate joke");
    }

    const translated =
        await translate(joke);

    remember(joke);

    return {
        type: "text",

        content: translated,

        meta: {
            source: "Chuck Norris API"
        }
    };
}

/* =====================================================
   MEME API
===================================================== */

async function memeAPI() {

    const response = await request(
        "https://meme-api.com/gimme/memes"
    );

    const meme = response.data;

    if (
        !meme?.url ||
        meme.nsfw ||
        meme.spoiler
    ) {
        throw new Error("Invalid meme");
    }

    if (seen(meme.url)) {
        throw new Error("Duplicate meme");
    }

    remember(meme.url);

    return {
        type: "image",
        content: meme.url,

        meta: {
            source: "Meme API",
            title: meme.title || "",
            subreddit: meme.subreddit || ""
        }
    };
}

/* =====================================================
   WHOLESOME MEME
===================================================== */

async function wholesomeMeme() {

    const response = await request(
        "https://meme-api.com/gimme/wholesomememes"
    );

    const meme = response.data;

    if (
        !meme?.url ||
        meme.nsfw ||
        meme.spoiler
    ) {
        throw new Error("Invalid wholesome meme");
    }

    if (seen(meme.url)) {
        throw new Error("Duplicate meme");
    }

    remember(meme.url);

    return {
        type: "image",
        content: meme.url,

        meta: {
            source: "Meme API",
            title: meme.title || "",
            subreddit: meme.subreddit || ""
        }
    };
}

/* =====================================================
   REDDIT IMAGE
===================================================== */

async function redditMeme() {

    const subs = [
        "memes",
        "funny",
        "wholesomememes",
        "dankmemes"
    ];

    const sub =
        subs[
            Math.floor(
                Math.random() * subs.length
            )
        ];

    const response = await request(
        `https://www.reddit.com/r/${sub}/hot.json`,
        {
            params: {
                limit: 50
            },
            headers: {
                "User-Agent":
                    "FunnyBanglaApp/1.0"
            }
        }
    );

    const posts =
        response.data?.data?.children || [];

    const shuffled =
        [...posts].sort(
            () => Math.random() - 0.5
        );

    for (const item of shuffled) {

        const post = item.data;

        if (
            !post ||
            post.over_18 ||
            post.spoiler
        ) {
            continue;
        }

        const url = post.url;

        if (
            !url ||
            !/\.(jpg|jpeg|png|gif|webp)$/i.test(url)
        ) {
            continue;
        }

        if (seen(url)) {
            continue;
        }

        remember(url);

        return {
            type: "image",
            content: url,

            meta: {
                source: "Reddit",
                title: post.title || "",
                subreddit: sub
            }
        };
    }

    throw new Error("No Reddit image");
}

/* =====================================================
   GIPHY SEARCH
===================================================== */

async function giphySearch() {

    if (!GIPHY_API_KEY) {
        throw new Error("GIPHY API key missing");
    }

    const queries = [
        "funny reaction",
        "laughing",
        "hilarious",
        "funny meme",
        "comedy reaction",
        "lol reaction"
    ];

    const query =
        queries[
            Math.floor(
                Math.random() * queries.length
            )
        ];

    const response = await request(
        "https://api.giphy.com/v1/gifs/search",
        {
            params: {
                api_key: GIPHY_API_KEY,
                q: query,
                limit: 30,
                rating: "g",
                lang: "en"
            }
        }
    );

    const gifs =
        response.data?.data || [];

    if (!gifs.length) {
        throw new Error("No GIF");
    }

    const shuffled =
        [...gifs].sort(
            () => Math.random() - 0.5
        );

    for (const gif of shuffled) {

        const url =
            gif.images?.original?.url;

        if (!url) continue;

        if (seen(url)) continue;

        remember(url);

        return {
            type: "image",
            content: url,

            meta: {
                source: "GIPHY",
                kind: "gif",
                title: gif.title || ""
            }
        };
    }

    throw new Error("No unique GIF");
}

/* =====================================================
   GIPHY TRENDING
===================================================== */

async function giphyTrending() {

    if (!GIPHY_API_KEY) {
        throw new Error("GIPHY API key missing");
    }

    const response = await request(
        "https://api.giphy.com/v1/gifs/trending",
        {
            params: {
                api_key: GIPHY_API_KEY,
                limit: 30,
                rating: "g"
            }
        }
    );

    const gifs =
        response.data?.data || [];

    if (!gifs.length) {
        throw new Error("No trending GIF");
    }

    const shuffled =
        [...gifs].sort(
            () => Math.random() - 0.5
        );

    for (const gif of shuffled) {

        const url =
            gif.images?.original?.url;

        if (!url) continue;

        if (seen(url)) continue;

        remember(url);

        return {
            type: "image",
            content: url,

            meta: {
                source: "GIPHY",
                kind: "gif",
                title: gif.title || ""
            }
        };
    }

    throw new Error("No unique GIF");
}

/* =====================================================
   SOURCE POOL
===================================================== */

const sources = [
    {
        name: "JokeAPI",
        mode: "joke",
        fn: jokeAPI
    },

    {
        name: "Official Joke API",
        mode: "joke",
        fn: officialJoke
    },

    {
        name: "iCanHazDadJoke",
        mode: "joke",
        fn: dadJoke
    },

    {
        name: "Chuck Norris API",
        mode: "joke",
        fn: chuckJoke
    },

    {
        name: "Meme API",
        mode: "meme",
        fn: memeAPI
    },

    {
        name: "Wholesome Meme API",
        mode: "meme",
        fn: wholesomeMeme
    },

    {
        name: "Reddit",
        mode: "meme",
        fn: redditMeme
    },

    {
        name: "GIPHY Search",
        mode: "gif",
        fn: giphySearch
    },

    {
        name: "GIPHY Trending",
        mode: "gif",
        fn: giphyTrending
    }
];

/* =====================================================
   SHUFFLE
===================================================== */

function shuffle(array) {

    const arr = [...array];

    for (
        let i = arr.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [arr[i], arr[j]] =
            [arr[j], arr[i]];
    }

    return arr;
}

/* =====================================================
   API
===================================================== */

app.get("/api/joke", async (req, res) => {

    const requestedMode =
        String(req.query.mode || "all")
            .toLowerCase();

    const validModes = [
        "all",
        "joke",
        "meme",
        "gif"
    ];

    const mode =
        validModes.includes(requestedMode)
            ? requestedMode
            : "all";

    let available =
        sources.filter(source => {

            if (mode === "all") {
                return true;
            }

            return source.mode === mode;
        });

    available = shuffle(available);

    for (const source of available) {

        try {

            console.log(
                `Trying: ${source.name}`
            );

            const result =
                await source.fn();

            if (result) {

                return res.json(result);
            }

        } catch (error) {

            console.warn(
                `${source.name}: ${error.message}`
            );
        }
    }

    return res.status(503).json({

        type: "text",

        content: {
            setup:
                "😵 সব content API এখন ব্যস্ত।",

            delivery:
                "একটু পরে আবার চেষ্টা করো! 😂"
        },

        meta: {
            source: "Fallback"
        }
    });
});

/* =====================================================
   HEALTH
===================================================== */

app.get("/api/health", (req, res) => {

    res.json({
        status: "ok",
        uptime: Math.round(process.uptime()),
        sources: sources.length,
        cache: recentItems.size,
        giphyEnabled: Boolean(GIPHY_API_KEY),
        time: new Date().toISOString()
    });
});

module.exports = app;
```
