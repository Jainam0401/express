import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "../lib/prisma";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.get("/summary", async (req, res) => {
  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;

    if (start && isNaN(Date.parse(start))) {
      return res.status(400).json({ error: "Invalid start date format" });
    }

    if (end && isNaN(Date.parse(end))) {
      return res.status(400).json({ error: "Invalid end date format" });
    }

    if (start && end && new Date(start) > new Date(end)) {
      return res.status(400).json({ error: "Start date must be before end date" });
    }

    const where =
      start || end
        ? {
            recordDate: {
              gte: start ? new Date(start) : undefined,
              lte: end ? new Date(end) : undefined,
            },
          }
        : {};

    const r = await prisma.shoeMetric.aggregate({
      _sum: {
        sales: true,
        advertisingCost: true,
        impressions: true,
        clicks: true,
      },
      where,
    });

    res.json({
      totalSales: r._sum.sales ?? 0,
      totalAdvertisingCost: r._sum.advertisingCost ?? 0,
      totalImpressions: r._sum.impressions ?? 0,
      totalClicks: r._sum.clicks ?? 0,
    });
  } catch (error) {
    console.error("Error in /summary:", error);
    res.status(500).json({ error: "Failed to fetch summary data" });
  }
});

app.get("/shoes-summary", async (req, res) => {
  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;

    if (start && isNaN(Date.parse(start))) {
      return res.status(400).json({ error: "Invalid start date format" });
    }

    if (end && isNaN(Date.parse(end))) {
      return res.status(400).json({ error: "Invalid end date format" });
    }

    if (start && end && new Date(start) > new Date(end)) {
      return res.status(400).json({ error: "Start date must be before end date" });
    }

    const where =
      start || end
        ? {
            recordDate: {
              gte: start ? new Date(start) : undefined,
              lte: end ? new Date(end) : undefined,
            },
          }
        : {};

    const data = await prisma.shoe.findMany({
      include: {
        metrics: { where },
      },
    });

    const mapped = data.map((s) => ({
      shoe: s.name,
      sales: s.metrics.reduce((a, b) => a + b.sales, 0),
      advertisingCost: s.metrics.reduce((a, b) => a + b.advertisingCost, 0),
      impressions: s.metrics.reduce((a, b) => a + b.impressions, 0),
      clicks: s.metrics.reduce((a, b) => a + b.clicks, 0),
    }));

    res.json(mapped);
  } catch (error) {
    console.error("Error in /shoes-summary:", error);
    res.status(500).json({ error: "Failed to fetch shoes summary data" });
  }
});

app.get("/time-series", async (req, res) => {
  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const shoeName = req.query.shoe as string | undefined;

    if (!shoeName) {
      return res.status(400).json({ error: "Shoe name is required" });
    }

    if (start && isNaN(Date.parse(start))) {
      return res.status(400).json({ error: "Invalid start date format" });
    }

    if (end && isNaN(Date.parse(end))) {
      return res.status(400).json({ error: "Invalid end date format" });
    }

    if (start && end && new Date(start) > new Date(end)) {
      return res.status(400).json({ error: "Start date must be before end date" });
    }

    const shoe = await prisma.shoe.findFirst({
      where: { name: shoeName },
    });

    if (!shoe) {
      return res.status(404).json({ error: "Shoe not found" });
    }

    const where: any = {
      shoeId: shoe.id,
    };

    if (start || end) {
      where.recordDate = {
        gte: start ? new Date(start) : undefined,
        lte: end ? new Date(end) : undefined,
      };
    }

    const metrics = await prisma.shoeMetric.findMany({
      where,
      orderBy: {
        recordDate: "asc",
      },
    });

    const data = metrics.map((m) => ({
      date: m.recordDate.toISOString(),
      sales: m.sales,
      advertisingCost: m.advertisingCost,
      impressions: m.impressions,
      clicks: m.clicks,
    }));

    res.json(data);
  } catch (error) {
    console.error("Error in /time-series:", error);
    res.status(500).json({ error: "Failed to fetch time series data" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const port = Number(process.env.PORT || 4000);

app.listen(port, () => console.log(`Server running on port ${port}`));