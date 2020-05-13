const router = require('express').Router();
const cheerio = require('cheerio');
const axios = require('axios');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const dataModel = require('./model');
const firebase = require("firebase");
firebase.initializeApp({
    databaseURL: "https://covid19-23c1c.firebaseio.com/"
});
const tokenDB = firebase.database().ref("fcm-token");
let tokens = [];

tokenDB.on("value",snap=>{
    if (snap.val()) {
        tokens = Object.keys(snap.val());
        console.log(`Got Tokens : ${tokens.length}`);
    }
})
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
let begin = true;
let country = [];
let latest = [];
let info = {};
let countryData = {};
let prevNepalData = {};
const time = process.env.REFRESH_TIME || 1800000;

const format = c => {
    return c.replace("+","");
};
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
        };   
    })
}
const getCountryData = async () => {
    countryData = {};
    const { data } = await axios.get(SITE_URL);
    const $ = cheerio.load(data);
    const countriesRow = $('tr');    
    countriesRow.each((i, countryRow) => {
        if (i != 0 && i <=177) {
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
}
const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'key=AAAAT5jGHZM:APA91bH3OBhVf-_ZB2BosN8NbCD5ME-3bhi04TZJNS4GDzZjLGtBpNWI-6hKpZapD_DsU_hcxaEHJG2Ge5WbeaO6ca3yaTmytzk9NyA38T53FBGRdSUc79Kpd_zFBhnGK7TzwBcpIK8D'
}

const getNepalDataData= ()=> {  
    console.log("NOO");
      
    if(!prevNepalData||!Object.keys(prevNepalData).length) return;
    
    if(prevNepalData.NewCases != countryData.Nepal.NewCases) {
        let newCase = format(countryData.Nepal.NewCases) - format(prevNepalData.NewCases);
        sendNotification(newCase);
    } else {
        console.log("No new Cases Found");
    }
};
const sendNotification = (newCase) => {
    console.log(`${newCase} new case has been found in Nepal`);
    if (tokens) {
        tokens.forEach(token=> {
            axios.post("https://fcm.googleapis.com/fcm/send",{
                "to": token,
                "notification": {
                "title": "New Case Found",
                "body": `${newCase} new case has been found in Nepal`,
                "subtitle":"SAD",
                "mutable_content": true,
                "sound": "Tri-tone"
                }
            },{
                headers
            })
        })
    }
}
const getter = async () => {
    if (begin) {
        prevNepalData = await {};
        begin =false;
    } else {        
        prevNepalData = await countryData.Nepal;
    }
    await getData();
    await getTopData();
    await getCountryData();
    await getNepalDataData();
    const now =Date.now()
    const time = new Date(now)
    const nepalTime = moment(time).tz('Asia/Kathmandu')
    const timeGot = {
        timestamp: now,
        nepalTime: nepalTime.format(),
        date: `${nepalTime.year()}/${nepalTime.date()}/${nepalTime.day()}`,
        time: `${nepalTime.hour()}:${nepalTime.minute()}:${nepalTime.second()}`
    }
    const latest_data = await dataModel.find({}, null, {
        limit: 10,
        sort: {
            timestamp: -1
        }
    })
    latest = [];
    latest_data.forEach(latestdata => {
        const { timestamp, date, time, details } = latestdata;
        latest.push({
            timestamp,
            date,
            time,
            details
        })
    })
    
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
router.get('/latest', (req, res) => {
    try {
        return res.json(latest);
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
