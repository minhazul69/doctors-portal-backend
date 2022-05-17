const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.orgaw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    const serviceCollection = client
      .db("doctors_portal")
      .collection("services");
    const bookingCollection = client.db("doctors_portal").collection("booking");
    const userCollection = client.db("doctors_portal").collection("user");
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patient: booking.patient,
      };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const result = await bookingCollection.insertOne(booking);
      res.send({ success: true, result });
    });
    app.get("/available", async (req, res) => {
      const date = req.query.date || "May 16, 2022";
      // STEP 01: GET ALL SERVICE
      const services = await serviceCollection.find().toArray();
      // STEP 02: GET THE BOOKING OF THE DAY
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();
      // STEP 03: FOT EACH SERVICE , FIND BOOKINGS FOR THAT SERVICE
      services.forEach((service) => {
        const serviceBooking = bookings.filter(
          (book) => book.treatment === service.name
        );
        const bookedSlots = serviceBooking.map((s) => s.option);
        const available = service.slots.filter((s) => !bookedSlots.includes(s));
        service.slots = available;
      });
      res.send(services);
    });
    app.get("/booking", async (req, res) => {
      const patient = req.query.patient;
      const query = { patient: patient };
      const booking = await bookingCollection.find(query).toArray();
      res.send(booking);
    });
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.JWC_SECCRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ result, token });
    });
  } finally {
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
