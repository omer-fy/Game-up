import React from 'react';
import { Link } from 'react-router-dom';

// Define the props the Navbar will accept
interface NavbarProps {
    isLoggedIn: boolean;
    onLogout: () => void; // A function to call when logout is clicked
}

const Navbar: React.FC<NavbarProps> = ({ isLoggedIn, onLogout }) => {
    return (
        <nav className="navbar">
            <div className="navbar-content">
                <Link to="/" className="navbar-brand">Game Up</Link>
                <div className="navbar-links">
                    {isLoggedIn ? (
                        // If user is logged in, show Search, My Games, and Logout
                        <>
                            <Link to="/dashboard">Search</Link>
                            <Link to="/my-games">My Games</Link> {/* NEW LINK */}
                            <button onClick={onLogout} className="logout-button">Logout</button>
                        </>
                    ) : (
                        // If user is not logged in, show Login and Register
                        <>
                            <Link to="/login">Login</Link>
                            <Link to="/register">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;