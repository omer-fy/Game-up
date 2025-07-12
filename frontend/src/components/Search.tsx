// src/components/Search.tsx

import React, { useState, useEffect } from 'react';

interface SearchProps {
    onSearch: (searchText: string) => void;
    isLoading: boolean;
}

const Search: React.FC<SearchProps> = ({ onSearch, isLoading }) => {
    const [searchText, setSearchText] = useState('');

    // This effect will trigger the search automatically
    useEffect(() => {
        // Set up a timer
        const timerId = setTimeout(() => {
            // Only call onSearch if searchText is not empty
            if (searchText) {
                onSearch(searchText);
            }
        }, 500); // Wait for 500ms after the user stops typing

        // This is the cleanup function.
        // It runs when the component unmounts or before the effect runs again.
        // This clears the previous timer, so we don't make unnecessary API calls.
        return () => {
            clearTimeout(timerId);
        };
    }, [searchText, onSearch]); // Re-run the effect when searchText or onSearch changes

    return (
        <div className="search-form">
            <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search for a game..."
                // The search is automatic, but we can still show a loading state
                style={{
                    backgroundImage: isLoading ? 'url(/loading-spinner.gif)' : 'none',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    backgroundSize: '60px 60px'
                }}
            />
        </div>
    );
};

export default Search;