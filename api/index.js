const router = require('express').Router();
const mongoose = require('mongoose');

const { MONGODB_DB_URL } = require('../constants');
const { CoronaApp } = require('./coronaApp');

const REFRESH_TIME = (process.env.REFRESH_TIME || 30)*60000;

let app;

// MongoDB connection
(async () => {
    await mongoose.connect(MONGODB_DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
})();

let db = mongoose.connection;
db.once('open', () => {
    console.log('connected to the database');
    app = new CoronaApp();
});

setInterval(()=> {
    app.getEverything();
},REFRESH_TIME);


// Routes
router.get('/', (req, res) => {
    try {
        return res.json(app.mainInfo);
    } catch (error) {
        return res.json({
            error: "Server Error"
        });
    }
})
router.get('/latest', (req, res) => {
    try {
        return res.json(app.latestDatas);
    } catch (error) {
        return res.json({
            error: "Server Error"
        });
    }
})

router.get('/top',(req, res) => {  
    try {
        return res.json(app.topCountryData);
    } catch (error) {
        return res.json({
            error: "Server Error"
        });
    }
})

router.get('/:countryname',(req, res) => {
    try {
        const { countryname } = req.params;
        const countryData = app.allCountryData.filter(data=> data.Country == countryname)[0];        
        return res.json(countryData);
    } catch (error) {
        return res.json({
            error: "Server Error"
        });
    }
})

router.get('/data/bydate',async (req,res) => {
    try {
        const data = await app.getCountryDataByDate(req.query.date);             
        return res.json(data);
    } catch (error) {
        return res.json({
            error: "Server Error"
        });
    }
})


module.exports = router;
