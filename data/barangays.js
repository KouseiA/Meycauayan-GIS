// data/barangays.js
// Meycauayan City, Bulacan - Complete Barangay Directory with GeoJSON Boundaries
// Grid Layout: Columns = Longitude Bands, Rows = Latitude Bands (North to South)

const BARANGAYS_DATA = [
  {
    id: 1,
    name: "Bagbaguin",
    captain: "Hon. Maria L. Santos",
    population: 18045,
    area: "1.24 km²",
    address: "Bagbaguin, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1001",
    description: "A residential barangay in the northwestern sector of Meycauayan City, characterized by its dense community settlements and proximity to the Meycauayan River.",
    geojson: {
      type: "Feature",
      properties: { id: 1, name: "Bagbaguin" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9350, 14.7360],
          [120.9482, 14.7354],
          [120.9491, 14.7483],
          [120.9361, 14.7490],
          [120.9350, 14.7360]
        ]]
      }
    }
  },
  {
    id: 2,
    name: "Bancal",
    captain: "Hon. Roberto A. Dela Cruz",
    population: 14230,
    area: "0.98 km²",
    address: "Bancal, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1002",
    description: "Located in the northern part of Meycauayan, Bancal is known for its thriving local commerce and well-organized barangay governance.",
    geojson: {
      type: "Feature",
      properties: { id: 2, name: "Bancal" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9480, 14.7480],
          [120.9613, 14.7472],
          [120.9621, 14.7603],
          [120.9491, 14.7610],
          [120.9480, 14.7480]
        ]]
      }
    }
  },
  {
    id: 3,
    name: "Banga",
    captain: "Hon. Cynthia P. Reyes",
    population: 10450,
    area: "0.89 km²",
    address: "Banga, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1003",
    description: "Banga is one of the quieter residential barangays in the eastern sector, with a growing number of subdivisions and community facilities.",
    geojson: {
      type: "Feature",
      properties: { id: 3, name: "Banga" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9740, 14.7240],
          [120.9872, 14.7233],
          [120.9881, 14.7362],
          [120.9751, 14.7370],
          [120.9740, 14.7240]
        ]]
      }
    }
  },
  {
    id: 4,
    name: "Bayugo",
    captain: "Hon. Eduardo F. Villanueva",
    population: 10820,
    area: "0.94 km²",
    address: "Bayugo, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1004",
    description: "Bayugo sits in the northern corridor, bordered by other residential barangays and connected through key thoroughfares linking various parts of Meycauayan.",
    geojson: {
      type: "Feature",
      properties: { id: 4, name: "Bayugo" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9610, 14.7480],
          [120.9743, 14.7471],
          [120.9752, 14.7602],
          [120.9621, 14.7611],
          [120.9610, 14.7480]
        ]]
      }
    }
  },
  {
    id: 5,
    name: "Calvario",
    captain: "Hon. Jose M. Mendoza",
    population: 19100,
    area: "1.31 km²",
    address: "Calvario, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1005",
    description: "Calvario is a historically significant barangay hosting the main Police Community Precinct 1 and several key community landmarks in the western-central area.",
    geojson: {
      type: "Feature",
      properties: { id: 5, name: "Calvario" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9350, 14.7240],
          [120.9481, 14.7232],
          [120.9490, 14.7361],
          [120.9361, 14.7369],
          [120.9350, 14.7240]
        ]]
      }
    }
  },
  {
    id: 6,
    name: "Camalig",
    captain: "Hon. Leonora B. Garcia",
    population: 17380,
    area: "1.18 km²",
    address: "Camalig, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1006",
    description: "Camalig is a central barangay with mixed residential and commercial land use, strategically positioned near the city's main thoroughfares.",
    geojson: {
      type: "Feature",
      properties: { id: 6, name: "Camalig" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9480, 14.7360],
          [120.9613, 14.7352],
          [120.9622, 14.7483],
          [120.9491, 14.7491],
          [120.9480, 14.7360]
        ]]
      }
    }
  },
  {
    id: 7,
    name: "Hulo",
    captain: "Hon. Arnaldo C. Pascual",
    population: 15210,
    area: "1.05 km²",
    address: "Hulo, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1007",
    description: "Hulo occupies the southwestern quadrant of Meycauayan, with direct access to major roads and a vibrant community market area.",
    geojson: {
      type: "Feature",
      properties: { id: 7, name: "Hulo" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9350, 14.7120],
          [120.9481, 14.7112],
          [120.9490, 14.7241],
          [120.9361, 14.7249],
          [120.9350, 14.7120]
        ]]
      }
    }
  },
  {
    id: 8,
    name: "Langka",
    captain: "Hon. Florencia D. Aquino",
    population: 12340,
    area: "1.01 km²",
    address: "Langka, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1008",
    description: "Langka is situated at the northwesternmost tip of Meycauayan, serving as a transitional barangay bordering adjacent municipalities.",
    geojson: {
      type: "Feature",
      properties: { id: 8, name: "Langka" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9350, 14.7480],
          [120.9482, 14.7471],
          [120.9491, 14.7602],
          [120.9361, 14.7611],
          [120.9350, 14.7480]
        ]]
      }
    }
  },
  {
    id: 9,
    name: "Libtong",
    captain: "Hon. Richard V. Torres",
    population: 16870,
    area: "1.15 km²",
    address: "Libtong, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1009",
    description: "Libtong is a centrally located barangay east of Camalig, home to a health center and several community facilities serving its dense population.",
    geojson: {
      type: "Feature",
      properties: { id: 9, name: "Libtong" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9610, 14.7360],
          [120.9743, 14.7351],
          [120.9752, 14.7482],
          [120.9622, 14.7491],
          [120.9610, 14.7360]
        ]]
      }
    }
  },
  {
    id: 10,
    name: "Liputan",
    captain: "Hon. Angelica R. Gutierrez",
    population: 9560,
    area: "0.82 km²",
    address: "Liputan, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1010",
    description: "Liputan is a smaller barangay in the south-central area, primarily residential with ongoing infrastructure developments.",
    geojson: {
      type: "Feature",
      properties: { id: 10, name: "Liputan" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9610, 14.7000],
          [120.9742, 14.6992],
          [120.9751, 14.7121],
          [120.9621, 14.7130],
          [120.9610, 14.7000]
        ]]
      }
    }
  },
  {
    id: 11,
    name: "Malhacan",
    captain: "Hon. Benjamin T. Soriano",
    population: 28150,
    area: "2.18 km²",
    address: "Malhacan, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1011",
    description: "Malhacan is the largest and most commercially active barangay in Meycauayan, hosting the main fire station, key businesses, and the city's primary industrial establishments.",
    geojson: {
      type: "Feature",
      properties: { id: 11, name: "Malhacan" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9480, 14.7240],
          [120.9743, 14.7231],
          [120.9752, 14.7362],
          [120.9491, 14.7371],
          [120.9480, 14.7240]
        ]]
      }
    }
  },
  {
    id: 12,
    name: "Pajo",
    captain: "Hon. Teresita O. Navarro",
    population: 11640,
    area: "1.09 km²",
    address: "Pajo, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1012",
    description: "Pajo is a wide-spanning southern barangay covering a significant area in the southwestern sector, with active community programs and local governance.",
    geojson: {
      type: "Feature",
      properties: { id: 12, name: "Pajo" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9350, 14.7000],
          [120.9613, 14.6991],
          [120.9622, 14.7121],
          [120.9361, 14.7131],
          [120.9350, 14.7000]
        ]]
      }
    }
  },
  {
    id: 13,
    name: "Pandayan",
    captain: "Hon. Alfredo N. Cruz",
    population: 24320,
    area: "1.42 km²",
    address: "Pandayan, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1013",
    description: "Pandayan is the second most populous barangay, serving as the seat of several key city government offices and hosting Police Community Precinct 3.",
    geojson: {
      type: "Feature",
      properties: { id: 13, name: "Pandayan" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9480, 14.7120],
          [120.9613, 14.7112],
          [120.9622, 14.7242],
          [120.9491, 14.7250],
          [120.9480, 14.7120]
        ]]
      }
    }
  },
  {
    id: 14,
    name: "Perez",
    captain: "Hon. Maricel S. Reyes",
    population: 22410,
    area: "1.35 km²",
    address: "Perez, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1014",
    description: "Perez is a densely populated urban barangay in the city center, host to the Meycauayan District Hospital and several vital civic institutions.",
    geojson: {
      type: "Feature",
      properties: { id: 14, name: "Perez" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9610, 14.7120],
          [120.9743, 14.7111],
          [120.9752, 14.7242],
          [120.9621, 14.7251],
          [120.9610, 14.7120]
        ]]
      }
    }
  },
  {
    id: 15,
    name: "Poblacion",
    captain: "Hon. Gregorio E. Lim",
    population: 20080,
    area: "1.20 km²",
    address: "Poblacion, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1015",
    description: "Poblacion is the historical town center of Meycauayan, containing the main city police station headquarters and the Meycauayan City Hall complex.",
    geojson: {
      type: "Feature",
      properties: { id: 15, name: "Poblacion" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9740, 14.7000],
          [120.9872, 14.6991],
          [120.9881, 14.7122],
          [120.9751, 14.7131],
          [120.9740, 14.7000]
        ]]
      }
    }
  },
  {
    id: 16,
    name: "Saluysoy",
    captain: "Hon. Lourdes K. Bautista",
    population: 12890,
    area: "1.38 km²",
    address: "Saluysoy, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1016",
    description: "Saluysoy occupies the southernmost portion of Meycauayan, bordering adjacent cities and known for its agricultural heritage transitioning to urbanization.",
    geojson: {
      type: "Feature",
      properties: { id: 16, name: "Saluysoy" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9350, 14.6880],
          [120.9613, 14.6871],
          [120.9622, 14.7001],
          [120.9361, 14.7011],
          [120.9350, 14.6880]
        ]]
      }
    }
  },
  {
    id: 17,
    name: "San Francisco",
    captain: "Hon. Dennis W. Abad",
    population: 13750,
    area: "1.06 km²",
    address: "San Francisco, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1017",
    description: "San Francisco is located in the northeastern quadrant, serving as a residential and light commercial hub with a growing population.",
    geojson: {
      type: "Feature",
      properties: { id: 17, name: "San Francisco" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9740, 14.7360],
          [120.9872, 14.7351],
          [120.9881, 14.7482],
          [120.9751, 14.7491],
          [120.9740, 14.7360]
        ]]
      }
    }
  },
  {
    id: 18,
    name: "San Jose",
    captain: "Hon. Carmelita I. Felipe",
    population: 13100,
    area: "1.04 km²",
    address: "San Jose, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1018",
    description: "San Jose is positioned at the eastern border, featuring a mix of residential subdivisions and light industry serving the broader eastern district.",
    geojson: {
      type: "Feature",
      properties: { id: 18, name: "San Jose" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9870, 14.7240],
          [120.9993, 14.7231],
          [121.0002, 14.7362],
          [120.9881, 14.7371],
          [120.9870, 14.7240]
        ]]
      }
    }
  },
  {
    id: 19,
    name: "San Juan",
    captain: "Hon. Victor H. Ortiz",
    population: 11890,
    area: "0.97 km²",
    address: "San Juan, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1019",
    description: "San Juan occupies the central-eastern corridor, known for its organized neighborhood associations and strong community health programs.",
    geojson: {
      type: "Feature",
      properties: { id: 19, name: "San Juan" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9740, 14.7120],
          [120.9872, 14.7111],
          [120.9881, 14.7242],
          [120.9751, 14.7251],
          [120.9740, 14.7120]
        ]]
      }
    }
  },
  {
    id: 20,
    name: "Santa Maria",
    captain: "Hon. Ponciano J. Delos Santos",
    population: 8740,
    area: "0.86 km²",
    address: "Santa Maria (Caingin), Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1020",
    description: "Also known as Caingin, Santa Maria is one of the smaller northern barangays with a close-knit community and a heritage-rich local culture.",
    geojson: {
      type: "Feature",
      properties: { id: 20, name: "Santa Maria" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9740, 14.7480],
          [120.9872, 14.7471],
          [120.9881, 14.7602],
          [120.9751, 14.7611],
          [120.9740, 14.7480]
        ]]
      }
    }
  },
  {
    id: 21,
    name: "Tugatog",
    captain: "Hon. Natividad G. Cabrera",
    population: 7320,
    area: "0.78 km²",
    address: "Tugatog, Meycauayan City, Bulacan 3020",
    contact: "(044) 840-1021",
    description: "Tugatog is the easternmost and one of the smallest barangays, serving as a buffer zone between Meycauayan and adjacent municipalities.",
    geojson: {
      type: "Feature",
      properties: { id: 21, name: "Tugatog" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [120.9870, 14.7000],
          [120.9993, 14.6991],
          [121.0002, 14.7122],
          [120.9881, 14.7131],
          [120.9870, 14.7000]
        ]]
      }
    }
  }
];

// Build GeoJSON FeatureCollection from all barangays
const BARANGAYS_GEOJSON = {
  type: "FeatureCollection",
  features: BARANGAYS_DATA.map(b => b.geojson)
};

// Map center for Meycauayan City
const MEYCAUAYAN_CENTER = [14.7240, 120.9639];
const MEYCAUAYAN_ZOOM = 14;
