# This is a Proof Of Concept (POC) Sales-Assistant bot created with Next js, Tailwind-css, Langchain, Vercel AI SDK & OpenAI API

## Introduction

The digital commerce landscape demands intelligent systems that enhance customer engagement by offering seamless, interactive, and personalized experiences. This project leverages Next.js, Tailwind CSS, and MongoDB for a robust front-end and back-end setup, coupled with LangChain, OpenAI API, and Vercel AI SDK to create an AI-driven sales assistant bot. The bot answers product-related queries, provides recommendations, and guides users through the sales process with precision and efficiency.

## Table of Contents

1. **Design Phase**
   - Solution Architecture
   - Prompt Engineering
     
2. **Implementation Phase**
   - Prototype Development
   - Integration with external data

3. **Testing Phase**
   - Test cases for validation
  
4. **Analysis Phase**  
   - Bot Performance Evaluation  
   - Bot Limitations and Areas for Improvement
  
5. **Conclusion**  
    - Summary of Achievements  
    - Future Directions for Scalability and Improvement
  
## 1. Design Phase  

![Design Process](public/images/Neexa%20design.drawio.png)  

The design process consists of the following steps:

1. **Dataset Preparation**:  
   A CSV file containing product data from Costco's online marketplace is used as the dataset find it here [Dataset](). It includes 19 sub-categories, with each product having attributes    such as price, ratings, discounts, title, features, and product descriptions.
   - This dataset is embedded into **Pinecone**, a vector database, using the **OpenAI text-embedding model** for efficient similarity search.  

2. **Query Handling**:  
   When a user sends a query:  
   - If the query does not require additional context (e.g., "Hey"), it is directly combined with the prompt and sent to the **LLM** (Large Language Model), which generates a response.  
   - If the query requires contextual data from the Costco dataset (e.g., "What products do you have?"), the query is embedded and a similarity search is performed in the vector database 
     to retrieve relevant information.  

3. **Generating the Output**:  
   The relevant information retrieved from the similarity search is combined with the user query and prompt. This enriched data is then sent to the **LLM**, which generates the desired      output for the user.  

This design ensures the bot can handle both general and context-specific queries effectively, leveraging the power of embeddings and similarity search for precise responses.

