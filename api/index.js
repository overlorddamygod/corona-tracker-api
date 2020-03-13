const router = require('express').Router();
const cheerio = require('cheerio');
const axios = require('axios');

const SITE_URL = 'https://www.worldometers.info/coronavirus/';
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
                    countryData[title[j]] = $(col).text().trim();
                }
            })
            country.push(countryData);
        };   
    })
}
const getCountryData = async (countryname) => {
    countryData = {};
    const { data } = await axios.get(SITE_URL);
    const $ = cheerio.load(data);
    const countriesRow = $('tr');
    countriesRow.each((i, countryRow) => {
        if (i != 0) {
            let countryn = {}
            const countryName = $(countryRow).find('td').first().text().trim();
            $(countryRow).find('td').each((j, col) => {
                countryn[title[j]] = $(col).text().trim();
            })
            countryData[countryName] = countryn;
        };
    })
}
getData();
getTopData();
getCountryData();
setInterval(()=>getData(),900000);
setInterval(()=>getTopData(),900000);
setInterval(()=>getCountryData(),900000);

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
