"use client";

import { ExtendedPost } from "@/types/db";
import React, { FC, useEffect, useRef } from "react";
import { useIntersection } from "@mantine/hooks";
import { useInfiniteQuery } from "@tanstack/react-query";
import { INFINITE_SCROLLLING_PAGINATION_RESULTS } from "@/config";
import axios from "axios";
import { useSession } from "next-auth/react";
import Post from "./Post";
import { Loader2 } from "lucide-react";

interface PostFeedProps {
  subredditName?: string;
  initalPosts: ExtendedPost[];
}
const PostFeed: FC<PostFeedProps> = ({ subredditName, initalPosts }) => {
  const lastPostRef = useRef<HTMLElement>(null);
  const { ref, entry } = useIntersection({
    root: lastPostRef.current,
    threshold: 1,
  });
  const { data: session } = useSession();

  const { data, fetchNextPage, isFetchingNextPage } = useInfiniteQuery(
    ["infinite-query"],
    async ({ pageParam = 1 }) => {
      const query =
        `/api/posts?limit=${INFINITE_SCROLLLING_PAGINATION_RESULTS}&page=${pageParam}` +
        (!!subredditName ? `&subredditName=${subredditName}` : "");

      const { data } = await axios.get(query);
      return data as ExtendedPost[];
    },
    {
      getNextPageParam: (lastPage, pages) => {
        return pages.length + 1;
      },
      initialData: {
        pages: [initalPosts],
        pageParams: [1],
      },
    }
  );

  useEffect(() => {
    if (entry?.isIntersecting) {
      fetchNextPage()
    }
  }, [entry, fetchNextPage])

  const posts = data?.pages.flatMap((page) => page) ?? initalPosts;
  return (
    <ul className="flex flex-col col-span-2 space-y-6">
      {posts?.map((post, index) => {
        const votesAmt = post?.votes.reduce((acc, vote) => {
          if (vote.type === "DOWN") return acc - 1;
          if (vote.type === "UP") return acc + 1;
          return acc;
        }, 0);

        const currentVote = post?.votes.find(
          (vote) => vote.userId === session?.user.id
        );

        const commentAmt = post?.comments.length;

        if (index === posts.length - 1) {
          return (
            <li key={post?.id} ref={ref}>
              <Post
                post={post}
                subredditName={post.subreddit.name}
                votesAmt={votesAmt}
                currentVote={currentVote}
                commentAmt={commentAmt}
              />
            </li>
          );
        } else {
          return (
            <Post
              key={post.id}
              post={post}
              subredditName={post.subreddit.name}
              votesAmt={votesAmt}
              currentVote={currentVote}
              commentAmt={commentAmt}
            />
          );
        }
      })}

      {isFetchingNextPage && (
        <li className='flex justify-center'>
          <Loader2 className='w-6 h-6 text-zinc-500 animate-spin' />
        </li>
      )}
    </ul>
  );
};

export default PostFeed;
