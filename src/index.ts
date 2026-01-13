import express, { Request, Response } from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;
const SERVICE_NAME = "aggregator";

// Service endpoints
const ROCK_SERVICE_URL = process.env.ROCK_SERVICE_URL || "http://localhost:3001";
const PAPER_SERVICE_URL = process.env.PAPER_SERVICE_URL || "http://localhost:3002";
const SCISSOR_SERVICE_URL = process.env.SCISSOR_SERVICE_URL || "http://localhost:3003";

app.use(express.json());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

// Main endpoint - calls rock, paper, and scissor services, sums the results
app.get("/api/sum", async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] [${SERVICE_NAME}] Received request to /api/sum`);
  console.log("rock service @", ROCK_SERVICE_URL);
  console.log("paper service @", PAPER_SERVICE_URL);
  console.log("scissor service @", SCISSOR_SERVICE_URL);
  try {
    // Call all three services in parallel
    console.log(
      `[${new Date().toISOString()}] [${SERVICE_NAME}] Calling rock, paper, and scissor services...`
    );

    const [rockResponse, paperResponse, scissorResponse] = await Promise.all([
      axios.get(`${ROCK_SERVICE_URL}/api/random`),
      axios.get(`${PAPER_SERVICE_URL}/api/random`),
      axios.get(`${SCISSOR_SERVICE_URL}/api/random`),
    ]);

    const rockNumber = rockResponse.data.number;
    const paperNumber = paperResponse.data.number;
    const scissorNumber = scissorResponse.data.number;

    console.log(
      `[${new Date().toISOString()}] [${SERVICE_NAME}] Rock: ${rockNumber}, Paper: ${paperNumber}, Scissor: ${scissorNumber}`
    );

    // Calculate sum
    const sum = rockNumber + paperNumber + scissorNumber;
    const duration = Date.now() - startTime;

    console.log(
      `[${new Date().toISOString()}] [${SERVICE_NAME}] Calculated sum: ${sum}, Duration: ${duration}ms`
    );

    res.json({
      sum,
      rockNumber,
      paperNumber,
      scissorNumber,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
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
    `[${new Date().toISOString()}] [${SERVICE_NAME}] Rock service URL: ${ROCK_SERVICE_URL}`
  );
  console.log(
    `[${new Date().toISOString()}] [${SERVICE_NAME}] Paper service URL: ${PAPER_SERVICE_URL}`
  );
  console.log(
    `[${new Date().toISOString()}] [${SERVICE_NAME}] Scissor service URL: ${SCISSOR_SERVICE_URL}`
  );
});
