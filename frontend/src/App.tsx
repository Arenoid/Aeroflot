import { useEffect, useState, useRef} from 'react'
import {
  Map,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import "maplibre-gl/dist/maplibre-gl.css"
import "./App.css"

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
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState(false)
  useEffect(() => {
    async function fetchWeather(latitude: number, longitude:number){
      try{
        setWeatherLoading(true)
        setWeatherError(false)

      const url = 
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}`+
        `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m`+
        `&wind_speed_unit=ms`

      const response = await fetch(url)
      
      if(!response.ok){
        throw new Error("Weather request failed")
      }

      const data = await response.json()

      setWeather(data.current)
    } catch (error){
      console.error("Weather Api error:", error)
      setWeatherError(true)
    } finally{
      setWeatherLoading(false)
    }

  }


    if(!mapContainer.current) return
    const map = new Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [85.324, 27.7172],
      zoom:10,
    });

    map.addControl(new NavigationControl(), "top-right");
      fetchWeather(27.7172, 85.324)
      map.on("moveend", ()=>{
        const center = map.getCenter()
        fetchWeather(center.lat, center.lng)
      })
    return () => map.remove()
  }, [])

  return(
    <div className='app'>
      <aside className='sidebar'>
      <h1>ÆeroFlot</h1>
      <section>
        <h2>Mission</h2>
        <button>Draw Search Area</button>
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