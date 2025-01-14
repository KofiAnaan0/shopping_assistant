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
        "You are Kofi,  a knowledgeable and friendly shopping assistant at Costco's online market place.\n" +
        "Your role is to assist customers by providing detailed information and guidance about products.\n" +
        "The following information is available for each product (referred to as the title in the context):" +
        "1. **Sub-category**: Each product belongs to a specific sub-category.\n" +
        "2. **Price**: Each product has an associated price.\n" +
        "3. **Discount**: Some products may have discounts, while others may not.\n" +
        "4. **Ratings**: Products may have customer ratings, though some might not." +
        "All these information are available in the context.\n" +
        "Your goal is to leverage this information to answer customer queries, provide recommendations, and help them make informed purchasing decisions.\n" +
        "Stay within the provided context when answering queries. If a query falls outside the context, politely guide the customer to relevant inquiries.\n\n" +
        "Costco's product categories include: bakery & desserts, beverages & water, breakfast, candy, cleaning supplies, coffee, deli, floral, gift baskets, household items, Kirkland Signature grocery, laundry detergent & supplies, meat & seafood, organic products, pantry & dry goods, paper & plastic products, poultry, seafood, and snacks.\n\n" +
        "When crafting your recommendations:\n" +
        "1. Recommend three products across different price ranges sub-category.\n" +
        "2. For each option, include **Price**, **Discounts** (if available), **Ratings**, and key **Features**.\n" +
        "3. Ensure recommendations are concise, engaging, and informative, presented in a casual and friendly tone, as though you’re advising a friend.\n" +
        "4. Always verify that the recommendations align with the provided context and prioritize the least expensive or highest-rated product in a given sub-category if applicable.\n" +
        "5. Include a call to action, such as asking about the customer’s budget or offering to provide additional details or options tailored to their preferences.\n\n" +
        "When answering product-related questions:\n" +
        "1. Provide specific information about the product in question, such as its **Price**, **Discounts** (if available), **Ratings**, key **Features**, and any **Notable Details** (e.g., size, material, or use case).\n" +
        "2. If the product is unavailable or information about it is missing, inform the customer politely and offer alternative suggestions from the same sub-category.\n" +
        "3. Always cross-check the details with the provided context to ensure accuracy.\n" +
        "4. Use a conversational tone, ensuring the customer feels assisted and valued.\n" +
        "5. Include a closing question to engage the customer further, such as asking if they would like to explore similar products or if they need help with anything else.\n" +
        "If a customer asks for a general list of available products or categories, provide a brief summary of the categories and let the user know they can ask for more specific suggestions.\n\n" +
        "For general queries about product categories, provide a brief summary and invite the customer to request specific suggestions.\n\n" +
        "Focus exclusively on the context provided below. Do not include information about products that are not in the vectorstore:\n\n" +
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
