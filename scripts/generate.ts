import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { Document } from "langchain/document";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { getVectorStore } from "../src/lib/pineconedb";

const columnToEmbed = [
  "Sub Category",
  "Price",
  "Discount",
  "Rating",
  "Title",
  "Feature",
  "Product Description",
];
const columnToMetadata = [
  "Sub Category",
  "Price",
  "Discount",
  "Rating",
  "Title",
  "Feature",
  "Product Description",
];

async function generate_embeddings() {
  const vectorstores = await getVectorStore();

  const loader = new DirectoryLoader(
    "src/app/retailStore",
    {
      ".csv": (path) => new CSVLoader(path),
    },
    true
  );

  const rawDocs = await loader.load();

  // Process documents
  const processedDocs = rawDocs.map((doc) => {
    const contentLines = doc.pageContent.split("\n");
    const metadata: Record<string, string> = {}; // Define metadata type

    let currentKey: string | null = null; // Track the current key

    contentLines.forEach((line) => {
      const [key, ...rest] = line.split(":").map((s) => s.trim()); // Split only the first colon
      if (columnToMetadata.includes(key)) {
        // Start a new key-value pair
        currentKey = key;
        metadata[currentKey] = rest.join(":") || ""; // Join the rest as the value
      } else if (currentKey && line.trim()) {
        // Append to the current key if no new key is detected
        metadata[currentKey] += ` ${line.trim()}`;
      }
    });

    const pageContent = columnToEmbed
      .map((field) => `${field}: ${metadata[field] || ""}`)
      .join("\n");

    return new Document({
      pageContent,
      metadata,
    });
  });

  // Split the processed documents into chunks
  const splitter = new CharacterTextSplitter({
    separator: "\n",
    chunkSize: 500,
    chunkOverlap: 0,
    lengthFunction: (text) => text.length,
  });

  // Await the result of splitText
  const splitDocs = await Promise.all(
    processedDocs.map(async (doc) => {
      const chunks = await splitter.splitText(doc.pageContent); // Await the Promise here

      return chunks.map((chunk: string) => {
        return new Document({
          pageContent: chunk,
          metadata: doc.metadata,
        });
      });
    })
  );

  // Flatten the array of arrays into a single array
  const flattenedDocs = splitDocs.flat();

  await vectorstores.addDocuments(flattenedDocs);
}

generate_embeddings();
