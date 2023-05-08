import express from "express";
import cheerio from "cheerio";
import fetch from "node-fetch";
import fs from "fs";

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

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
