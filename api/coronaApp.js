const moment = require('moment-timezone');
const firebase = require('firebase');
const cheerio = require('cheerio');
const axios = require('axios');

const { SITE_URL, title, coronaTitles, FIREBASE_DB_URL, headers } = require('../constants');
const dataModel = require('../model');

class CoronaApp {
    constructor() {
        console.log("Initializing class . . . ");

        this.mainInfo = {};
        this.topCountryData = [];
        this.allCountryData = [];
        this.prevCountryData = [];
        this.latestDatas = []
        this.tokens = [];
        this.firstInit = true;

        // Get all required data
        this.getEverything();
    }

    async initFirebase() {
        // Firebase Initialization
        console.log("Initializing Firebase")
        await firebase.initializeApp({
            databaseURL: FIREBASE_DB_URL
        }); 

        const tokenDB = await firebase.database().ref("fcm-token");

        await tokenDB.on("value",snap=>{
            if (snap.val()) {
                this.tokens = Object.keys(snap.val());
                console.log(`Got Tokens : ${this.tokens.length}`);
            }
        })
    }

    async getEverything() {
        console.log("Getting everything");

        if (this.firstInit) {
            await this.initFirebase();
            const latestData = await dataModel.find({}, null, {
                limit: 1,
                sort: {
                    timestamp: -1
                }
            })
            this.prevCountryData = await latestData[0]? latestData[0].allCountryData : [];
            this.firstInit = false;
        } else {
            this.prevCountryData = this.allCountryData;
        }
        
        const { data } = await axios.get(SITE_URL);
        const $ = await cheerio.load(data);

        await this.getMainInfo($);
        await this.getTopCountryData($);
        await this.getAllCountryData($);
        await this.checkNewCases(process.env.country || "Nepal");
        // this.saveInDatabase();
    }

    getMainInfo($) {
        const coronaInfo = $('div .maincounter-number');
        coronaInfo.each((i, cases) => this.mainInfo[coronaTitles[i]] = $(cases).text().trim().replace(/,/g, ""));
    }

    getTopCountryData($) {
        this.topCountryData = [];
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
                this.topCountryData.push(countryData);
            };   
        })        
    }

    getAllCountryData($) {
        this.allCountryData = [];        
        const countriesRow = $('tr');    
        countriesRow.each((i, countryRow) => {
            if (i != 0 && i <=177) {
                let countryData = {}
                const countryName = $(countryRow).find('td').first().text().trim();
                if (countryName.trim() != "Total:" || countryName.trim() != '') {
                    $(countryRow).find('td').each((j, col) => {
                        if ($(col).text().trim() != '') {
                            countryData[title[j]] = $(col).text().trim();
                        }
                    })
                    this.allCountryData.push(countryData);
                }
            }
        })        
    }

    async getCountryDataByDate(date) {        
        const allData = await dataModel.find({
            date,
        },{
            topCountryData:0,
            _id:0,
            details:0,
        });
        return allData;
    }

    async saveInDatabase() {
        console.log("Saving in database");
        
        const timestamp =Date.now();
        const nepalTime = moment(new Date(timestamp)).tz('Asia/Kathmandu');
        
        const timeGot = {
            timestamp,
            nepalTime: nepalTime.format(),
            date: `${nepalTime.year()}/${nepalTime.month()+1}/${nepalTime.date()}`,
            time: `${nepalTime.hour()}:${nepalTime.minute()}:${nepalTime.second()}`
        }
        
        let datamodel = new dataModel();

        datamodel.timestamp = timeGot.timestamp;
        datamodel.date = timeGot.date;
        datamodel.time = timeGot.time;
        datamodel.nepalTime = timeGot.nepalTime;
        datamodel.details = this.mainInfo;
        datamodel.topCountryData = this.topCountryData;
        datamodel.allCountryData = this.allCountryData;

        this.latestDatas.push({
            timestamp: timeGot.timestamp,
            date: timeGot.date,
            time: timeGot.time,
            nepalTime: timeGot.nepalTime,
            details: this.mainInfo
        });


        // Save it in database
        await datamodel.save((err) => {
            if (!err) console.log('Successfully saved in database')
            else {
                console.log("Error : Error saving in database"); 
            };
        });
    }

    checkNewCases(country) {
        if( !this.prevCountryData.length ) return;        
        
        const prev = this.prevCountryData.filter(data=>data.Country==country)[0];
        const current = this.allCountryData.filter(data=>data.Country==country)[0];

        // Previouse New Cases
        const prevNewCase = this.formatData(prev.NewCases);
        const prevCase = this.formatData(prev.TotalCases);

        // Current New Cases
        const currentNewCase = this.formatData(current.NewCases);        
        const currentCase = this.formatData(current.TotalCases);   

        console.log(`Previous total cases : ${prevCase}`);
        console.log(`Current total cases : ${currentCase}`);
                
        if(prevCase != currentCase) {
            const newCase =  Math.abs(currentCase - prevCase);
            this.sendNotification(newCase,country);
        } else {
            console.log("No new Cases Found");
        }
    }

    sendNotification = (newCase,country) => {
        console.log(`${newCase} new case has been found in ${country}`);
        if (this.tokens) {
            this.tokens.forEach(token=> {
                axios.post("https://fcm.googleapis.com/fcm/send",{
                    "to": token,
                    "notification": {
                    "title": "New Case Found",
                    "body": `${newCase} new cases has been found in ${country}`,
                    "mutable_content": true,
                    "sound": "Tri-tone"
                    }
                },{
                    headers
                })
            })
        }
        console.log(`Sent notification to ${this.tokens.length} clients`);
    }

    // Remove any symbols from the string
    formatData(c) {
        return c.replace(/[^0-9 ]/g, "");
    }
}

module.exports = {
    CoronaApp
};


