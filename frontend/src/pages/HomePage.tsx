import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface HomePageProps {
    isLoggedIn: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ isLoggedIn }) => {
    const [username, setUsername] = useState('');

    useEffect(() => {
        if (isLoggedIn) {
            const fetchUsername = async () => {
                const token = localStorage.getItem('token');
                if (token) {
                    try {
                        const response = await axios.get('http://localhost:5000/api/me', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        setUsername(response.data.username);
                    } catch (error) {
                        console.error("Failed to fetch username", error);
                    }
                }
            };
            fetchUsername();
        }
    }, [isLoggedIn]);

    return (
        <div className="homepage-container">
            {isLoggedIn ? (
                <>
                    <h1>Welcome back, {username}!</h1>
                    <p>Ready to manage your game library?</p>
                    <div className="homepage-links">
                        <Link to="/dashboard" className="homepage-button">Search for Games</Link>
                        <Link to="/my-games" className="homepage-button">View My Games</Link>
                    </div>
                </>
            ) : (
                <>
                    <h1>Welcome to Game Up</h1>
                    <p>Your AI-Powered Game Backlog Tracker.</p>
                    <p>Please <Link to="/login">log in</Link> or <Link to="/register">register</Link> to get started.</p>
                </>
            )}
        </div>
    );
};

export default HomePage;