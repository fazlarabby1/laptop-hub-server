const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;

const app = express();

// middle wares
app.use(cors());
app.use(express.json());

app.get('/', (req, res)=>{
    res.send('Hey, laptop resale is running Yayy');
})

app.listen(port, () =>{
    console.log(`Ok I am running on port: ${port}`);
})