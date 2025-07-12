import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { Game } from '../components/Gamecard';
import AddToList from '../components/AddGame';
import EditGameModal from '../components/EditGameModal'; // Import the modal

// Define a more detailed structure for the game detail page
interface GameDetails extends Game {
    summary?: string;
    genres?: { id: number; name: string }[];
    platforms?: { id: number; name: string }[];
    developers?: string[];
    publishers?: string[];
}

// NEW: Interface for the library status of the game
interface LibraryStatus {
    inLibrary: boolean;
    id?: number; // The UserGame ID from our database
    status?: string;
}

const GameDetailPage = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const [game, setGame] = useState<GameDetails | null>(null);
    const [libraryStatus, setLibraryStatus] = useState<LibraryStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for the modal
    const [isModalOpen, setIsModalOpen] = useState(false);

    // This effect runs when the component loads or the gameId changes
    useEffect(() => {
        const fetchAllGameData = async () => {
            if (!gameId) return;

            setIsLoading(true);
            setError(null);
            const token = localStorage.getItem('token');

            try {
                // Fetch main game details (public)
                const gameDetailsPromise = api.get(`/api/game/${gameId}`);

                // Fetch library status (authenticated)
                const libraryStatusPromise = token ? api.get(`/api/library/status/${gameId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }) : Promise.resolve(null);

                // Wait for both requests to complete
                const [gameDetailsResponse, libraryStatusResponse] = await Promise.all([
                    gameDetailsPromise,
                    libraryStatusPromise
                ]);

                setGame(gameDetailsResponse.data);
                if (libraryStatusResponse) {
                    setLibraryStatus(libraryStatusResponse.data);
                }

            } catch (err: any) {
                setError(err.response?.data?.error || 'Failed to fetch game details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllGameData();
    }, [gameId]);

    // Callback for when a game is added via the AddToList component
    const handleGameAdded = (newLibraryGame: { id: number; status: string }) => {
        setLibraryStatus({
            inLibrary: true,
            id: newLibraryGame.id,
            status: newLibraryGame.status
        });
    };

    // --- Edit and Remove Handlers (similar to MyGamesPage) ---

    const handleRemove = async () => {
        if (!libraryStatus?.id || !window.confirm("Are you sure you want to remove this game?")) return;

        const token = localStorage.getItem('token');
        try {
            await api.delete(`/api/library/${libraryStatus.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Update state to show the game is no longer in the library
            setLibraryStatus({ inLibrary: false });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to remove game.');
        }
    };

    const handleSaveStatus = async (newStatus: string) => {
        if (!libraryStatus?.id) return;

        const token = localStorage.getItem('token');
        try {
            await api.put(
                `/api/library/${libraryStatus.id}`,
                { status: newStatus },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            // Update local state with the new status
            setLibraryStatus(prev => prev ? { ...prev, status: newStatus } : null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update status.');
        } finally {
            setIsModalOpen(false);
        }
    };

    const getYear = (timestamp: number | undefined) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).getFullYear();
    };

    // Helper to format a list of items (genres, platforms)
    const renderList = (items: { name: string }[] | undefined) => {
        if (!items || items.length === 0) return 'N/A';
        return items.map(item => item.name).join(', ');
    };

    if (isLoading) return <p>Loading game details...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!game) return <p>Game not found.</p>;

    return (
        <div className="game-detail-page">
            <div className="game-detail-header">
                <img src={game.cover?.url} alt={game.name} className="game-detail-cover" />
                <div className="game-detail-title-section">
                    <h1>{game.name}</h1>
                    <p><strong>Release Year:</strong> {getYear(game.first_release_date)}</p>
                    <p><strong>Genres:</strong> {renderList(game.genres)}</p>
                    <p><strong>Developer(s):</strong> {game.developers?.join(', ') || 'N/A'}</p>
                    <p><strong>Publisher(s):</strong> {game.publishers?.join(', ') || 'N/A'}</p>
                    <p><strong>Platforms:</strong> {renderList(game.platforms)}</p>

                    <div className="game-actions-container">
                        {libraryStatus?.inLibrary ? (
                            <div className="library-controls">
                                <p><strong>Status:</strong> {libraryStatus.status}</p>
                                <button onClick={() => setIsModalOpen(true)}>Edit</button>
                                <button onClick={handleRemove} className="remove-button">Remove</button>
                            </div>
                        ) : (
                            <AddToList igdbGameId={game.id} onGameAdded={handleGameAdded} />
                        )}
                    </div>
                </div>
            </div>
            <div className="game-detail-summary">
                <h2>Summary</h2>
                <p>{game.summary || 'No summary available.'}</p>
            </div>

            {libraryStatus?.inLibrary && (
                <EditGameModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveStatus}
                    initialStatus={libraryStatus.status || ''}
                    gameTitle={game.name}
                />
            )}
        </div>
    );
};

export default GameDetailPage;