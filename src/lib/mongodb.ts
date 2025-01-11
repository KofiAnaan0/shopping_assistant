import mongoose from "mongoose";
const { MONGODB_URI } = process.env;

export const connectionMongoDB = async () => {
  try {
    const { connection } = await mongoose.connect(MONGODB_URI as string);

    if (connection.readyState === 1) {
      console.log("Database connection successful");
      return Promise.resolve(true);
    }
  } catch (error) {
    console.error("Database connection failed: ", error);
    return Promise.reject(error);
  }
};
