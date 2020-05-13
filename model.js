const mongoose = require('mongoose');

const { Schema,model } = mongoose;

const detailsSchema = Schema({
    cases: Number,
    deaths: Number,
    recovered: Number
},{ _id : false });

const countryDataSchema = Schema({
    Country: String,
    TotalCases: String,
    NewCases: String,
    TotalDeaths: String,
    NewDeaths: String,
    TotalRecovered: String,
    ActiveCases: String,
    SeriousCritical: String,
    TotCasesPer1MPop: String
},{ _id : false });

const dataSchema = Schema({
    timestamp: String,
    date: String,
    time: String,
    nepalTime:String,
    details: detailsSchema,
    topCountryData: [countryDataSchema],
    allCountryData: [countryDataSchema]
});

module.exports=model('Data', dataSchema)