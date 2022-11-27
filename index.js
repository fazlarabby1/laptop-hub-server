const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPT_SK);
const port = process.env.PORT || 5000;

const app = express();

// middle wares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.5i4qdkw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const categoriesCollection = client.db('laptopResaler').collection('categories');
        const productsCollection = client.db('laptopResaler').collection('products');
        const usersCollection = client.db('laptopResaler').collection('users');
        const bookingsCollection = client.db('laptopResaler').collection('bookings');
        const paymentsCollection = client.db('laptopResaler').collection('payments');

        // category API
        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        })

        // products API
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { $and: [{ categoryId: id }, { paid: { $ne: true } }] };
            // { quantity: { $ne: 20 } }
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })

        app.get('/advertisedproducts', async (req, res) => {
            const advertise = 'advertised';
            const query = { $and: [{ advertise: advertise }, { paid: { $ne: true } }] };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })

        app.get('/myproducts', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })

        app.delete('/myproducts/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        app.put('/myproducts/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: 'advertised'
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        })

        // jwt API
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        })
        // users API
        app.get('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.accountType === 'admin' });
        })

        app.get('/user/seller', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send([result, {isSeller: result?.accountType === 'seller'}]);
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })
        // sellers API
        app.get('/users/sellers', verifyJWT, async (req, res) => {
            const accountType = "seller";
            const query = { accountType: accountType }
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers);
        })
        app.put('/users/sellers/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updatedDoc = {
                $set: {
                    verify: 'verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        })
        app.delete('/users/sellers/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })
        // customers API
        app.get('/users/allcustomers', verifyJWT, async (req, res) => {
            const accountType = "user";
            const query = { accountType: accountType }
            const randomUsers = await usersCollection.find(query).toArray();
            res.send(randomUsers);
        })
        app.delete('/users/allcustomers/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })
        // bookings API
        app.post('/bookings', verifyJWT, async (req, res) => {
            const booking = req.body;
            const query = {
                email: booking.email,
                productName: booking.productName
            }
            const booked = await bookingsCollection.find(query).toArray();
            if (booked.length) {
                const message = `You already booked ${booking.productName}`;
                return res.send({ acknowledged: false, message });
            }
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await bookingsCollection.findOne(query);
            res.send(product);
        })

        app.delete('/bookings/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        });

        // payment APIs
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                "payment_method_types": [
                    "card"
                ]
            });
            console.log(paymentIntent);
            res.send({
                clientSecret: paymentIntent.client_secret
            });
        });
        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await bookingsCollection.updateOne(filter, updatedDoc);

            const productId = payment.productId;
            const query = { _id: ObjectId(productId) };
            const updatedProduct = {
                $set: {
                    paid: true
                }
            }
            const updatedProductResult = await productsCollection.updateOne(query, updatedProduct);
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(err => console.log(err))


app.get('/', (req, res) => {
    res.send('Hey, laptop resale is running Yayy');
})

app.listen(port, () => {
    console.log(`Ok I am running on port: ${port}`);
})