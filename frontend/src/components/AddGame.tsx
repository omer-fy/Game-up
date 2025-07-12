import React, { useState } from 'react';
import api from '../api'; // Import the API instance

interface AddToListProps {
    igdbGameId: number;
    // Callback to notify parent component of a successful addition
    onGameAdded: (newLibraryGame: { id: number; status: string }) => void;
}

const AddToList: React.FC<AddToListProps> = ({ igdbGameId, onGameAdded }) => {
    const statuses = ["Wishlist", "Playing", "Completed", "Dropped"];
    const [selectedStatus, setSelectedStatus] = useState(statuses[0]);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isDuplicate, setIsDuplicate] = useState(false); // New state for duplicates

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');
        setIsSuccess(false);
        setIsDuplicate(false); // Reset on new submission

        // IMPORTANT: Get the token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            setMessage('You must be logged in to add a game.');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await api.post(
                '/api/library',
                {
                    igdb_game_id: igdbGameId,
                    status: selectedStatus,
                },
                {
                    // This is how you send an authenticated request
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            // Call the callback with the new game data from the server
            onGameAdded(response.data.game);
            setIsSuccess(true); // Set success state to true
            setTimeout(() => setIsSuccess(false), 3000);
        } catch (error: any) {
            // Check for the 409 Conflict status for duplicates
            if (error.response && error.response.status === 409) {
                setIsDuplicate(true);
                setTimeout(() => setIsDuplicate(false), 3000);
            } else {
                setMessage(error.response?.data?.error || 'An error occurred.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="add-to-list-container">
            <form onSubmit={handleSubmit}>
                <select 
                    value={selectedStatus} 
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    disabled={isSubmitting || isSuccess || isDuplicate}
                >
                    {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
                <button 
                    type="submit" 
                    disabled={isSubmitting || isSuccess || isDuplicate}
                    className={
                        isSuccess ? 'success-button' : isDuplicate ? 'duplicate-button' : ''
                    }
                >
                    {isSubmitting
                        ? 'Adding...'
                        : isSuccess
                        ? 'Added to the Library!'
                        : isDuplicate
                        ? '! Already In Library !'
                        : 'Add to Library'}
                </button>
            </form>
            {/* This message will now only show other errors */}
            {message && <p className="add-to-list-message error-message">{message}</p>}
        </div>
    );
};

export default AddToList;