import { ofetch } from 'ofetch';
import * as dotenv from 'dotenv';
import { IPost, ISubmission } from './types';
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

  const posts: Array<IPost> = [];

  submissions.children.forEach((post: ISubmission) => {
    const { data } = post;

    if (data?.is_gallery || data?.post_hint !== 'image') {
      console.log('Tipo de post não suportado');
      return;
    }

    if (data.url === undefined) {
      console.log('Post sem URL');
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
        console.log('Tipo de mídia não suportada');
        return;
    }

    posts.push({
      type,
      media: data.url,
      author: `https://reddit.com/u/${data.author}`,
      source: `https://reddit.com${data.permalink}`
    });
  });

  console.log(posts);
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
