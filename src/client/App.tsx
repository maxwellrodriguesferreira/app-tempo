import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { AboutModal } from './components/AboutModal.js';
import { WeatherPage } from './pages/WeatherPage.js';
import { AuthPage } from './pages/AuthPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { InfrastructurePage } from './pages/InfrastructurePage.js';

import { CitySearchResult } from '../shared/types.js';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('weather');
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [searchedCity, setSearchedCity] = useState<string | CitySearchResult | undefined>(undefined);

  const handleSearchCity = (city: string | CitySearchResult) => {
    setSearchedCity(city);
    setCurrentTab('weather');
  };

  const handleSelectTab = (tab: string) => {
    if (tab === 'about') {
      setIsAboutOpen(true);
      return;
    }
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-surface">
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onSearchCity={handleSearchCity}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      <main className="w-full pt-16 flex-1">
        {currentTab === 'weather' && (
          <WeatherPage
            searchedCity={searchedCity}
            onClearSearch={() => setSearchedCity(undefined)}
          />
        )}
        {currentTab === 'auth' && (
          <AuthPage onSuccessLogin={() => setCurrentTab('weather')} />
        )}
        {currentTab === 'admin' && (
          user?.role === 'admin' ? (
            <AdminPage />
          ) : (
            <div className="w-full max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-surface-container-highest text-center">
              <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">lock</span>
              <h2 className="text-lg font-bold text-on-surface">Acesso Restrito ao Painel Administrativo</h2>
              <p className="text-xs text-on-surface-variant mt-1 mb-4">
                Esta área exige privilégios de administrador (role: admin).
              </p>
              <button
                onClick={() => setCurrentTab('auth')}
                className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg"
              >
                Autenticar como Administrador
              </button>
            </div>
          )
        )}
        {currentTab === 'infra' && <InfrastructurePage />}
      </main>

      <Footer onOpenAbout={() => setIsAboutOpen(true)} />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onNavigate={(tab) => {
          setIsAboutOpen(false);
          setCurrentTab(tab);
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
