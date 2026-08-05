const axios = require('axios');
axios.post('https://overpass-api.de/api/interpreter', 'data=' + encodeURIComponent('[out:json][timeout:25];node["amenity"="hospital"](18.87,72.77,19.27,72.99);out center tags 10;'), { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Content-Type': 'application/x-www-form-urlencoded' } })
.then(r => console.log(r.data.elements.length))
.catch(e => console.error(e.response ? e.response.status + " " + e.response.data : e.message));
