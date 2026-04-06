import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface CityResult {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  label: string;
}

export interface WeatherReport {
  location: string;
  timezone: string;
  updatedAtLabel: string;
  sunriseLabel: string;
  sunsetLabel: string;
  current: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    description: string;
    icon: string;
    theme: 'clear' | 'cloudy' | 'rainy' | 'storm';
  };
  daily: Array<{
    date: string;
    weekday: string;
    description: string;
    icon: string;
    max: number;
    min: number;
    precipitationProbability: number;
  }>;
}

interface GeocodingResponse {
  results?: Array<{
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    timezone: string;
  }>;
}

interface ForecastResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    is_day: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);

  searchCity(query: string): Observable<CityResult[]> {
    const params = new URLSearchParams({
      name: query,
      count: '5',
      language: 'es',
      format: 'json'
    });

    return this.http
      .get<GeocodingResponse>(
        `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`
      )
      .pipe(
        map((response) =>
          (response.results ?? []).map((city) => ({
            name: city.name,
            country: city.country,
            admin1: city.admin1,
            latitude: city.latitude,
            longitude: city.longitude,
            timezone: city.timezone,
            label: [city.name, city.admin1, city.country].filter(Boolean).join(', ')
          }))
        )
      );
  }

  getWeather(city: CityResult): Observable<WeatherReport> {
    const params = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      current:
        'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,is_day,wind_speed_10m',
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
      timezone: city.timezone || 'auto',
      forecast_days: '5'
    });

    return this.http
      .get<ForecastResponse>(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
      .pipe(map((response) => mapForecast(city, response)));
  }
}

function mapForecast(city: CityResult, response: ForecastResponse): WeatherReport {
  const currentVisual = describeWeather(
    response.current.weather_code,
    response.current.is_day === 1
  );

  return {
    location: city.label,
    timezone: city.timezone,
    updatedAtLabel: formatDateTime(response.current.time, city.timezone),
    sunriseLabel: formatClock(response.daily.sunrise[0], city.timezone),
    sunsetLabel: formatClock(response.daily.sunset[0], city.timezone),
    current: {
      temperature: Math.round(response.current.temperature_2m),
      apparentTemperature: Math.round(response.current.apparent_temperature),
      humidity: Math.round(response.current.relative_humidity_2m),
      windSpeed: Math.round(response.current.wind_speed_10m),
      precipitation: Math.round(response.current.precipitation),
      description: currentVisual.label,
      icon: currentVisual.icon,
      theme: currentVisual.theme
    },
    daily: response.daily.time.map((date, index) => {
      const visual = describeWeather(response.daily.weather_code[index], true);
      return {
        date,
        weekday: formatWeekday(date, city.timezone),
        description: visual.label,
        icon: visual.icon,
        max: Math.round(response.daily.temperature_2m_max[index]),
        min: Math.round(response.daily.temperature_2m_min[index]),
        precipitationProbability: Math.round(
          response.daily.precipitation_probability_max[index]
        )
      };
    })
  };
}

function describeWeather(
  code: number,
  isDay: boolean
): { label: string; icon: string; theme: 'clear' | 'cloudy' | 'rainy' | 'storm' } {
  if (code === 0) {
    return {
      label: 'Cielo despejado',
      icon: isDay ? '☀️' : '🌙',
      theme: 'clear'
    };
  }

  if ([1, 2, 3].includes(code)) {
    return {
      label: code === 1 ? 'Poco nuboso' : code === 2 ? 'Parcialmente nublado' : 'Nublado',
      icon: '⛅',
      theme: 'cloudy'
    };
  }

  if ([45, 48].includes(code)) {
    return {
      label: 'Neblina',
      icon: '🌫️',
      theme: 'cloudy'
    };
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return {
      label: 'Lluvia',
      icon: '🌧️',
      theme: 'rainy'
    };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return {
      label: 'Nieve',
      icon: '❄️',
      theme: 'cloudy'
    };
  }

  if ([95, 96, 99].includes(code)) {
    return {
      label: 'Tormenta',
      icon: '⛈️',
      theme: 'storm'
    };
  }

  return {
    label: 'Clima variable',
    icon: '🌤️',
    theme: 'cloudy'
  };
}

function formatWeekday(date: string, timezone: string): string {
  const formatted = new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    timeZone: timezone
  }).format(new Date(`${date}T12:00:00`));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace('.', '');
}

function formatClock(dateTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone
  }).format(new Date(dateTime));
}

function formatDateTime(dateTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone
  }).format(new Date(dateTime));
}
