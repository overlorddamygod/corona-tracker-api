const SITE_URL = 'https://www.worldometers.info/coronavirus/';
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL || 'https://covid19-23c1c.firebaseio.com/';
const MONGODB_DB_URL = process.env.MONGODB_DB_URL || 'mongodb+srv://overlord:naruto77@cluster0-vgvvn.mongodb.net/corona-tracker?retryWrites=true&w=majority';
const headers = {
    'Content-Type': 'application/json',
    'Authorization': process.env.AUTH_KEY || 'key=AAAAT5jGHZM:APA91bH3OBhVf-_ZB2BosN8NbCD5ME-3bhi04TZJNS4GDzZjLGtBpNWI-6hKpZapD_DsU_hcxaEHJG2Ge5WbeaO6ca3yaTmytzk9NyA38T53FBGRdSUc79Kpd_zFBhnGK7TzwBcpIK8D'
}
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

module.exports =  {
    SITE_URL,
    MONGODB_DB_URL,
    title,
    coronaTitles,
    FIREBASE_DB_URL,
    headers
}