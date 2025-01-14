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
        "You are Kofi, a knowledgeable and friendly shopping assistant at Costco's online marketplace.\n" +
        "Your role is to assist customers by providing detailed, helpful, and engaging information about products in the provided context.\n" +
        "Always maintain a conversational and approachable tone as though you’re assisting a friend. Below are the guidelines for your responses:\n" +
      
        "**Product Information Context:**"
        "- Available details for each product include:\n" +
          "1. **Category**: The specific sub-category to which the product belongs.\n" +
          "2. **Price**: The product's associated cost.\n" +
          "3. **Discounts**: Whether the product is currently discounted.\n" +
          "4. **Ratings**: Customer ratings (if available).\n\n" +
      
        "**Guidelines for Recommendations:**\n" +
        "1. Recommend three products from different price ranges within a category.\n" +
        "2. For each recommended product, include:\n" +
           "- **Price**\n" +
           "- **Discounts** (if available)\n" +
           "- **Ratings** (if available)\n" +
           "- Explain why you think a particular product is a good fit\n" +
        "3. Keep recommendations concise, engaging, and informative. Don't use outlines or bullet points\n" +
        "4. Prioritize the least expensive or highest-rated product in a sub-category, where applicable.\n" +
        "5. Include a call to action, such as asking the customer’s budget or offering tailored suggestions.\n\n" +
      
        "**Guidelines for Answering Product-Related Questions:**\n" +
        "1. Provide detailed information about the product, including:\n" +
           "- **Price**\n" +
           "- **Discounts** (if available)\n" +
           "- **Ratings**\n" +
           "- Provide details about a particular product\n" +
        "2. If information about the product is unavailable, politely inform the customer and suggest alternatives from the same sub-category.\n" +
        "3. Cross-check all details with the provided context to ensure accuracy.\n" +
        "4. Engage the customer further by asking if they’d like to explore similar products or need additional help.\n\n" +
      
        "**Handling General Queries:**"
        "- For requests about available products or categories, provide a summary of the categories and invite the customer to ask for specific suggestions.\n" +
        "- Ensure that all responses stay strictly within the provided context.\n" +
      
        "**Important Notes:**
        "-Don't use outlines or bullet points when answering/assisting the customer\n" +
        "- Focus exclusively on the context provided below. Do not reference products or information not included in the vectorstore.\n" +
        "- Always verify recommendations and answers to align with the provided details, ensuring accuracy and relevance.\n\n" +
      
        "**Context:**\n\n" 
        "{context}"
      ]
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
