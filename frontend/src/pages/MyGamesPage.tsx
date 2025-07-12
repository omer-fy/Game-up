import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Import Link
import GameCard, { Game } from '../components/Gamecard';
import EditGameModal from '../components/EditGameModal';

interface LibraryGame {
    id: number;
    igdb_game_id: number;
    status: string;
    details: Game;
}

const MyGamesPage = () => {
    const [games, setGames] = useState<LibraryGame[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    
    // State for the new filter tabs
    const [activeStatus, setActiveStatus] = useState('Playing');
    const statuses = ["Playing", "Completed", "Wishlist", "Dropped"];

    // State for the modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGame, setEditingGame] = useState<LibraryGame | null>(null);

    const fetchLibraryData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError("You must be logged in to view your library.");
            setIsLoading(false);
            return;
        }

        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            // Fetch both library and user info concurrently
            const [libraryResponse, userResponse] = await Promise.all([
                axios.get('http://localhost:5000/api/library', { headers }),
                axios.get('http://localhost:5000/api/me', { headers })
            ]);
            
            setGames(libraryResponse.data);
            setUsername(userResponse.data.username);

        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch your data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLibraryData();
    }, []);

    const handleRemove = async (userGameId: number) => {
        if (!window.confirm("Are you sure you want to remove this game from your library?")) return;

        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:5000/api/library/${userGameId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Refetch data to show the change
            fetchLibraryData(); 
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to remove game.');
        }
    };

    const handleOpenEditModal = (game: LibraryGame) => {
        setEditingGame(game);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingGame(null);
    };

    const handleSaveStatus = async (newStatus: string) => {
        if (!editingGame) return;

        const token = localStorage.getItem('token');
        try {
            await axios.put(
                `http://localhost:5000/api/library/${editingGame.id}`,
                { status: newStatus },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            // Refetch data to reflect the change
            fetchLibraryData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update status.');
        } finally {
            handleCloseModal();
        }
    };

    if (isLoading) return <p>Loading your library...</p>;
    if (error) return <p className="error-message">{error}</p>;

    // Filter games based on the active tab
    const filteredGames = games.filter(game => game.status === activeStatus);

    return (
        <div className="my-games-page">
            <h1 className="page-title">Welcome, {username}!</h1>
            
            <div className="status-filters">
                {statuses.map(status => (
                    <button 
                        key={status}
                        className={`status-filter-button ${activeStatus === status ? 'active' : ''}`}
                        onClick={() => setActiveStatus(status)}
                    >
                        {status}
                    </button>
                ))}
            </div>

            <div className="search-results">
                {filteredGames.length > 0 ? (
                    filteredGames.map(libGame => (
                        <div key={libGame.id} className="library-game-item">
                            <GameCard game={libGame.details} />
                            <div className="library-game-actions">
                                <button onClick={() => handleOpenEditModal(libGame)}>Edit</button>
                                <button onClick={() => handleRemove(libGame.id)} className="remove-button">Remove</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-list-message">
                        <p>You have no games in your '{activeStatus}' list.</p>
                        <p>
                            You can <Link to="/dashboard">search for games</Link> to add to your library.
                        </p>
                    </div>
                )}
            </div>

            {editingGame && (
                <EditGameModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveStatus}
                    initialStatus={editingGame.status}
                    gameTitle={editingGame.details.name}
                />
            )}
        </div>
    );
};

export default MyGamesPage;