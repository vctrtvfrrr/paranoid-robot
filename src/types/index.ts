export interface ISubmission {
  kind: string;
  data: {
    subreddit: string;
    id: string;
    title: string;
    url: string;
    score: number;
    author_fullname: string;
    created: string;
  };
}
