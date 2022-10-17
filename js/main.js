var map = L.map('map', {
        center: [37.8, -96],
        zoom: 5,
        minZoom: 4
    });
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
       attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


$.getJSON("data/homeprice.geojson")
    .done(function(data) {
        var info = processData(data);
        createPropSymbols(info.timestamps,data);
        createSliderUI(info.timestamps);
    })
.fail(function() { alert("there is an issue with the data")});

//Everything labelled PG is for polygon, as it's all related to the Chloropleth data
$.getJSON("data/stateprices.geojson")
    .done(function(dataPG) {
        var chloropleth = processDataPG(dataPG);
        createChloropleth(chloropleth.timestampsPG.dataPG);
        
    })
.fail(function() { alert("there is an issue with the data")});

function getColor(d) {
    return d > 800000  ? '#d7191c' :
           d > 600000  ? '#fdae61' :
           d > 400000  ? '#ffffbf' :
           d > 200000  ? '#a6d96a' :
           d > 1       ? '#1a9641' :
                      '#ffffff';
}

function createChloropleth(timestampsPG, dataPG) {
    states = L.geoJSON(dataPG, {
        style: function(feature) {
            return {
                fillColor: getColor(feature.properties.density),
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };            

        }
    }).addTo(map);
}

function processDataPG(dataPG) {
    var timestampsPG = [];
    var minPG = Infinity;
    var maxPG = -Infinity;
    
    for (var featurePG in dataPG.featuresPG) {
        var propertiesPG = dataPG.featuresPG[feature].propertiesPG;
        for (var attributePG in propertiesPG) {
            if ( attributePG != 'GEO_ID' &&
               attributePG != 'STATE' &&
               attributePG != 'NAME' &&
               attributePG != 'LSAD' &&
               attributePG != 'CENSUSAREA' &&
               attributePG != 'FIELD1' ) {
                
                if ($.inArray(attributePG,timestampsPG) === -1) {
                    timestampsPG.push(attributePG);
                }
                if (properties[attributePG] < minPG) {
                    minPG = propertiesPG[attributePG];
                }
                if (propertiesPG[attributePG] > maxPG) {
                    maxPG = propertiesPG[attributePG];
                }
            }
        }
    }
    return {
        timestampsPG : timestampsPG,
        minPG : minPG,
        maxPG : maxPG
    }
}



//This is where all the functions for the Proportional Symbols are located
function processData(data) {
    var timestamps = [];
    var min = Infinity;
    var max = -Infinity;
    
    for (var feature in data.features) {
        var properties = data.features[feature].properties;
        for (var attribute in properties) {
            if ( attribute != 'RegionName' &&
               attribute != 'State' &&
               attribute != 'Lat' &&
               attribute != 'Long' ) {
                
                if ($.inArray(attribute,timestamps) === -1) {
                    timestamps.push(attribute);
                }
                if (properties[attribute] < min) {
                    min = properties[attribute];
                }
                if (properties[attribute] > max) {
                    max = properties[attribute];
                }
            }
        }
    }
    return {
        timestamps : timestamps,
        min : min,
        max : max
    }
}

function createPropSymbols(timestamps, data) {
  cities = L.geoJson(data, {
      pointToLayer: function(feature, latlng) {
          return L.circleMarker(latlng, { 
              fillColor: "#224FB4",  
              color: '#224FB4',      
              weight: 2,             
              fillOpacity: 0.5       
          }).on({
                mouseover: function(e) {
                    this.openPopup();
                    this.setStyle({fillColor: 'green'});  // fill color turns green when mouseover
                },
                mouseout: function(e) {
                    this.closePopup();
                    this.setStyle({fillColor: '#224FB4'});  // fill turns original color when mouseout
                }
        });
      }
  }).addTo(map);
  updatePropSymbols(timestamps[0]); 
}

function updatePropSymbols(timestamp) {
  cities.eachLayer(function(layer) {  // eachLayer() is an Leaflet function to iterate over the layers/points of the map

      var props = layer.feature.properties;   // attributes
      var radius = calcPropRadius(props[timestamp]); // circle radius, calculation function defined below

      // pop-up information (when mouseover) for each city is also defined here
      var popupContent = props.RegionName + ' in ' + timestamp + "<p>" + ' Average Cost: $' + String(props[timestamp]) ;

      layer.setRadius(radius);  // Leaflet method for setting the radius of a circle
      layer.bindPopup(popupContent, { offset: new L.Point(0,-radius) }); // bind the popup content, with an offset
  });
}

function calcPropRadius(attributeValue) {

  var scaleFactor = 0.05;   // the scale factor is used to scale the values; the units of the radius are in meters
                             // you may determine the scale factor accordingly based on the range of the values and the mapping scale
  var area = attributeValue * scaleFactor;

  return Math.sqrt(area/Math.PI);  // the function return the radius of the circle to be used in the updatePropSymbols()
}

function createSliderUI(timestamps) {
  var sliderControl = L.control({ position: 'bottomleft'} );

  sliderControl.onAdd = function(map) {
    //initialize a range slider with mousedown control
      var slider = L.DomUtil.create("input", "range-slider");
      L.DomEvent.addListener(slider, 'mousedown', function(e) {
          L.DomEvent.stopPropagation(e);
      });

    var labels = ["2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011","2012","2013","2014","2015","2016","20017","2018","2019","2020","2021","2022"];

    $(slider)
        .attr({
          'type':'range',
          'max': timestamps[timestamps.length-1],
          'min':timestamps[0],
          'step': 1, // Change this to match the numeric interval between adjacent timestamps
          'value': String(timestamps[0])
        })
        .on('input change', function() {
            updatePropSymbols($(this).val().toString()); // automatic update the map for the timestamp
            var i = $.inArray(this.value,timestamps);
            $(".temporal-legend").text(labels[i]); // automatic update the label for the timestamp
        });
    return slider;
  }
  sliderControl.addTo(map);
  createTimeLabel("2000"); //The starting timestamp label
  }

function createTimeLabel(startTimestamp) {
    var temporalLegend = L.control({position: 'bottomleft' }); // same position as the slider
                       // One more use of L.control !!
    temporalLegend.onAdd = function(map) {
      var output = L.DomUtil.create("output", "temporal-legend");
      $(output).text(startTimestamp);
      return output;
    }
    temporalLegend.addTo(map);
  }

