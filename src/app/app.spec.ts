import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';
import { WeatherService } from './weather.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: WeatherService,
          useValue: {
            searchCity: () =>
              of([
                {
                  name: 'Ciudad de Mexico',
                  country: 'Mexico',
                  latitude: 19.43,
                  longitude: -99.13,
                  timezone: 'America/Mexico_City',
                  label: 'Ciudad de Mexico, Mexico'
                }
              ]),
            getWeather: () =>
              of({
                location: 'Ciudad de Mexico, Mexico',
                timezone: 'America/Mexico_City',
                updatedAtLabel: '6 abr, 09:00',
                sunriseLabel: '06:25',
                sunsetLabel: '18:52',
                current: {
                  temperature: 24,
                  apparentTemperature: 26,
                  humidity: 42,
                  windSpeed: 11,
                  precipitation: 0,
                  description: 'Cielo despejado',
                  icon: '☀️',
                  theme: 'clear'
                },
                daily: [
                  {
                    date: '2026-04-06',
                    weekday: 'Lun',
                    description: 'Cielo despejado',
                    icon: '☀️',
                    max: 27,
                    min: 13,
                    precipitationProbability: 5
                  }
                ]
              })
          }
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the weather heading', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Explora el clima de cualquier ciudad'
    );
  });
});
