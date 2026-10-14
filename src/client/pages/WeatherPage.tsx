import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { WeatherData, FavoriteLocation, CitySearchResult } from '../../shared/types.js';

interface WeatherPageProps {
  searchedCity?: string | CitySearchResult;
  onClearSearch?: () => void;
}

export const WeatherPage: React.FC<WeatherPageProps> = ({ searchedCity, onClearSearch }) => {
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [showAlert, setShowAlert] = useState(true);
  const [currentCity, setCurrentCity] = useState('São Paulo');
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [favActionLoading, setFavActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cityTab, setCityTab] = useState<'brasil' | 'mundo' | 'favoritos'>('brasil');

  // Remove toast após 3.5 segundos
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const loadWeather = async (
    target: string | CitySearchResult | { city?: string; lat?: number; lon?: number; state?: string; country?: string }
  ) => {
    setLoading(true);
    setError(null);
    try {
      let params: { city?: string; lat?: number; lon?: number; state?: string; country?: string } = {};

      if (typeof target === 'string') {
        params = { city: target };
      } else if ('latitude' in target && 'longitude' in target) {
        params = {
          city: target.name,
          lat: target.latitude,
          lon: target.longitude,
          state: target.state,
          country: target.country,
        };
      } else {
        params = target;
      }

      const res = await api.getWeather(params);
      setWeather(res.data);
      setCurrentCity(res.data.location.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar dados meteorológicos.');
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const res = await api.getFavorites();
      setFavorites(res.favorites || []);
    } catch {
      // Ignora erro caso não autenticado
    }
  };

  useEffect(() => {
    if (searchedCity) {
      loadWeather(searchedCity);
    } else {
      loadWeather(currentCity);
    }
    loadFavorites();
  }, [searchedCity]);

  // Verifica se a cidade atual exibida está favoritada pelo usuário
  const currentFavoriteItem = weather
    ? favorites.find(
        (f) =>
          f.city_name.toLowerCase() === weather.location.name.toLowerCase() ||
          (Math.abs(f.latitude - weather.location.latitude) < 0.1 &&
            Math.abs(f.longitude - weather.location.longitude) < 0.1)
      )
    : undefined;

  const isCurrentFavorite = Boolean(currentFavoriteItem);

  const handleToggleFavorite = async () => {
    if (!weather) return;

    if (!user) {
      setToastMessage('⚠️ Faça login na sua conta para salvar cidades favoritas.');
      return;
    }

    setFavActionLoading(true);
    try {
      if (isCurrentFavorite && currentFavoriteItem) {
        await api.removeFavorite(currentFavoriteItem.id);
        setFavorites((prev) => prev.filter((f) => f.id !== currentFavoriteItem.id));
        setToastMessage(`Cidade ${weather.location.name} removida dos favoritos.`);
      } else {
        const res = await api.addFavorite({
          city_name: weather.location.name,
          state: weather.location.state,
          country: weather.location.country,
          latitude: weather.location.latitude,
          longitude: weather.location.longitude,
        });
        setFavorites((prev) => [res.favorite, ...prev]);
        setToastMessage(`⭐ ${weather.location.name} adicionada aos favoritos com sucesso!`);
      }
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : 'Falha ao atualizar favoritos.');
    } finally {
      setFavActionLoading(false);
    }
  };

  const handleRemoveFavoriteDirect = async (favId: string, cityName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.removeFavorite(favId);
      setFavorites((prev) => prev.filter((f) => f.id !== favId));
      setToastMessage(`Favorito ${cityName} removido.`);
    } catch {
      setToastMessage('Erro ao remover favorito.');
    }
  };

  const toDisplayTemp = (celsius: number) => {
    if (unit === 'F') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  };

  // Cidades do Brasil (Capitais e grandes centros)
  const brazilianCities = [
    { name: 'São Paulo', state: 'SP', country: 'Brasil', lat: -23.5505, lon: -46.6333, temp: 24, icon: 'partly_cloudy_day' },
    { name: 'Rio de Janeiro', state: 'RJ', country: 'Brasil', lat: -22.9068, lon: -43.1729, temp: 29, icon: 'wb_sunny' },
    { name: 'Brasília', state: 'DF', country: 'Brasil', lat: -15.7975, lon: -47.8919, temp: 26, icon: 'wb_sunny' },
    { name: 'Salvador', state: 'BA', country: 'Brasil', lat: -12.9777, lon: -38.5016, temp: 28, icon: 'wb_sunny' },
    { name: 'Curitiba', state: 'PR', country: 'Brasil', lat: -25.4284, lon: -49.2733, temp: 18, icon: 'cloud' },
    { name: 'Belo Horizonte', state: 'MG', country: 'Brasil', lat: -19.9167, lon: -43.9345, temp: 22, icon: 'rainy' },
    { name: 'Manaus', state: 'AM', country: 'Brasil', lat: -3.1190, lon: -60.0217, temp: 31, icon: 'thunderstorm' },
    { name: 'Porto Alegre', state: 'RS', country: 'Brasil', lat: -30.0346, lon: -51.2177, temp: 20, icon: 'partly_cloudy_day' },
    { name: 'Fortaleza', state: 'CE', country: 'Brasil', lat: -3.7319, lon: -38.5267, temp: 30, icon: 'wb_sunny' },
    { name: 'Recife', state: 'PE', country: 'Brasil', lat: -8.0476, lon: -34.8770, temp: 28, icon: 'wb_sunny' },
    { name: 'Florianópolis', state: 'SC', country: 'Brasil', lat: -27.5954, lon: -48.5480, temp: 21, icon: 'partly_cloudy_day' },
    { name: 'Belém', state: 'PA', country: 'Brasil', lat: -1.4558, lon: -48.4902, temp: 30, icon: 'thunderstorm' },
    { name: 'Goiânia', state: 'GO', country: 'Brasil', lat: -16.6869, lon: -49.2648, temp: 27, icon: 'wb_sunny' },
  ];

  // Cidades Internacionais (América, Europa, Ásia, Oceania)
  const worldCities = [
    { name: 'Nova York', state: 'NY', country: 'Estados Unidos', lat: 40.7128, lon: -74.0060, temp: 19, icon: 'cloud' },
    { name: 'Paris', state: 'Île-de-France', country: 'França', lat: 48.8566, lon: 2.3522, temp: 16, icon: 'partly_cloudy_day' },
    { name: 'Londres', state: 'Inglaterra', country: 'Reino Unido', lat: 51.5074, lon: -0.1278, temp: 14, icon: 'foggy' },
    { name: 'Tóquio', state: 'Kanto', country: 'Japão', lat: 35.6762, lon: 139.6503, temp: 21, icon: 'wb_sunny' },
    { name: 'Lisboa', state: 'Lisboa', country: 'Portugal', lat: 38.7223, lon: -9.1393, temp: 22, icon: 'wb_sunny' },
    { name: 'Buenos Aires', state: 'CABA', country: 'Argentina', lat: -34.6037, lon: -58.3816, temp: 18, icon: 'partly_cloudy_day' },
    { name: 'Miami', state: 'FL', country: 'Estados Unidos', lat: 25.7617, lon: -80.1918, temp: 29, icon: 'wb_sunny' },
    { name: 'Roma', state: 'Lazio', country: 'Itália', lat: 41.9028, lon: 12.4964, temp: 23, icon: 'wb_sunny' },
    { name: 'Berlim', state: 'Berlin', country: 'Alemanha', lat: 52.5200, lon: 13.4050, temp: 15, icon: 'cloud' },
    { name: 'Sydney', state: 'NSW', country: 'Austrália', lat: -33.8688, lon: 151.2093, temp: 22, icon: 'wb_sunny' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-6 flex flex-col gap-6 relative">
      {/* Toast Notification Flutuante */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-on-surface text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-white/10 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/60 hover:text-white ml-2"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* 1. Alerta Meteorológico INMET Oficial */}
      {showAlert && (
        <div className="w-full bg-amber-500/10 border border-amber-500/20 text-on-surface rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm relative overflow-hidden animate-in fade-in">
          <div className="flex items-center gap-3 z-10">
            <span className="flex h-9 w-9 rounded-xl bg-amber-500/20 text-amber-700 items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px] text-amber-600">warning</span>
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-0.5">
              <span className="font-mono text-xs text-amber-800 tracking-wider uppercase font-bold">
                Alerta INMET Oficial
              </span>
              <span className="hidden sm:inline text-outline-variant font-mono">•</span>
              <p className="text-xs text-on-surface font-medium">
                Rajadas de vento (até 65 km/h) e chuva moderada previstas a partir das 17h00 na Região Metropolitana.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 z-10 self-end md:self-auto">
            <span className="font-mono text-[11px] text-amber-800 bg-amber-500/20 px-2 py-0.5 rounded font-semibold">
              Nível 2: Atenção
            </span>
            <button
              onClick={() => setShowAlert(false)}
              className="p-1 text-on-surface-variant hover:text-on-surface rounded-md hover:bg-amber-500/10 transition-colors"
              title="Dispensar alerta"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Barra de Localização & Cidades (Favoritas, Brasil e Mundo) */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl shadow-sm border border-surface-container-highest">
              <span className="material-symbols-outlined text-primary text-[20px]">my_location</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface leading-tight">
                  GPS: {weather?.location.name || currentCity}, {weather?.location.state ? `${weather.location.state}, ` : ''}{weather?.location.country || 'Brasil'}
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant leading-none">
                  Lat: {weather?.location.latitude.toFixed(2)}° • Lon: {weather?.location.longitude.toFixed(2)}°
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-2 animate-pulse" title="Sinal GPS Ativo"></span>
            </div>

            <button
              onClick={() => loadWeather(currentCity)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-surface-container text-on-surface text-xs font-semibold rounded-xl border border-surface-container-highest transition-all shadow-sm"
              title="Recarregar dados meteorológicos"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">sync</span>
              <span className="hidden sm:inline">Sincronizar</span>
            </button>
          </div>

          {/* Alternador de Categorias de Cidades */}
          <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl border border-surface-container-highest self-start lg:self-auto">
            <button
              onClick={() => setCityTab('brasil')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                cityTab === 'brasil' ? 'bg-white text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>🇧🇷</span>
              <span>Brasil</span>
            </button>

            <button
              onClick={() => setCityTab('mundo')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                cityTab === 'mundo' ? 'bg-white text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>🌐</span>
              <span>Mundo</span>
            </button>

            <button
              onClick={() => setCityTab('favoritos')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                cityTab === 'favoritos'
                  ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="text-amber-500">⭐</span>
              <span>Favoritos ({favorites.length})</span>
            </button>
          </div>
        </div>

        {/* Lista Horizontal de Cidades Conforme a Categoria Selecionada */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {cityTab === 'favoritos' ? (
            favorites.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-on-surface-variant bg-surface-container-low rounded-xl border border-dashed border-surface-container-highest">
                <span className="material-symbols-outlined text-[16px] text-amber-500">star_outline</span>
                <span>Nenhuma cidade favoritada ainda. Clique em &ldquo;Favoritar&rdquo; no card abaixo para salvar suas cidades!</span>
              </div>
            ) : (
              favorites.map((fav) => {
                const isSelected = currentCity.toLowerCase() === fav.city_name.toLowerCase();
                return (
                  <div
                    key={fav.id}
                    className={`flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm'
                        : 'bg-white hover:bg-surface-container text-on-surface border-surface-container-highest'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        loadWeather({
                          city: fav.city_name,
                          lat: fav.latitude,
                          lon: fav.longitude,
                          state: fav.state || undefined,
                          country: fav.country,
                        })
                      }
                      className="flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px] text-amber-500">star</span>
                      <span>{fav.city_name}</span>
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        {fav.state || fav.country}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFavoriteDirect(fav.id, fav.city_name, e)}
                      className="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center text-outline hover:text-error ml-1"
                      title="Remover dos favoritos"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </div>
                );
              })
            )
          ) : (
            (cityTab === 'brasil' ? brazilianCities : worldCities).map((c) => {
              const isSelected = currentCity.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={`${c.name}_${c.lat}`}
                  onClick={() =>
                    loadWeather({
                      city: c.name,
                      lat: c.lat,
                      lon: c.lon,
                      state: c.state,
                      country: c.country,
                    })
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    isSelected
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white hover:bg-surface-container text-on-surface border border-surface-container-highest'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isSelected ? 'location_on' : c.icon}
                  </span>
                  <span>{c.name}</span>
                  <span
                    className={`font-mono text-[10px] px-1 py-0.2 rounded ${
                      isSelected
                        ? 'bg-primary-container text-white'
                        : 'bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    {c.temp}°C
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* 3. Conteúdo Principal: Grid 12 Colunas */}
      {loading ? (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-surface-container-highest p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-on-surface-variant font-mono">
            Sincronizando telemetria com estações meteorológicas...
          </p>
        </div>
      ) : error ? (
        <div className="w-full bg-red-50 border border-red-200 text-red-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-red-600">error</span>
            <div>
              <h3 className="text-sm font-bold">Falha na telemetria</h3>
              <p className="text-xs">{error}</p>
            </div>
          </div>
          <button
            onClick={() => loadWeather('São Paulo')}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      ) : weather ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Coluna Esquerda & Centro (8 Colunas) */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            {/* HERO Card do Estado Atmosférico Atual */}
            <section className="relative w-full rounded-2xl bg-white border border-surface-container-highest shadow-sm overflow-hidden p-6 lg:p-8 flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 flex flex-col gap-6">
                {/* Cabeçalho do Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[22px]">location_on</span>
                      <h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight">
                        {weather.location.name}, {weather.location.state || weather.location.country}
                      </h1>
                      <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md font-semibold">
                        {weather.location.country}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-2">
                      <span>Fuso: {weather.location.timezone}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Telemetria ativa em tempo real
                      </span>
                    </p>
                  </div>

                  {/* Ações: Favoritar & Alternador °C / °F */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Botão de Favoritar no Cloudflare D1 */}
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      disabled={favActionLoading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isCurrentFavorite
                          ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-xs'
                          : 'bg-white hover:bg-surface-container text-on-surface border-surface-container-highest shadow-xs'
                      }`}
                      title={
                        isCurrentFavorite
                          ? 'Clique para remover dos seus favoritos'
                          : user
                          ? 'Salvar esta cidade nos favoritos'
                          : 'Faça login para salvar favoritos'
                      }
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] transition-transform ${
                          isCurrentFavorite ? 'text-amber-500 font-bold' : 'text-outline'
                        }`}
                      >
                        {isCurrentFavorite ? 'star' : 'star_border'}
                      </span>
                      <span>{isCurrentFavorite ? 'Favorita' : 'Favoritar'}</span>
                    </button>

                    {/* Alternador °C / °F */}
                    <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-surface-container-highest">
                      <button
                        onClick={() => setUnit('C')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          unit === 'C' ? 'bg-white text-primary shadow-xs' : 'text-on-surface-variant'
                        }`}
                      >
                        °C Métrico
                      </button>
                      <button
                        onClick={() => setUnit('F')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          unit === 'F' ? 'bg-white text-primary shadow-xs' : 'text-on-surface-variant'
                        }`}
                      >
                        °F Imperial
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bloco Central de Temperatura & Ícone */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
                  <div className="md:col-span-7 flex items-center gap-6">
                    <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-2xl bg-gradient-to-br from-amber-400/20 via-sky-400/15 to-primary/10 flex items-center justify-center text-amber-500 shadow-sm shrink-0 border border-amber-200/50">
                      <span className="material-symbols-outlined text-[64px] animate-pulse">
                        {weather.current.condition_icon}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-baseline">
                        <span className="text-5xl lg:text-6xl font-extrabold text-on-surface tracking-tighter font-tabular">
                          {toDisplayTemp(weather.current.temperature)}
                        </span>
                        <span className="text-2xl font-bold text-primary ml-1">°{unit}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-on-surface">
                          Sensação: <strong className="text-primary">{toDisplayTemp(weather.current.apparent_temperature)}°{unit}</strong>
                        </span>
                        <span className="text-outline-variant">•</span>
                        <span className="font-mono text-xs text-on-surface-variant">
                          Máx {toDisplayTemp(weather.current.max_temp)}° • Mín {toDisplayTemp(weather.current.min_temp)}°
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-2 font-medium">
                        {weather.current.condition_text}. Vento soprando do {weather.current.wind_direction_cardinal}.
                      </p>
                    </div>
                  </div>

                  {/* Metadados da Estação */}
                  <div className="md:col-span-5 bg-surface-container-low rounded-xl p-4 flex flex-col justify-between gap-3 border border-surface-container-highest">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-on-surface-variant uppercase font-bold">
                        Estação de Referência
                      </span>
                      <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded text-primary font-semibold border border-surface-container-highest">
                        {weather.location.station_id}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="block font-mono text-[10px] text-outline">Ponto Orvalho</span>
                        <span className="text-xs font-bold text-on-surface font-tabular">
                          {weather.current.dew_point}°C
                        </span>
                      </div>
                      <div className="border-x border-surface-container-highest">
                        <span className="block font-mono text-[10px] text-outline">Nuvens</span>
                        <span className="text-xs font-bold text-on-surface font-tabular">
                          {weather.current.cloud_cover}%
                        </span>
                      </div>
                      <div>
                        <span className="block font-mono text-[10px] text-outline">Chuva Hoje</span>
                        <span className="text-xs font-bold text-primary font-tabular">
                          {weather.current.precipitation_mm} mm
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, weather.current.cloud_cover)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 6 Micro-Métricas Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                  {/* 1. Umidade */}
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container-highest flex flex-col justify-between">
                    <div className="flex items-center justify-between text-primary mb-1">
                      <span className="text-xs text-on-surface-variant font-medium">Umidade</span>
                      <span className="material-symbols-outlined text-[18px]">humidity_percentage</span>
                    </div>
                    <span className="text-lg font-bold text-on-surface font-tabular">
                      {weather.current.relative_humidity}%
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded w-fit mt-1">
                      Confortável
                    </span>
                  </div>

                  {/* 2. Vento */}
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container-highest flex flex-col justify-between">
                    <div className="flex items-center justify-between text-primary mb-1">
                      <span className="text-xs text-on-surface-variant font-medium">Vento</span>
                      <span className="material-symbols-outlined text-[18px]">air</span>
                    </div>
                    <span className="text-lg font-bold text-on-surface font-tabular">
                      {weather.current.wind_speed} <span className="text-xs font-normal">km/h</span>
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant mt-1 truncate">
                      {weather.current.wind_direction_cardinal}
                    </span>
                  </div>

                  {/* 3. Índice UV */}
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container-highest flex flex-col justify-between">
                    <div className="flex items-center justify-between text-tertiary mb-1">
                      <span className="text-xs text-on-surface-variant font-medium">Índice UV</span>
                      <span className="material-symbols-outlined text-[18px]">wb_twilight</span>
                    </div>
                    <span className="text-lg font-bold text-on-surface font-tabular">
                      {weather.current.uv_index}{' '}
                      <span className="text-xs text-amber-600 font-semibold">Moderado</span>
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant mt-1">FPS Recomendado</span>
                  </div>

                  {/* 4. Pressão */}
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container-highest flex flex-col justify-between">
                    <div className="flex items-center justify-between text-primary mb-1">
                      <span className="text-xs text-on-surface-variant font-medium">Pressão</span>
                      <span className="material-symbols-outlined text-[18px]">speed</span>
                    </div>
                    <span className="text-lg font-bold text-on-surface font-tabular">
                      {weather.current.surface_pressure} <span className="text-xs font-normal">hPa</span>
                    </span>
                    <span className="font-mono text-[10px] text-primary mt-1">Barômetro Normal</span>
                  </div>

                  {/* 5. Visibilidade */}
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container-highest flex flex-col justify-between">
                    <div className="flex items-center justify-between text-primary mb-1">
                      <span className="text-xs text-on-surface-variant font-medium">Visibilidade</span>
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </div>
                    <span className="text-lg font-bold text-on-surface font-tabular">
                      {weather.current.visibility_km} <span className="text-xs font-normal">km</span>
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded w-fit mt-1">
                      Excelente
                    </span>
                  </div>

                  {/* 6. Qualidade do Ar AQI */}
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container-highest flex flex-col justify-between">
                    <div className="flex items-center justify-between text-emerald-600 mb-1">
                      <span className="text-xs text-on-surface-variant font-medium">AQI Ar</span>
                      <span className="material-symbols-outlined text-[18px]">eco</span>
                    </div>
                    <span className="text-lg font-bold text-on-surface font-tabular">
                      {weather.current.air_quality_aqi}{' '}
                      <span className="text-xs text-emerald-600 font-semibold">Boa</span>
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant mt-1">PM2.5 Ótimo</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Curva de Previsão Horária (24h) */}
            <section className="w-full bg-white rounded-2xl border border-surface-container-highest shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-on-surface">Curva Horária de Telemetria (24 Horas)</h2>
                  <p className="text-xs text-on-surface-variant">
                    Projeção horária de temperatura e probabilidade de chuva
                  </p>
                </div>
                <span className="font-mono text-[11px] text-primary bg-surface-container px-2 py-0.5 rounded font-semibold">
                  Janela Contínua
                </span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-3 pt-2">
                {weather.hourly.map((h, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-between min-w-[72px] p-3 rounded-xl bg-surface-container-low border border-surface-container-highest/80 hover:bg-surface-container transition-colors"
                  >
                    <span className="font-mono text-xs font-semibold text-on-surface-variant">{h.hour}</span>
                    <span className="material-symbols-outlined text-2xl text-primary my-2">
                      {h.condition_icon}
                    </span>
                    <span className="text-sm font-bold text-on-surface font-tabular">
                      {toDisplayTemp(h.temperature)}°
                    </span>
                    <div className="mt-2 flex items-center gap-0.5 text-[10px] font-mono text-primary font-semibold">
                      <span className="material-symbols-outlined text-[12px]">water_drop</span>
                      <span>{h.precipitation_probability}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Coluna Direita (4 Colunas) - Previsão 7 Dias & Telemetria do Radar */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            {/* Previsão Semanal 7 Dias */}
            <section className="bg-white rounded-2xl border border-surface-container-highest shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-surface-container-highest pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
                  <h3 className="text-base font-bold text-on-surface">Previsão 7 Dias</h3>
                </div>
                <span className="font-mono text-[11px] text-on-surface-variant font-medium">Estadual</span>
              </div>

              <div className="flex flex-col divide-y divide-surface-container-highest/70">
                {weather.daily.map((d, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-on-surface w-12">{d.day_of_week}</span>
                    <div className="flex items-center gap-1.5 w-24">
                      <span className="material-symbols-outlined text-base text-primary">
                        {d.condition_icon}
                      </span>
                      <span className="text-[11px] text-on-surface-variant truncate">{d.condition_text}</span>
                    </div>
                    <div className="flex items-center gap-2 font-tabular font-mono">
                      <span className="text-xs font-bold text-on-surface">{toDisplayTemp(d.max_temp)}°</span>
                      <span className="text-xs text-outline">{toDisplayTemp(d.min_temp)}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Radar Meteorológico & Telemetria de Segurança */}
            <section className="bg-surface-container-high rounded-2xl border border-surface-container-highest shadow-sm p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-primary uppercase">Radar & Satélite</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <h4 className="text-sm font-bold text-on-surface">Rede Integrada de Satélites GOES-16</h4>
              <p className="text-xs text-on-surface-variant">
                Varredura barométrica atualizada a cada 10 minutos com dados criptografados e salvos no Cloudflare D1.
              </p>
              <div className="h-28 bg-surface-container-lowest rounded-xl border border-surface-container-highest flex items-center justify-center p-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-radial from-primary/10 via-transparent to-transparent"></div>
                <div className="flex flex-col items-center gap-1 text-center z-10">
                  <span className="material-symbols-outlined text-3xl text-primary animate-spin">radar</span>
                  <span className="font-mono text-[10px] text-on-surface font-bold">RADAR EM TEMPO REAL</span>
                  <span className="font-mono text-[9px] text-outline">Latência: 12ms • Resolução 1km²</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
};
