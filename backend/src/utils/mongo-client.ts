import { MongoClient, ServerApiVersion } from "mongodb";
import { env } from "./env";
import { is } from "zod/v4/locales";

const URI = env.MONGODB_ATLAS_URI;
const DB = env.MONGODB_NAME;
let isConnected: boolean = false;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export const mongoClient = new MongoClient(URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export async function connectDb() {
  if (isConnected) return mongoClient;
  try {
    // Connect the mongoClient to the server	(optional starting in v4.7)
    await mongoClient.connect();
    isConnected = true;
    // Send a ping to confirm a successful connection
    await mongoClient.db(DB).command({ ping: 1 });
    console.log("You successfully connected to MongoDB!");
  } catch (e) {
    console.error((e as Error).message ?? "Error connecting to mongodb");
  }
}

export async function closeDbConnection(mongoClient: MongoClient) {
  await mongoClient.close();
}
