// src/pages/DashboardPage.tsx

import React, { useState, useCallback } from 'react'; // Import useCallback
import api from '../api';
import Search from '../components/Search';
import GameCard, { Game } from '../components/Gamecard';

const DashboardPage = () => {
    // State to hold the list of games from the search
    const [searchResults, setSearchResults] = useState<Game[]>([]);
    // State to manage loading status
    const [isLoading, setIsLoading] = useState(false);
    // State to hold any error messages
    const [error, setError] = useState<string | null>(null);

    // This function is now memoized with useCallback
    const handleSearch = useCallback(async (searchText: string) => {
        // This check is now more important because the effect runs on every change
        if (!searchText.trim()) {
            setSearchResults([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        // We don't clear search results here to provide a smoother experience
        // while the new results are loading.

        try {
            const response = await api.post('/api/search', {
                searchText: searchText
            });
            setSearchResults(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'An error occurred during search.');
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array means the function is created only once

    return (
        <div className="dashboard">
            <h1>Find your next game!</h1>
            <p>Search for a game to add to your library.</p>
            
            <Search onSearch={handleSearch} isLoading={isLoading} />

            {error && <p className="error-message">{error}</p>}

            {isLoading && searchResults.length === 0 && <p>Searching...</p>}

            <div className="search-results">
                {searchResults.map(game => (
                    <GameCard key={game.id} game={game} />
                ))}
            </div>
        </div>
    );
};

export default DashboardPage;