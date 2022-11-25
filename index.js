const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();

// middle wares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.5i4qdkw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db('laptopResaler').collection('categories');
        const productsCollection = client.db('laptopResaler').collection('products');
        const usersCollection = client.db('laptopResaler').collection('users');

        app.get('/categories', async(req, res)=>{
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/products/:id', async(req, res)=>{
            const id = req.params.id;
            console.log(id);
            const query = {categoryId: id};
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })
        app.post('/users', async(req, res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(err => console.log(err))


app.get('/', (req, res)=>{
    res.send('Hey, laptop resale is running Yayy');
})

app.listen(port, () =>{
    console.log(`Ok I am running on port: ${port}`);
})