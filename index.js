const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
require("dotenv").config()
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb")
const port = process.env.PORT || 5000

const app = express()

// middleware
app.use(express.json())
app.use(cookieParser())
//Must remove "/" from your production URL
app.use(
    cors({
        origin: ["http://localhost:5173"],
        credentials: true,
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

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect()
        const db = client.db("forumFusionDB")
        const usersCollection = db.collection("users")
        const announcementsCollection = db.collection("announcements")
        const tagsCollection = db.collection("tags")
        const postsCollection = db.collection("posts")

        // middleware
        const verifyToken = (req, res, next) => {
            const token = req?.cookies?.token
            if (!token) return res.status(401).send({ message: "Unauthorized access!" })
            jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: "Unauthorized access!" })
                }
                req.decoded = decoded
                next()
            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user.role !== "admin") {
                return res.status(403).send({ message: "Forbidden access!" })
            }
            next()
        }
        // jwt related api
        app.post("/jwt", (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: "365d" })
            res.cookie("token", token, cookieOptions).send({ success: true })
        })

        app.post("/logout", (req, res) => {
            res.clearCookie("token", { ...cookieOptions, maxAge: 0 }).send({ success: true })
        })

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
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            const search = req.query.search
            let query = {}
            if (search) {
                query = { userName: { $regex: search, $options: "i" } }
            }
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })

        app.get("/myProfile/:email", async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await usersCollection.findOne(query)
            res.send(result)
        })

        app.get("/role/:email", verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const role = user.role
            res.send({ role })
        })

        // make admin
        app.patch("/makeAdmin/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: { role: "admin" },
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        // make announcement
        app.post("/makeAnnouncement", async (req, res) => {
            const data = req.body
            const result = await announcementsCollection.insertOne(data)
            res.send(result)
        })

        // get announcements
        app.get("/announcements", async (req, res) => {
            const result = await announcementsCollection.find().toArray()
            res.send(result)
        })

        // add tag to the db
        app.post("/tags", async (req, res) => {
            const tag = req.body
            const result = await tagsCollection.insertOne(tag)
            res.send(result)
        })

        // get all tags from db
        app.get("/tags", async (req, res) => {
            const result = await tagsCollection.find().toArray()
            res.send(result)
        })

        // add post
        app.post("/addPost", async (req, res) => {
            const postData = req.body
            const result = await postsCollection.insertOne(postData)
            res.send(result)
        })

        // get all posts from db
        app.get("/posts", async (req, res) => {
            const result = await postsCollection.find().toArray()
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
