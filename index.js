const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
require("dotenv").config()
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

app.get("/", (req, res) => {
    res.send("forum fusion is running...")
})

app.listen(port, () => {
    console.log("server running on", port)
})
