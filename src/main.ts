import { ofetch } from 'ofetch';
import TelegramBot from 'node-telegram-bot-api';
import { IPost, ISubmission } from './types';
import * as dotenv from 'dotenv';
dotenv.config();

/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const Cache = require('persistent-cache');
const cache = Cache({ base: '.cache', duration: 86400 });

async function redditAuth(): Promise<string> {
  const cachedToken = cache.getSync('access_token');
  if (cachedToken !== undefined) return cachedToken;

  const { access_token: token } = await ofetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    query: {
      grant_type: 'password',
      username: process.env.REDDIT_USER,
      password: process.env.REDDIT_PASS
    },
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(process.env.REDDIT_CLIENT_ID + ':' + process.env.REDDIT_SECRET_TOKEN).toString(
          'base64'
        )
    }
  });

  cache.putSync('access_token', token);

  return token;
}

(async function () {
  const token = await redditAuth();

  const { data: submissions } = await ofetch(
    `https://oauth.reddit.com/r/${process.env.REDDIT_SUBREDDIT}/hot`,
    {
      method: 'GET',
      query: { limit: '10' },
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const posts: Array<IPost> = [];

  submissions.children.forEach((post: ISubmission) => {
    const { data } = post;

    if (data?.is_gallery || data?.post_hint !== 'image') {
      console.error('Tipo de post não suportado');
      return;
    }

    if (data.url === undefined) {
      console.error('Post sem URL');
      return;
    }

    let type;
    switch (getUrlExtension(data.url)) {
      case 'jpg':
      case 'jpeg':
        type = 'image/jpeg';
        break;

      case 'png':
        type = 'image/png';
        break;

      case 'gif':
        type = 'image/gif';
        break;

      default:
        console.error('Tipo de mídia não suportada');
        return;
    }

    posts.push({
      type,
      media: data.url,
      author: `https://reddit.com/u/${data.author}`,
      source: `https://reddit.com${data.permalink}`
    });
  });

  if (process.env.TELEGRAM_API_TOKEN === undefined || process.env.TELEGRAM_CHAT_ID === undefined)
    process.exit(1);

  const apiToken = process.env.TELEGRAM_API_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const bot = new TelegramBot(apiToken, { polling: true });

  for (const post of posts) {
    const method = post.type === 'image/gif' ? 'sendDocument' : 'sendPhoto';

    try {
      await bot[method](chatId, post.media, {
        caption: `[Profile](${post.author}) · [Source](${post.source}) ${chatId}`,
        parse_mode: 'MarkdownV2'
      });
    } catch (err: any) {
      console.error(err.response);
      console.log(err.constructor.name);
    }
  }

  process.exit();
})();

function getUrlExtension(url: string): string {
  const urlParts: Array<string> = url.split(/[#?]/);
  if (urlParts.length === 0) return '';

  const queryParts: Array<string> = urlParts[0].split('.');
  if (urlParts.length === 0) return '';

  const extension = queryParts.pop();
  if (extension === undefined) return '';

  return extension.trim();
}
