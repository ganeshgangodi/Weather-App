import React, { useState } from "react";
import "./index.css";

/**
 * Simple Weather App using:
 * - Open-Meteo geocoding API for city -> lat/lon
 * - Open-Meteo forecast API for current weather
 *
 * No API key required.
 */

function weatherCodeToText(code) {
  // Map Open-Meteo weather codes to human text (summary)
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] ?? "Unknown";
}

function weatherCodeToEmoji(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([56, 57, 66, 67].includes(code)) return "🧊🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🔆";
}

export default function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null); // { cityName, latitude, longitude, current: {...} }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchWeatherForCity(cityName) {
    setLoading(true);
    setError(null);
    setWeather(null);

    try {
      // 1) Geocoding: get lat/lon for city
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cityName
      )}&count=1`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) throw new Error("Geocoding request failed");
      const geoJson = await geoRes.json();

      if (!geoJson.results || geoJson.results.length === 0) {
        setError("City not found. Try another name (e.g., 'Delhi', 'San Francisco').");
        return;
      }

      const top = geoJson.results[0];
      const { latitude, longitude, name: resolvedName, country, admin1 } = top;

      // 2) Forecast: get current weather
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
      const forecastRes = await fetch(forecastUrl);
      if (!forecastRes.ok) throw new Error("Weather request failed");
      const forecastJson = await forecastRes.json();

      const current = forecastJson.current_weather;
      if (!current) throw new Error("No current weather available");

      setWeather({
        cityName: `${resolvedName}${admin1 ? ", " + admin1 : ""}, ${country}`,
        latitude,
        longitude,
        current, // { temperature, windspeed, winddirection, weathercode, time }
      });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const q = city.trim();
    if (!q) {
      setError("Please enter a city name.");
      return;
    }
    fetchWeatherForCity(q);
  }

  return (
    <div className="app-root">
      <div className="card">
        <h1 className="title">Weather Now</h1>
        <p className="subtitle">Quick current weather for any city (Open-Meteo)</p>

        <form onSubmit={handleSubmit} className="search-form">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city (e.g., London, Delhi)"
            className="input"
            aria-label="City name"
          />
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Searching..." : "Get Weather"}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        {weather && (
          <div className="weather-card">
            <div className="weather-header">
              <div className="city">{weather.cityName}</div>
              <div className="coords">
                Lat: {weather.latitude.toFixed(3)} • Lon: {weather.longitude.toFixed(3)}
              </div>
            </div>

            <div className="weather-main">
              <div className="emoji">{weatherCodeToEmoji(weather.current.weathercode)}</div>
              <div className="temp">
                <div className="deg">{weather.current.temperature}°C</div>
                <div className="desc">{weatherCodeToText(weather.current.weathercode)}</div>
              </div>
            </div>

            <div className="weather-details">
              <div>Wind: {weather.current.windspeed} km/h</div>
              <div>Wind dir: {Math.round(weather.current.winddirection)}°</div>
              <div>Observed: {new Date(weather.current.time).toLocaleString()}</div>
            </div>

            <div className="footer-note">
              Data from Open-Meteo • <a
                href={`https://www.openstreetmap.org/?mlat=${weather.latitude}&mlon=${weather.longitude}#map=10/${weather.latitude}/${weather.longitude}`}
                target="_blank"
                rel="noreferrer"
              >View on map</a>
            </div>
          </div>
        )}

        <div className="notes">
          Tip: If a city name matches many places, try "City, Country" (e.g., "Paris, FR").
        </div>
      </div>
    </div>
  );
}
