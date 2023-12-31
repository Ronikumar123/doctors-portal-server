const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());


app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhzd77f.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, } });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split('')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })


}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const appointmentOptionCollection = client.db('doctorsPortal').collection('appointmentOptions');
        const bookingsCollection = client.db('doctorsPortal').collection('bookings');
        const usersCollection = client.db('doctorsPortal').collection('users');
        const doctorsCollection = client.db('doctorsPortal').collection('doctors');
        app.get('/appointmentOptions', async(req, res) => {
            const date = req.query.date;
            // console.log(date);
            const query = {};
            const options = await appointmentOptionCollection.find(query).toArray();
            const bookingQuery = { appointmentDate: date }
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name)
                const bookedSlots = optionBooked.map(book => book.slot);
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
                option.slots = remainingSlots;
            })
            res.send(options);
            // app.get('/bookings', verifyJWT, async(req, res) => {
            //     const email = req.query.email;
            //     const decodedEmail = req.decoded.email;
            //     if (email !== decodedEmail) {
            //         return res.status(403).send({ message: 'forbidden access' });
            //     }
            //     const query = { email: email };
            //     const bookings = await bookingsCollection.find(query).toArray();
            //     res.send(bookings);
            // })

            app.get('/appointmentSpecialty', async(req, res) => {
                const query = {}
                const result = await appointmentOptionCollection.find(query).project({ name: 1 }).toArray();
                res.send(result);
            })

            app.get('/bookings', async(req, res) => {
                const email = req.query.email;
                const query = { email: email }
                const bookings = await bookingsCollection.find(query).toArray();
                res.send(bookings);
            })
            app.post('/bookings', async(req, res) => {
                const booking = req.body;
                const query = {
                    appointmentDate: booking.appointmentDate,
                    email: booking.email,
                    treatment: booking.treatment

                }

                const alreadyBooked = await bookingsCollection.find(query).toArray();
                if (alreadyBooked.length) {
                    const message = `You already have a booking on ${booking.appointmentDate}`
                    return res.send({ acknowledged: false, message })
                }
                const result = await bookingsCollection.insertOne(booking);
                res.send(result);
            })
        });

        // app.get('/jwt', async(req, res) => {
        //     const email = req.query.email;
        //     const query = { email: email };
        //     const user = await usersCollection.findOne(query);
        //     if (user) {
        //         const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
        //         return res.send({ accessToken: token });
        //     }
        //     console.log(user);
        //     res.status(403).send({ accessToken: '' })
        // })

        app.get('/users', async(req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        app.post('/users', async(req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.put('/users/admin/:id', async(req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.get('/doctors', async(req, res) => {
            const query = {};
            const doctors = await doctorsCollection.find(query).toArray();
            res.send(doctors);
        })

        app.put('/doctors', async(req, res) => {
            const doctor = req.body;
            const result = await doctorsCollection.insertOne(doctor);
            res.send(result);
        })

        app.delete('/doctors/:id', async(req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await doctorsCollection.deleteOne(filter);
            res.send(result);
        })

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.log);


app.get('/', async(req, res) => {
    res.send('doctors portal server is running');
})

app.listen(port, () => console.log(`Doctors portal running on ${port}`))