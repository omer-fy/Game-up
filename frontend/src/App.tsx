// src/App.tsx

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import Components and Pages
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashBoard';
import GameDetailPage from './pages/GameDetailPage';
import MyGamesPage from './pages/MyGamesPage';

function App() {
    // State to track if the user is authenticated
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // This effect runs once on component mount to check for a token
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    // Function to handle successful login
    const handleLogin = () => {
        setIsLoggedIn(true);
    };

    // Function to handle logout
    const handleLogout = () => {
        localStorage.removeItem('token'); // This is the "logout" action
        setIsLoggedIn(false);
    };

    return (
        <BrowserRouter>
            <div className="App">
                <Navbar isLoggedIn={isLoggedIn} onLogout={handleLogout} />
                
                <main className="main-content">
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<HomePage isLoggedIn={isLoggedIn} />} />
                        <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/game/:gameId" element={<GameDetailPage />} />

                        {/* Protected Route */}
                        <Route 
                            path="/dashboard" 
                            element={
                                isLoggedIn ? <DashboardPage /> : <Navigate to="/login" />
                            } 
                        />
                        <Route 
                            path="/my-games" 
                            element={
                                isLoggedIn ? <MyGamesPage /> : <Navigate to="/login" />
                            }
                        />

                        {/* Redirect any other path to the homepage */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

// We need to update the Login component to call the onLoginSuccess prop
// This is a small but critical change to lift the state up.
// For now, we'll modify the Login props here.
const UpdatedLogin = (props: { onLoginSuccess: () => void }) => {
    // Re-use the existing Login component but pass the new function down
    // This is not the cleanest way, but it's the quickest for now.
    // Ideally, you'd modify the Login.tsx file directly.
    return <Login {...props} />;
};

export default App;