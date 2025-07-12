// src/components/GameCard.tsx

import React from 'react';
import { Link } from 'react-router-dom';

// Define the structure of a game object using a TypeScript interface
export interface Game {
    id: number;
    name: string;
    cover?: {
        url: string;
    };
    first_release_date?: number;
    summary?: string;
}

interface GameCardProps {
    game: Game;
}

const GameCard: React.FC<GameCardProps> = ({ game }) => {
    // A function to get the year from a UNIX timestamp
    const getYear = (timestamp: number | undefined) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).getFullYear();
    };

    return (
        <Link to={`/game/${game.id}`} className="game-card-link">
            <div className="game-card">
                <div className="game-card-image-container">
                    {game.cover ? (
                        <img src={game.cover.url} alt={game.name} />
                    ) : (
                        <div className="no-cover">No Cover</div>
                    )}
                </div>
                <div className="game-card-info">
                    <h3>{game.name}</h3>
                    <p>Release Year: {getYear(game.first_release_date)}</p>
                </div>
            </div>
        </Link>
    );
};

export default GameCard;