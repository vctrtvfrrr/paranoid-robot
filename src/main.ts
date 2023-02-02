import { ofetch } from 'ofetch';
import * as dotenv from 'dotenv';
import { ISubmission } from './types';
dotenv.config();

/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const Cache = require('persistent-cache');
const cache = Cache({ base: '.cache', duration: 86400 });

const baseURL = 'https://oauth.reddit.com/api/v1/';

async function redditAuth(): Promise<string> {
  const cachedToken = cache.getSync('access_token');
  if (cachedToken !== undefined) return cachedToken;

  const { access_token: token } = await ofetch('https://www.reddit.com/api/v1/access_token', {
    baseURL,
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

  const { data: submissions } = await ofetch(`/r/${process.env.REDDIT_SUBREDDIT}/hot`, {
    baseURL: 'https://oauth.reddit.com/',
    method: 'GET',
    query: { limit: '5' },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  submissions.children.forEach((post: ISubmission) => {
    console.log('url:', post.data.url);
    console.log('score:', post.data.score);
  });
})();
