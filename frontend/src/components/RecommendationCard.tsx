// src/components/RecommendationCard.tsx

import React from 'react';
import { Game } from './Gamecard'; // Reuse the Game interface
import { Link } from 'react-router-dom';

export interface Recommendation {
    reason: string;
    details: Game;
}

interface RecommendationCardProps {
    recommendation: Recommendation;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
    return (
        <div className="recommendation-card">
            <Link to={`/game/${recommendation.details.id}`} className="game-card-link">
                <div className="game-card">
                    <div className="game-card-image-container">
                        {recommendation.details.cover ? (
                            <img src={recommendation.details.cover.url} alt={recommendation.details.name} />
                        ) : (
                            <div className="no-cover">No Cover</div>
                        )}
                    </div>
                    <div className="game-card-info">
                        <h3>{recommendation.details.name}</h3>
                    </div>
                </div>
            </Link>
            <div className="recommendation-reason">
                <p><strong>Why you might like it:</strong> {recommendation.reason}</p>
            </div>
        </div>
    );
};

export default RecommendationCard;