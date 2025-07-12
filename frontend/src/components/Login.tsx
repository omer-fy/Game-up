// src/components/Login.tsx

import React, { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom'; // Import Link

// 1. Define the props, including the new function
interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate(); // Initialize the navigate function

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/login', {
                identifier: identifier,
                password: password
            });

            localStorage.setItem('token', response.data.token);
            
            // 2. Call the function passed from App.tsx
            onLoginSuccess();
            
            // Navigate to the dashboard on successful login
            navigate('/dashboard');

        } catch (error: any) {
            if (error.response && error.response.data) {
                setMessage(error.response.data.error);
            } else {
                setMessage('Login failed. Please try again.');
            }
        }
    };

    // The rest of your return statement (the form JSX) stays exactly the same...
    return (
        <div>
            {/* The form from before goes here. No changes needed. */}
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Username or Email</label>
                    <input 
                        type="text" 
                        value={identifier} 
                        onChange={(e) => setIdentifier(e.target.value)} 
                        required 
                    />
                </div>
                <div>
                    <label>Password</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                </div>
                <button type="submit">Login</button>
            </form>
            {message && <p>{message}</p>}
            <p>
                Don't have an account? <Link to="/register">Register now</Link>
            </p>
        </div>
    );
};

export default Login;