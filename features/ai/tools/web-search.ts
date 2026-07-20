import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);

export const webSearch = tool({
  description:
    "Search the web for current, up-to-date information. Use this when the user asks about recent events, news, or anything you may not know.",
  inputSchema: z.object({
    query: z.string().min(1).describe("The search query to look up on the web"),
  }),
  execute: async ({ query }) => {
    const { results } = await exa.search(query, {
      numResults: 5,
      contents: {
        text: { maxCharacters: 1000 },
        livecrawl: "always",
      },
    });

    return results.map((r) => ({
      title: r.title,
      url: r.url,
      publishedDate: r.publishedDate,
      content: r.text,
    }));
  },
});
