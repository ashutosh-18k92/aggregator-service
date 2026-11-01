import express, { Request, Response } from "express";
import axios from "axios";
import { Kafka, Producer } from "kafkajs";

const app = express();
const PORT = process.env.PORT || 3000;
const SERVICE_NAME = process.env.SERVICE_NAME || "aggregator";

// Service endpoints
const ROCK_SERVICE_URL = process.env.ROCK_SERVICE_URL || "http://localhost:3001";
const PAPER_SERVICE_URL = process.env.PAPER_SERVICE_URL || "http://localhost:3002";
const SCISSOR_SERVICE_URL = process.env.SCISSOR_SERVICE_URL || "http://localhost:3003";

// Kafka (Stage 7: event streaming) - optional, degrades gracefully when unset
const KAFKA_BROKERS = process.env.KAFKA_BROKERS;
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "game-events";
let producer: Producer | undefined;

if (KAFKA_BROKERS) {
  const kafka = new Kafka({
    clientId: SERVICE_NAME,
    brokers: KAFKA_BROKERS.split(","),
    retry: { retries: 3 },
  });
  producer = kafka.producer();
  producer
    .connect()
    .then(() => console.log(`[${new Date().toISOString()}] [${SERVICE_NAME}] Connected to Kafka: ${KAFKA_BROKERS}`))
    .catch((err) =>
      console.error(`[${new Date().toISOString()}] [${SERVICE_NAME}] Kafka connect failed:`, err.message),
    );
} else {
  console.log(`[${new Date().toISOString()}] [${SERVICE_NAME}] KAFKA_BROKERS not set, event publishing disabled`);
}

async function publishGameEvent(event: Record<string, unknown>): Promise<void> {
  if (!producer) return;
  try {
    await producer.send({
      topic: KAFKA_TOPIC,
      messages: [{ key: String(event.winner), value: JSON.stringify(event) }],
    });
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [${SERVICE_NAME}] Failed to publish game event:`, err.message);
  }
}

app.use(express.json());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

//Readiness check endpoint
app.get("/ready", (req: Request, res: Response) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

function getWinner(numbers: { rock: number; paper: number; scissor: number }): string {
  const { rock, paper, scissor } = numbers;
  if (rock > paper && rock > scissor) {
    return "rock";
  } else if (paper > rock && paper > scissor) {
    return "paper";
  } else if (scissor > rock && scissor > paper) {
    return "scissor";
  } else {
    return "draw";
  }
}

// Main endpoint - calls rock, paper, and scissor services, sums the results
app.get("/api/play", async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] [${SERVICE_NAME}] Received request to /api/sum`);
  try {
    // Call all three services in parallel
    console.log(
      `[${new Date().toISOString()}] [${SERVICE_NAME}] Calling rock, paper, and scissor services...`,
    );

    const [rockResponse, paperResponse, scissorResponse] = await Promise.all([
      axios.get(`${ROCK_SERVICE_URL}/api/random`),
      axios.get(`${PAPER_SERVICE_URL}/api/random`),
      axios.get(`${SCISSOR_SERVICE_URL}/api/random`),
    ]);

    const rockNumber = Number(rockResponse.data.number);
    const paperNumber = Number(paperResponse.data.number);
    const scissorNumber = Number(scissorResponse.data.number);

    console.log(
      `[${new Date().toISOString()}] [${SERVICE_NAME}] Rock: ${rockNumber}, Paper: ${paperNumber}, Scissor: ${scissorNumber}`,
    );

    // Calculate sum
    const sum = rockNumber + paperNumber + scissorNumber;
    const duration = Date.now() - startTime;
    const winner = getWinner({ rock: rockNumber, paper: paperNumber, scissor: scissorNumber });

    console.log(
      `[${new Date().toISOString()}] [${SERVICE_NAME}] Calculated sum: ${sum}, Duration: ${duration}ms`,
    );

    const result = {
      sum,
      winner,
      rockNumber,
      paperNumber,
      scissorNumber,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    void publishGameEvent(result);

    res.json(result);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] [${SERVICE_NAME}] Error occurred:`, error.message);

    res.status(500).json({
      error: "Failed to calculate sum",
      message: error.message,
      duration: `${duration}ms`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] [${SERVICE_NAME}] Service listening on port ${PORT}`);
  console.log(
    `[${new Date().toISOString()}] [${SERVICE_NAME}] Rock service URL: ${ROCK_SERVICE_URL}`,
  );
  console.log(
    `[${new Date().toISOString()}] [${SERVICE_NAME}] Paper service URL: ${PAPER_SERVICE_URL}`,
  );
  console.log(
    `[${new Date().toISOString()}] [${SERVICE_NAME}] Scissor service URL: ${SCISSOR_SERVICE_URL}`,
  );
  console.log(`\n${"=".repeat(80)}`);
  console.log(`[${new Date().toISOString()}] [${SERVICE_NAME}] All Environment Variables:`);
  console.log(`${"=".repeat(80)}`);
  Object.keys(process.env)
    .sort()
    .forEach((key) => {
      console.log(`  ${key}=${process.env[key]}`);
    });
  console.log(`${"=".repeat(80)}\n`);
});
