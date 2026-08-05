const axios = require('axios');
axios.get('https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%5Btimeout%3A25%5D%3Bnode%5B%22amenity%22%3D%22hospital%22%5D(18.87%2C72.77%2C19.27%2C72.99)%3Bout%20center%20tags%2010%3B', { headers: { 'User-Agent': 'BizScraper/1.0', 'Accept': 'application/json' } })
.then(r => console.log(r.data))
.catch(e => console.error(e.response ? e.response.status : e.message));
