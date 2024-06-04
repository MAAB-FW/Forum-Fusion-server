const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
require("dotenv").config()
const { MongoClient, ServerApiVersion } = require("mongodb")
const port = process.env.PORT || 5000

const app = express()

// middleware
app.use(express.json())
app.use(cookieParser())
//Must remove "/" from your production URL
app.use(
    cors({
        origin: ["http://localhost:5173"],
    }),
)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wkufpua.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
})

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect()
        const db = client.db("forumFusionDB")
        const usersCollection = db.collection("users")

        // user data insert to the db
        app.post("/users", async (req, res) => {
            const userInfo = req.body
            const query = { email: userInfo.email }
            const isExist = await usersCollection.findOne(query)
            if (isExist) {
                return res.send({ status: "success" })
            }
            const doc = { ...userInfo, badge: "bronze", role: "user" }
            const result = await usersCollection.insertOne(doc)
            res.send(result)
        })

        // get all users data from db //TODO: verifyAdmin
        app.get("/users", async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 })
        console.log("Pinged your deployment. You successfully connected to MongoDB!")
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close()
    }
}
run().catch(console.dir)

app.get("/", (req, res) => {
    res.send("forum fusion is running...")
})

app.listen(port, () => {
    console.log("server running on", port)
})
