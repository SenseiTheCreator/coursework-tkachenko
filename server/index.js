require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
  max: 5,
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "https://senseithecreator.github.io,http://127.0.0.1:5500,http://localhost:5500").split(",");

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "10kb" }));

const kyivToday = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Kyiv" });

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateBooking(body) {
  const errors = {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const tourId = parseId(body.tourId);
  const guests = Number(body.guests);
  const date = body.date;

  if (!tourId) errors.tourId = "Невірний тур";
  if (name.length < 2 || name.length > 80)
    errors.name = "Ім'я: від 2 до 80 символів";
  if (!/^\+380\d{9}$/.test(phone)) errors.phone = "Формат: +380XXXXXXXXX";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Введіть коректний email";
  if (!Number.isInteger(guests) || guests < 1 || guests > 6)
    errors.guests = "Кількість осіб: від 1 до 6";
  if (comment.length > 500) errors.comment = "Коментар: максимум 500 символів";

  const isRealDate =
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);
  if (!isRealDate) errors.date = "Невірна дата";
  else if (date < kyivToday()) errors.date = "Дата виїзду вже минула";

  return {
    errors,
    data: {
      tourId,
      name,
      phone,
      email,
      date,
      guests,
      comment: comment || null,
    },
  };
}

app.get("/", (req, res) => {
  res.json({
    name: "Travellian REST API",
    endpoints: ["GET /api/health", "GET /api/tours/:id", "POST /api/bookings"],
  });
});

app.get("/api/health", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok" });
});

app.get("/api/tours/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Невірний id туру" });

  const { rows } = await pool.query(
    `SELECT t.id, t.title, t.days, t.price, c.name AS country
       FROM tours t
       JOIN countries c ON c.id = t.country_id
      WHERE t.id = $1`,
    [id],
  );
  if (rows.length === 0)
    return res.status(404).json({ error: "Тур не знайдено" });
  res.json(rows[0]);
});

app.post("/api/bookings", async (req, res) => {
  const { errors, data } = validateBooking(req.body ?? {});
  if (Object.keys(errors).length > 0) {
    return res
      .status(400)
      .json({ error: "Перевірте дані форми", fields: errors });
  }

  const { rows } = await pool.query(
    `INSERT INTO bookings (tour_id, name, phone, email, travel_date, guests, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, created_at, (SELECT title FROM tours WHERE id = tour_id) AS tour`,
    [
      data.tourId,
      data.name,
      data.phone,
      data.email,
      data.date,
      data.guests,
      data.comment,
    ],
  );
  res
    .status(201)
    .json({
      id: rows[0].id,
      tour: rows[0].tour,
      createdAt: rows[0].created_at,
    });
});

app.use((req, res) => res.status(404).json({ error: "Маршрут не знайдено" }));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ error: "Невірний формат JSON" });
  if (err.code === "23503")
    return res.status(404).json({ error: "Тур не знайдено" });
  if (err.code === "23514" || err.code === "22P02")
    return res.status(400).json({ error: "Перевірте дані форми" });
  console.error(err);
  res.status(500).json({ error: "Помилка сервера. Спробуйте пізніше." });
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
