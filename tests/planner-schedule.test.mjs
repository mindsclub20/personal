import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workspace = await readFile(new URL("../workspace.js", import.meta.url), "utf8");

test("weekly planner assigns Monday to Friday to the five named robotics volumes", () => {
  const expected = [
    'data-schedule-day="1"><b>Monday</b><span>Volume 1 · Robotics Fundamentals</span>',
    'data-schedule-day="2"><b>Tuesday</b><span>Volume 2 · Electronics for Robotics</span>',
    'data-schedule-day="3"><b>Wednesday</b><span>Volume 3 · Mechanical Robotics</span>',
    'data-schedule-day="4"><b>Thursday</b><span>Volume 4 · LEGO EV3 and Arduino Robotics</span>',
    'data-schedule-day="5"><b>Friday</b><span>Volume 5 · Autonomous Robotics</span>',
  ];
  for (const item of expected) assert.ok(workspace.includes(item), `Missing planner entry: ${item}`);
});

test("Saturday is integration and review, while Sunday remains rest or optional review", () => {
  assert.ok(workspace.includes('data-schedule-day="6"><b>Saturday</b><span>Integration, review and Python support practice</span>'));
  assert.ok(workspace.includes('data-schedule-day="0"><b>Sunday</b><span>Rest or optional review</span>'));
});

test("Python is a supporting track rather than a separate weekly volume", () => {
  assert.ok(workspace.includes("Python is a supporting programming track, not a sixth volume or a separate weekday."));
  assert.ok(workspace.includes("use Python for a small robotics-related exercise"));
  assert.ok(!workspace.includes('data-schedule-day="3"><b>Wednesday</b><span>Python programming</span>'));
});

test("scheduled research is clearly separated from the browser study planner", () => {
  assert.ok(workspace.includes("Separate external task · daily at 7:00 PM IST · not run by this webpage"));
  assert.ok(workspace.includes("The external research task currently starts at the same clock time as the study session"));
  assert.ok(workspace.includes("it is not triggered by this page and does not count as study time"));
});

test("planner date, weekday, and task labels use India Standard Time", () => {
  assert.ok(workspace.includes('timeZone:"Asia/Kolkata"'));
  assert.ok(workspace.includes("const getIndiaDay=()=>"));
  assert.ok(workspace.includes("const parts=indiaDateParts()"));
  assert.ok(!workspace.includes("const today=new Date().getDay()"));
  assert.ok(!workspace.includes("localDate.getFullYear()"));
});

test("Thursday includes the core serial communication interfaces", () => {
  assert.ok(workspace.includes("serial communication (I²C, SPI, UART), including 7-bit I²C address-space limits and reserved-address concepts (128 patterns are not 128 guaranteed usable devices; duplicate module addresses matter), open-drain SDA/SCL with pull-ups, bus-capacitance effects, and board-specific datasheet checks"));
});

test("EV3 Classroom remains the school default and EV3 MicroPython is optional", () => {
  assert.ok(workspace.includes("EV3 Classroom remains the school default"));
  assert.ok(workspace.includes("EV3 MicroPython is optional only with teacher-approved compatible setup"));
});


test("Volume 4 keeps I2C electrical-layer concepts at theory level", () => {
  assert.ok(workspace.includes("open-drain SDA/SCL and pull-up concepts"));
  assert.ok(workspace.includes("bus-capacitance effects"));
  assert.ok(workspace.includes("Nano ESP32 3.3 V pin-level limit"));
  assert.ok(workspace.includes("board-specific datasheet checks"));
});


test("Volume 4 flags Nano ESP32 board-level voltage compatibility", () => {
  assert.ok(workspace.includes("Nano ESP32 3.3 V pin-level limit"));
});
