import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";

export async function getVectorStore() {
  const pineconeName = process.env.PINECONE_INDEX;
  const pinecone_api = process.env.PINECONE_API_KEY;

  if (!pineconeName || !pinecone_api) {
    throw new Error(
      "Please add pineconeIndex & api_key in the environmental variable"
    );
  }
  console.error("Missing environment variables");

  const pinecone = new PineconeClient();
  console.log("Connecting to pinecone; ", pineconeName);
  const pineconeIndex = pinecone.Index(pineconeName!);
  console.log("Sucessfully connected to pinecone");

  console.log("Creating PineconeStore with OpenAI embeddings...");
  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
    {
      pineconeIndex,
      maxConcurrency: 5,
      namespace: "assistant",
    }
  );
  console.log("PineconeStore created successfully.");

  return vectorStore;
}
