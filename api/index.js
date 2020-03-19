const router = require('express').Router();
const cheerio = require('cheerio');
const axios = require('axios');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const dataModel = require('./model');

const SITE_URL = 'https://www.worldometers.info/coronavirus/';
const DB_URL = 'mongodb+srv://overlord:naruto77@cluster0-vgvvn.mongodb.net/corona-tracker?retryWrites=true&w=majority';
const title =[
    'Country',
    'TotalCases',
    'NewCases',
    'TotalDeaths',
    'NewDeaths',
    'TotalRecovered',
    'ActiveCases',
    'SeriousCritical',
    'TotCasesPer1MPop'
]
const coronaTitles = ['cases', 'deaths', 'recovered']
let country = [];
let info = {};
let countryData = {};
const time = process.env.REFRESH_TIME || 600000;

// Database Connection
(async () => {
    await mongoose.connect(DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
})();
let db = mongoose.connection;
db.once('open', () => console.log('connected to the database'));

const getData = async () => {
    info={}
    const {data} = await axios.get(SITE_URL);
    const $ = await cheerio.load(data);        
    const coronaInfo = $('div .maincounter-number');
    coronaInfo.each((i, cases) => info[coronaTitles[i]] = $(cases).text().trim().replace(/,/g, ""));
}
const getTopData = async () => {
    country = [];
    const { data } = await axios.get(SITE_URL);
    const $ = cheerio.load(data);
    const countriesRow = $('tr');

    countriesRow.each((i, countryRow) => {            
        if (i > 0 && i < 6) {
            let countryData = {};
            $(countryRow).find('td').each((j, col) => {
                if (j < 7) {
                    if ($(col).text().trim() != '') {
                        countryData[title[j]] = $(col).text().trim();
                    }
                }
            })
            country.push(countryData);
            // console.log(countryData);
            
        };   
    })
}
const getCountryData = async () => {
    countryData = {};
    const { data } = await axios.get(SITE_URL);
    const $ = cheerio.load(data);
    const countriesRow = $('tr');
    // console.log(countriesRow.length);
    
    countriesRow.each((i, countryRow) => {
        if (i != 0 && i != 354) {
            let countryn = {}
            const countryName = $(countryRow).find('td').first().text().trim();
            
            if (countryName.trim() != "Total:" || countryName.trim() != '') {
                $(countryRow).find('td').each((j, col) => {
                    if ($(col).text().trim() != '') {
                        countryn[title[j]] = $(col).text().trim();
                    }
                })
                countryData[countryName] = countryn;
            }
        };
    })
    delete countryData['Total:'];
    delete countryData[''];
}
const getter = async () => {
    await getData();
    await getTopData();
    await getCountryData();
    const now =Date.now()
    const time = new Date(now)
    const nepalTime = moment(time).tz('Asia/Kathmandu')
    const timeGot = {
        timestamp: now,
        nepalTime: nepalTime.format(),
        date: `${nepalTime.year()}/${nepalTime.date()}/${nepalTime.day()}`,
        time: `${nepalTime.hour()}:${nepalTime.minute()}:${nepalTime.second()}`
    }
    
    let datamodel = new dataModel();
    datamodel.timestamp = timeGot.timestamp;
    datamodel.date = timeGot.date;
    datamodel.time = timeGot.time;
    datamodel.details = info;
    datamodel.top_country = country;
    datamodel.all_country_data = countryData;
    await datamodel.save(function (err) {
        if (!err) console.log('Success!');
    });
}


getter();
setInterval(()=>getter(),time);

router.get('/', (req, res) => {
    try {
        return res.json(info);
    } catch (error) {
        return res.json({
            error: "Server Error"
        });
    }
})

router.get('/top',(req, res) => {  
    try {
        res.json(country);
    } catch (error) {
        return res.json({
            error: "Server Error"
        });
    }
})

router.get('/:countryname',(req, res) => {
    try {
        const { countryname } = req.params;
        res.json(countryData[countryname]);
    } catch (error) {
        return res.json({
            error: "Server Error"
        });
    }
})

module.exports = router;
