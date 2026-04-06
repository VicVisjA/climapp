import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  of,
  switchMap
} from 'rxjs';

import { CityResult, WeatherReport, WeatherService } from './weather.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly weatherService = inject(WeatherService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly searchControl = new FormControl('Ciudad de Mexico', {
    nonNullable: true
  });
  protected readonly suggestions = signal<CityResult[]>([]);
  protected readonly weather = signal<WeatherReport | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((value) => {
          const query = value.trim();
          if (query.length < 2) {
            return of([]);
          }

          return this.weatherService
            .searchCity(query)
            .pipe(catchError(() => of([] as CityResult[])));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => this.suggestions.set(results));

    void this.searchWeather('Ciudad de Mexico');
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await this.searchWeather(this.searchControl.getRawValue());
  }

  protected async selectSuggestion(city: CityResult): Promise<void> {
    this.searchControl.setValue(city.label, { emitEvent: false });
    this.suggestions.set([]);
    await this.loadWeather(city);
  }

  protected cardTheme(): string {
    const report = this.weather();
    return report ? `weather-panel theme-${report.current.theme}` : 'weather-panel theme-idle';
  }

  private async searchWeather(query: string): Promise<void> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      this.errorMessage.set('Escribe al menos 2 letras para buscar una ciudad.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const results = await firstValueFrom(this.weatherService.searchCity(normalizedQuery));
      this.suggestions.set(results);

      if (!results.length) {
        this.errorMessage.set('No encontre esa ciudad. Prueba con otro nombre.');
        return;
      }

      await this.loadWeather(results[0]);
    } catch {
      this.errorMessage.set('No pude consultar el clima en este momento.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadWeather(city: CityResult): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const forecast = await firstValueFrom(this.weatherService.getWeather(city));
      this.weather.set(forecast);
    } catch {
      this.errorMessage.set('No pude cargar el pronostico de esa ciudad.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
