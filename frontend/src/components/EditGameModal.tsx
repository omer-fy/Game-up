import React, { useState, useEffect } from 'react';

interface EditGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newStatus: string) => void;
    initialStatus: string;
    gameTitle: string;
}

const statuses = ["Wishlist", "Playing", "Completed", "Dropped"];

const EditGameModal: React.FC<EditGameModalProps> = ({ isOpen, onClose, onSave, initialStatus, gameTitle }) => {
    const [selectedStatus, setSelectedStatus] = useState(initialStatus);

    useEffect(() => {
        setSelectedStatus(initialStatus);
    }, [initialStatus]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(selectedStatus);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Edit Status for {gameTitle}</h2>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                    {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
                <div className="modal-actions">
                    <button onClick={handleSave}>Save</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default EditGameModal;