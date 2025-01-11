import { ChatOpenAI } from "@langchain/openai";
import { LangChainAdapter, Message as VercelChatMessage } from "ai";
import { NextResponse } from "next/server";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { getVectorStore } from "@/lib/pineconedb";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { RunnableSequence } from "@langchain/core/runnables";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { UpstashRedisCache } from "@langchain/community/caches/upstash_redis";
import { Redis } from "@upstash/redis";

export async function POST(req: Request) {
  try {
    console.log("Starting POST request handler");

    const { messages } = await req.json();
    console.log("Received messages:", messages);

    const cache = new UpstashRedisCache({
      client: Redis.fromEnv(),
    });

    const chatHistory = messages
      .slice(0, -1)
      .map((m: VercelChatMessage) =>
        m.role === "user"
          ? new HumanMessage(m.content)
          : new AIMessage(m.content)
      );

    const currentMessageContent = messages[messages.length - 1].content;
    console.log("Current message content:", currentMessageContent);

    const chatModel = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
      streaming: true,
      cache,
    });
    console.log("Initialized chat model");

    const rephraseChatModel = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
      cache,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are Kofi, a virtual shopping assistant for Costco's online shopping center. " +
        "Your role is to assist customers with product-related queries, offer personalized recommendations, " +
        "and help them find exactly what they need. Stick to the provided context when answering queries. If the question falls outside the context, politely redirect the user to relevant queries.\n\n" +
        "Costco's product categories include: bakery & desserts, beverages & water, breakfast, candy, cleaning supplies, coffee, deli, floral, gift baskets, household items, " +
        "Kirkland signature grocery, laundry detergent & supplies, meat & seafood, organic products, pantry & dry goods, paper & plastic products, poultry, seafood, and snacks.\n\n" +
        "Context provided includes details like:\n" +
        "- Sub-categories\n" +
        "- Prices\n" +
        "- Discounts\n" +
        "- Ratings\n" +
        "- Reviews\n" +
        "- Features\n" +
        "- Product descriptions\n\n" +
        "Customers at Costco belong to these types:\n" +
         "1. **Bargain Hunters:** Always looking for deals and the best prices.\n" +
         "2. **Loyal Customers:** Regular buyers who trust the brand.\n" +
         "3. **Need-Based Buyers:** Purpose-driven shoppers making quick purchases.\n" +
         "4. **Research-Oriented Shoppers:** Compare products and reviews before deciding.\n" +
         "5. **First-Time Shoppers:** New visitors looking for reviews and trust-building offers.\n\n" +
        "When crafting your responses:\n" +
          "- Provide at least three breakfast options across different price ranges: low, mid, and high.\n" +
          "- Include the following for each product:\n" +
            "- **Price**\n" +
            "- **Ratings** (out of 5, based on reviews)\n" +
            "- **Key features**\n" +
            "- **Discounts**, if available\n" +
            "- **Relevant reviews**\n" +
          "- Use a casual and friendly tone, as if recommending options to a friend.\n" +
          "- Always ensure the response feels natural and engaging, providing detailed information without sounding overly structured.\n\n" +
        "Ask the customer for their budget to refine recommendations further and offer further assistance in user friendly way.\n\n" +
        "Focus strictly on the context provided below:\n\n" +
        "Context:\n{context}",
      ],
      ["user", "{input}"],
    ]);

    const rephrasePrompt = ChatPromptTemplate.fromMessages([
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
      [
        "user",
        "Based on the above conversation, craft a precise search query to retrieve relevant information from the vectorstore for the current question. " +
          "Include all necessary keywords and avoid omitting critical details. Return only the query, with no additional text.",
      ],
    ]);

    const combineDocsChain = await createStuffDocumentsChain({
      llm: chatModel,
      prompt,
    });
    console.log("Created combine docs chain");

    const retriever = (await getVectorStore()).asRetriever();
    console.log("Initialized retriever");

    const historyAwareRetrievalChain = await createHistoryAwareRetriever({
      llm: rephraseChatModel,
      retriever,
      rephrasePrompt,
    });

    const retrialChain = await createRetrievalChain({
      retriever: historyAwareRetrievalChain,
      combineDocsChain,
    });
    console.log("Created retrieval chain");

    // Create a new runnable that extracts just the answer
    const chain = RunnableSequence.from([
      retrialChain,
      (output) => {
        console.log("Chain output:", output);
        return { content: output.answer };
      },
    ]);

    const stream = await chain.stream({
      input: currentMessageContent,
      chat_history: chatHistory,
    });
    console.log("Generated stream");

    return LangChainAdapter.toDataStreamResponse(stream);
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
