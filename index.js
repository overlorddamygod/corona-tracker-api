const express = require('express');
// const morgan = require('morgan');
const cors = require('cors');

const coronaAPI = require('./api/index');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
// app.use(morgan('tiny'));

// Route Middlewares
app.use('/api/corona/', coronaAPI);

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
})