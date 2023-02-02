export interface IPost {
  type: string;
  media: string;
  author: string;
  source: string;
}

export interface ISubmission {
  kind: string;
  data: {
    is_gallery?: boolean;
    post_hint?: string;
    url: string;
    author: string;
    permalink: string;
  };
}
