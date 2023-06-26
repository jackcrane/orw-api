import express from "express";
import cheerio from "cheerio";
import fetch from "node-fetch";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const app = express();

Array.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, "g"), replacement);
};

app.get("/", (req, res) => {
  res.send(require("./package.json").version);
});

app.get("/events", async (req, res) => {
  const data = await fetch("https://www.ohioriverway.org/rivertown-events");
  if (!data.ok) {
    res.status(500).send("Error fetching events");
    return;
  }
  const html = await data.text();
  const $ = cheerio.load(html);
  let events = [];
  let upcomingEvents = $(".eventlist-event--upcoming");

  for (let i = 0; i < upcomingEvents.length; i++) {
    let event = {};
    const eventHtml = JSON.stringify(
      $(upcomingEvents[i]).find("a").children()[0].attribs
    );
    event.image = $(upcomingEvents[i]).find("img").attr("data-src");
    event.link = $(upcomingEvents[i]).find("a").attr("href");
    event.title = $(upcomingEvents[i]).find(".eventlist-title").text();
    event.date = $(upcomingEvents[i])
      .find(".eventlist-meta-date")
      .text()
      .replace(/\s*\n\s*/g, " ")
      .replace(/(\d\d:\d\d)/g, "at $1 -")
      .slice(0, -3);
    // .replace(/(\r\n|\n|\r|(  ))/gm, "")
    // .replace("(map)", "");
    event.address = $(upcomingEvents[i])
      .find("li.eventlist-meta-address")
      .text()
      .replace(/(\r\n|\n|\r|(  ))/gm, "")
      .replace("(map)", "");
    // event.description = $(upcomingEvents[i])
    //   .find(".eventlist-description")
    //   .text();
    events.push(event);
  }
  res.json(events);
});

app.get("/weather", async (req, res) => {
  const latitude = req.query.latitude || 39.1031;
  const longitude = req.query.longitude || -84.512;
  const getWeatherData = async (latitude, longitude) => {
    const pointsUrl = `https://api.weather.gov/points/${latitude},${longitude}`;
    const pointsFetch = await fetch(pointsUrl);
    if (!pointsFetch.ok) {
      throw new Error("Unable to locate weather observation station");
      return;
    }
    const pointsData = await pointsFetch.json();
    const forecastHourlyUrl = pointsData.properties.forecastHourly;
    const forecastFetch = await fetch(forecastHourlyUrl);
    if (!forecastFetch.ok) {
      res.status(500).send("Error fetching weather");
      console.error("Unable to fetch weather information from station");
      return;
    }
    const forecastData = await forecastFetch.json();
    return forecastData;
  };
  const weather = await getWeatherData(latitude, longitude);
  res.json(weather);
});

app.post("/user", async (req, res) => {
  await prisma.user.create({
    data: {
      name: req.body.name,
      email: req.body.email,
    },
  });

  res.json({ success: true });
});

app.get("/users/new", async (req, res) => {
  const users = await prisma.user.findMany({
    where: {
      downloaded: false,
    },
  });

  // Generate a CSV file with headers "name", "email", and "createdAt"
  const csv = users
    .map((user) => `${user.name},${user.email},${user.createdAt}`)
    .join("\n");

  // Send the CSV file to the client
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=users.csv");
  res.send(csv);

  await prisma.user.updateMany({
    where: {
      downloaded: false,
    },
    data: {
      downloaded: true,
    },
  });
});

app.get("/users/all", async (req, res) => {
  const users = await prisma.user.findMany();

  // Generate a CSV file with headers "name", "email", and "createdAt"
  const csv = users
    .map((user) => `${user.name},${user.email},${user.createdAt}`)
    .join("\n");

  // Send the CSV file to the client
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=users.csv");
  res.send(csv);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
