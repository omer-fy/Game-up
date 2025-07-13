// src/pages/ProfilePage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import RecommendationCard, { Recommendation } from '../components/RecommendationCard';

interface ProfileData {
    username: string;
    email: string;
    completed_games_count: number; // New field for completed games count
}

interface ProfilePageProps {
    onLogout: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onLogout }) => {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // State for AI recommendations
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        // --- THIS IS THE NEW LOGIC TO LOAD SAVED RECOMMENDATIONS ---
        const savedRecs = sessionStorage.getItem('aiRecommendations');
        if (savedRecs) {
            setRecommendations(JSON.parse(savedRecs));
        }

        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const response = await api.get('/api/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setProfile(response.data);
            } catch (err) {
                setError('Failed to fetch profile data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleLogoutClick = () => {
        onLogout(); // Call the function passed down from App.tsx
        navigate('/'); // Redirect to homepage
    };

    const handleAiButtonClick = async () => {
        // Check if the user has completed at least one game
        if (profile && profile.completed_games_count < 1) {
            setAiError("You must complete at least one game to get recommendations.");
            return;
        }
        setIsAiLoading(true);
        setAiError(null);
        setRecommendations([]);

        const token = localStorage.getItem('token');
        if (!token) {
            setAiError("You must be logged in.");
            setIsAiLoading(false);
            return;
        }

        try {
            const response = await api.get('/api/recommendations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setRecommendations(response.data);

            sessionStorage.setItem('aiRecommendations', JSON.stringify(response.data)); // Save to session storage
        } catch (err: any) {
            setAiError(err.response?.data?.error || "An error occurred while getting recommendations.");
        } finally {
            setIsAiLoading(false);
        }
    };

    if (isLoading) return <p>Loading profile...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="profile-page">
            <h1><strong>{profile?.username}</strong>'s Profile</h1>
            <div className="profile-info">
                <p><strong>Completed Games:</strong> {profile?.completed_games_count}</p>
            </div>

            <div className="profile-actions">
                <button className="ai-button" onClick={handleAiButtonClick} disabled={isAiLoading}>
                    {isAiLoading ? 'Loading Recommendations...' : 'Let AI Decide Your Next Game!'}
                </button>
                {profile && profile.completed_games_count === 0 && (
                    <p className="info-message">Complete some games to unlock AI recommendations!</p>
                )}
            </div>
            <div className="recommendations-section">
                {aiError && <p className="error-message">{aiError}</p>}
                {recommendations.length > 0 && (
                    <>
                        <h2>Here are some games you might like:</h2>
                        <div className="search-results">
                            {recommendations.map(rec => (
                                <RecommendationCard key={rec.details.id} recommendation={rec} />
                            ))}
                        </div>
                    </>
                )}
            </div>
            <div className="logout-section">                       
                <button className="logout-button-profile" onClick={handleLogoutClick}>
                    Logout
                </button>
            </div>
        </div>
    );
};

export default ProfilePage;