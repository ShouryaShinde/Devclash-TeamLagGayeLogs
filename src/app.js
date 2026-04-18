import express from "express";
import dotenv from "dotenv";
import zoomRoutes from "./routes/zoomRoutes.js";




dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.static("public"));

app.use("/api/zoom", zoomRoutes);

app.get("/", (req, res) => res.render("home"));
app.get("/dashboard", (req, res) => res.render("dashboard"));

app.listen(3000, () => console.log("Server running"));