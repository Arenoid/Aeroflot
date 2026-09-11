import { useEffect, useState, useRef} from 'react'
import {
  Map,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import "maplibre-gl/dist/maplibre-gl.css"
import "./App.css"
import {area} from "@turf/area"
import {polygon } from '@turf/helpers'

setWorkerUrl(workerUrl)

type WeatherData = {
  temperature_2m: number
  relative_humidity_2m: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_gusts_10m: number;
  wind_direction_10m: number;
}

function getWeatherDescription(code: number){
  if(code === 0) return "Clear"
  if([1,2,3].includes(code)) return "Cloudy"
  if([45,48].includes(code)) return "Fog"
  if([51,53,55].includes(code)) return "Drizzle"
  if([61,63,65].includes(code)) return "Rain"
  if([71,73,75].includes(code)) return "Snow"
  if([80,81, 82].includes(code)) return "Rain Showers"
  if([95,96,99].includes(code)) return "Thunderstorm"

  return "Unknown"
}

function App(){
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const drawingRef = useRef(false)
  const pointsRef = useRef<[number, number][]>([])
  const rectangleStartRef = useRef<[number, number] | null>(null)
  const [searchAreaKm2, setSearchAreaKm2] = useState<number|null >(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState(false)
  
  
    useEffect(() =>{
      async function fetchWeather(latitude: number, longitude: number){
      try {
        setWeatherLoading(true)
        setWeatherError(false)

        const url = 
        `https://api.open-meteo.com/v1/forecast`+
        `?latitude=${latitude}`+
        `&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m`+
        `&wind_speed_unit=ms`

        const response = await fetch(url)
        if(!response.ok){
          throw new Error("Weather request failed")
        }
        const data = await response.json()
        setWeather(data.current)
      } catch(error){
        console.error("Weather Api down!", error)
        setWeatherError(true)
      }finally{
        setWeatherLoading(false)
      }  
    }

    if(!mapContainer.current) return

    const map = new Map({
      container:mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [85.324, 27.7172],
      zoom: 10,
    })

    mapRef.current = map
    map.addControl(new NavigationControl(), "top-right")

  map.on("load", () => {
    map.addSource("search-area",{
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    })

    map.addSource("search-preview", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    })

    map.addLayer({
      id: "search-area-fill",
      type: "fill",
      source: "search-area",
      filter: ['==', "$type", "Polygon"],
      paint:{
        "fill-color": "#ff0000",
        "fill-opacity": 0.2,
      },
    })
    
    map.addLayer({
      id: "search-area-line",
      type: "line",
      source: "search-area",
      paint: {
        "line-color": "#ff0000",
        "line-width": 3,
      },
    })

    map.addLayer({
      id: "search-preview-fill",
      type: "fill",
      source: "search-preview",
      filter: ["==", "$type", "Polygon"],
      paint:{
        "fill-color": "#ff0000",
        "fill-opacity": 0.08,
      },
    })

    map.addLayer({
      id: "search-preview-line",
      type: "line",
      source: "search-preview",
      filter: ["==", "$type", "Polygon"],
      paint: {
        "line-color": "#ff0000",
        "line-width": 2,
        "line-dasharray": [2,2],
      },
    })

    map.addLayer({
      id: "search-start-point",
      type: "circle",
      source: "search-preview",
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#ff0000",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      }
    })
  })

  map.on("click", (event) => {
    if(!drawingRef.current) return
    const point: [number, number] = [
      event.lngLat.lng,
      event.lngLat.lat,
    ]
    if(!rectangleStartRef.current){
      rectangleStartRef.current = point
      const previewSource = map.getSource(
        "search-preview"
      ) as GeoJSONSource

      if(previewSource){
        previewSource.setData({
          type: "FeatureCollection",
          features:[
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: point,
              },
            },
          ],
        })
      }
      console.log("First Rectangle Corner", point)
    map.on("mousemove", (event) => {
      if(!drawingRef.current) return
      if(!rectangleStartRef.current) return

      const start = rectangleStartRef.current

      const current: [number, number] = [
        event.lngLat.lng,
        event.lngLat.lat,
      ]

      const [lng1, lat1] = start
      const [lng2, lat2] = current

      const previewRectangle: [number, number][] = [
        [lng1, lat1],
        [lng2, lat1],
        [lng2, lat2],
        [lng1, lat2],
        [lng1, lat1],
      ]

      const previewSource = map.getSource(
        "search-preview"
      ) as GeoJSONSource

      if(!previewSource) return

      previewSource.setData({
        type: "FeatureCollection",
        features: [
          {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [previewRectangle],
          },
        },

        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: start,
          },
        },
      ],
    })
  })
      return
    }

    const start = rectangleStartRef.current

    const [lng1, lat1] = start
    const [lng2, lat2] = point

    const rectangle: [number, number][] = [
      [lng1, lat1],
      [lng2, lat1],
      [lng2, lat2],
      [lng1, lat2],
      [lng1, lat1],
    ]

    const rectangleFeature = polygon([rectangle])
    const source = map.getSource("search-area") as GeoJSONSource
    if(!source) return
    source.setData(rectangleFeature)
    
    const squareMeters = area(rectangleFeature)
    const squareKilometers = squareMeters/1_000_000
    setSearchAreaKm2(squareKilometers)

    pointsRef.current = rectangle

    drawingRef.current = false
    rectangleStartRef.current = null
    setIsDrawing(false)

    map.getCanvas().style.cursor = ""

    console.log("Rectangle:", rectangle)
    console.log("Area:", squareKilometers, "km²")
  })
  fetchWeather(27.7172, 85.324)

  map.on("moveend", () => {
    const center = map.getCenter()
    fetchWeather(center.lat, center.lng)
  })

  return () => {
    map.remove()
    mapRef.current = null
  }
  }, [])  
  function handleDrawSearchArea() {
    const map = mapRef.current
    if(!map) return
    if(!isDrawing){
      drawingRef.current = true
      rectangleStartRef.current = null
      pointsRef.current = []
      
      setIsDrawing(true)
      setSearchAreaKm2(null)

      const source = map.getSource("search-area") as GeoJSONSource

      if(source){
        source.setData({
          type: "FeatureCollection",
          features: [],
        })
      }

      map.getCanvas().style.cursor = "crosshair"
    }else{
      drawingRef.current = false
      rectangleStartRef.current = null
      setIsDrawing(false)

      const previewSource = map.getSource(
        "search-preview"
      ) as GeoJSONSource

      if(previewSource){
        previewSource.setData({
          type: "FeatureCollection",
          features: [],
        })
      }
      map.getCanvas().style.cursor = ""
    }
  }
  return(
    <div className='app'>
      <aside className='sidebar'>
      <h1>ÆeroFlot</h1>
      <section>
        <h2>Mission</h2>
        <button onClick={handleDrawSearchArea}>{isDrawing ? "Cancel Drawing": "Draw Area"}</button>
        {isDrawing &&(
          <p>Click two opposite corners.</p>
        )}

        {searchAreaKm2 !== null &&(
          <p>
            Search Area: <strong>{searchAreaKm2.toFixed(2)} km²</strong>
          </p>
        )}
      </section>

      <section>
      <h2>Drones</h2>
      <p>No Drones added yet.</p>
      </section>

      <section>
      <h2>Weather</h2>
      {weatherLoading && <p>Loading weather...</p>}
      {weatherError && <p>Could not load Weather</p>}
      {weather && !weatherLoading && (
        <div className='weather-card'>
          <h3>{getWeatherDescription(weather.weather_code)}</h3>

          <p>
            Temperature : <strong>{weather.temperature_2m} °C</strong>
          </p>

          <p>
            Wind: <strong>{weather.wind_speed_10m} m/s</strong>
          </p>

          <p>
            Gusts: <strong>{weather.wind_gusts_10m} m/s</strong>
          </p>

          <p>
            Precipitation: <strong>{weather.precipitation} mm</strong>
          </p>

          <p>
            Wind Direction: <strong>{weather.wind_direction_10m}°</strong>
          </p>
        </div>
      )}

      </section>

      </aside>

      <main ref = {mapContainer} className = "map"></main>
    </div>
  )
}

export default App;