import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PixelMesh from './components/PixelMesh';
import { UsernameDialog } from './components/WalletGate';
import Home from './pages/Home';
import League from './pages/League';
import Game from './pages/Game';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import EarlyList from './pages/EarlyList';
import Collab from './pages/Collab';
import Admin from './pages/Admin';
import ComingSoon from './pages/ComingSoon';
import { GAME_LOCKED } from './lib/flags';

const gated = (el) => (GAME_LOCKED ? <ComingSoon /> : el);

const Layout = () => {
  const loc = useLocation();
  const inGame = loc.pathname.startsWith('/play') && !GAME_LOCKED;
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/early-list" element={<EarlyList />} />
        <Route path="/collabs" element={<Collab />} />
        <Route path="/collab" element={<Navigate to="/collabs" replace />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/league" element={gated(<League />)} />
        <Route path="/play" element={gated(<Game />)} />
        <Route path="/leaderboard" element={gated(<Leaderboard />)} />
        <Route path="/profile" element={gated(<Profile />)} />
      </Routes>
      {!inGame && <Footer />}
      {!GAME_LOCKED && <UsernameDialog />}
    </>
  );
};

function App() {
  return (
    <div className="App">
      <PixelMesh />
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
      <Toaster
        position="bottom-center"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: 'font-mono flex items-center gap-3 border-2 border-[var(--ink)] bg-[var(--paper-2)] px-4 py-3 text-[12px] tracking-wider text-[var(--ink)] shadow-[4px_4px_0_rgba(28,28,34,0.18)]',
            description: 'text-[var(--ink-soft)]',
          },
        }}
      />
    </div>
  );
}

export default App;
